// ---------------------------------------------------------------------------
// PDF <-> portal data-parity gate.
//
// The branded Diagnostic Report PDF (artifacts/api-server/src/lib/pdf) and the
// public tenant portal (lib/portfolio-engine + the /portfolio pages) must show
// the SAME numbers for the same company. This script proves that for every
// portal-visible company by running BOTH real pipelines and diffing them:
//
//   PDF side    -> getReportData(companyId)  (the exact cache-only payload the
//                  PDF route feeds into buildReportPdfHtml). The PDF renders
//                  meta.rubric verbatim: the 4 rubric-v2 pillar bands, the
//                  0-8 portcoComposite, and its Low/Medium/High portcoBand.
//   Portal side -> the same resolution the portal's rubric.ts performs on the
//                  bootstrap payload: latest assessment's STORED rubric when
//                  present, else computeRubricV2(pillarScores); composite and
//                  band recomputed via the shared engine functions.
//
// HARD failures (exit 1): companyName, all 4 rubric pillar bands, the 0-8
// portcoComposite, portcoBand (and its consistency with the stored/derived
// portcoScore), all 8 underlying pillar scores (frozen cache vs live engine),
// assessmentDate<->lastDiagnostic. These are the values printed on the PDF
// and must never drift from the portal. The legacy composite/16 + engagement
// tier checks were retired with the CQ-20 rubric-v2 hard gate (2026-07-21):
// the PDF no longer renders those values anywhere.
//
// INFORMATIONAL (never fails): gap-title differences. The PDF's gap selection
// (3 lowest-rated rubric pillars by band points) and the portal's
// (score<2 non-null v1 pillars ranked by (2-score)*weight) are intentionally
// different algorithms. Reported for visibility only.
//
// Performs ZERO writes. Run with:
//   pnpm --filter @workspace/api-server run verify-pdf-parity
// ---------------------------------------------------------------------------
import { db, pool, companiesTable } from "@workspace/db";
import {
  PILLARS,
  RUBRIC_PILLARS,
  buildCompany,
  gapTitle,
  computeRubricV2,
  computePortcoComposite,
  portcoBandFromComposite,
  type RawCompany,
  type RubricValue,
} from "@workspace/portfolio-engine";
import { parseRawScore } from "../src/lib/pdf/scoreParsing.js";
import { getReportData } from "../src/lib/reportExport.js";
import { getPortfolioBootstrap } from "../src/lib/portfolioData.js";

interface Mismatch {
  field: string;
  pdf: string;
  portal: string;
}

async function main(): Promise<number> {
  const bootstrap = await getPortfolioBootstrap();
  if (!bootstrap.ok) {
    console.error(`\u2717 Portfolio bootstrap failed to load:\n${JSON.stringify(bootstrap, null, 2)}`);
    return 1;
  }

  // RawCompany.id is the company SLUG (see portfolioData.ts), but getReportData
  // is keyed by the numeric companies.id. Build the slug -> id lookup once.
  const dbCompanies = await db
    .select({ id: companiesTable.id, slug: companiesTable.slug })
    .from(companiesTable);
  const slugToId = new Map<string, number>();
  for (const c of dbCompanies) {
    if (c.slug) slugToId.set(c.slug, c.id);
  }

  let audited = 0;
  let hardFailures = 0;
  const gapNotes: string[] = [];

  for (const firm of bootstrap.data.firms) {
    for (const raw of firm.companies as RawCompany[]) {
      const slug = raw.id;
      const dbId = slugToId.get(slug);
      if (dbId === undefined) {
        console.error(`\u2717 [${firm.slug}/${slug}] no companies.id resolves for this slug`);
        hardFailures++;
        continue;
      }

      const company = buildCompany(raw);

      // Portal-side rubric resolution — mirrors the portal's resolveRubric():
      // prefer the assessment's STORED rubric (shipped via bootstrap), else
      // derive live through the single shared computeRubricV2() mapping.
      const latest = raw.assessments[raw.assessments.length - 1];
      const portalRubric = latest.rubric ?? computeRubricV2(latest.pillarScores);
      const portalPillarValues: RubricValue[] = [
        portalRubric.orgDesignScore,
        portalRubric.onboardingScore,
        portalRubric.healthScoringScore,
        portalRubric.renewalExpansionScore,
      ];
      const portalComposite = computePortcoComposite(portalPillarValues);
      const portalBand = portcoBandFromComposite(portalComposite);

      let pdf: Awaited<ReturnType<typeof getReportData>>;
      try {
        pdf = await getReportData(dbId);
      } catch (err) {
        console.error(`\u2717 [${firm.slug}/${slug}] getReportData(${dbId}) threw: ${(err as Error).message}`);
        hardFailures++;
        continue;
      }

      audited++;
      const mismatches: Mismatch[] = [];
      const pdfRubric = pdf.meta.rubric;

      if (pdf.reportData.companyName !== company.name) {
        mismatches.push({ field: "companyName", pdf: pdf.reportData.companyName, portal: company.name });
      }

      for (const pillar of RUBRIC_PILLARS) {
        if (pdfRubric[pillar.key] !== portalRubric[pillar.key]) {
          mismatches.push({
            field: `rubric.${pillar.key}`,
            pdf: String(pdfRubric[pillar.key]),
            portal: String(portalRubric[pillar.key]),
          });
        }
      }
      if (pdfRubric.portcoComposite !== portalComposite) {
        mismatches.push({
          field: "rubric.portcoComposite",
          pdf: String(pdfRubric.portcoComposite),
          portal: String(portalComposite),
        });
      }
      if (pdfRubric.portcoBand !== portalBand) {
        mismatches.push({ field: "rubric.portcoBand", pdf: pdfRubric.portcoBand, portal: portalBand });
      }
      // Internal consistency: a stored portcoScore band (when present) must
      // agree with the band recomputed from the stored pillar values.
      if (latest.rubric && latest.rubric.portcoScore !== portalBand) {
        mismatches.push({
          field: "storedRubric.portcoScore (internal consistency)",
          pdf: latest.rubric.portcoScore,
          portal: portalBand,
        });
      }

      if (pdf.meta.assessmentDate !== company.lastDiagnostic) {
        mismatches.push({ field: "assessmentDate", pdf: pdf.meta.assessmentDate, portal: company.lastDiagnostic });
      }

      for (let i = 0; i < PILLARS.length; i++) {
        const pdfRaw = parseRawScore(pdf.reportData.scores[`p${i + 1}` as keyof typeof pdf.reportData.scores]);
        const pdfNorm = pdfRaw === "NA" ? null : pdfRaw;
        const portalScore = company.scores[PILLARS[i].id] ?? null;
        if (pdfNorm !== portalScore) {
          mismatches.push({
            field: `score.${PILLARS[i].id} (p${i + 1})`,
            pdf: String(pdfNorm),
            portal: String(portalScore),
          });
        }
      }

      // Informational: compare the PDF's gap titles against the portal's
      // top-N (same count) by its own ranking. Divergence is expected.
      const pdfGapTitles = pdf.reportData.gaps.map((g) => g.title);
      const portalGapTitles = company.gaps.slice(0, pdfGapTitles.length).map((g) => gapTitle(company, g));
      if (JSON.stringify(pdfGapTitles) !== JSON.stringify(portalGapTitles)) {
        gapNotes.push(
          `  [${firm.slug}/${slug}] PDF [${pdfGapTitles.join(", ")}] vs portal top-${pdfGapTitles.length} [${portalGapTitles.join(", ")}]`,
        );
      }

      if (mismatches.length > 0) {
        hardFailures++;
        console.error(`\u2717 [${firm.slug}/${slug}] ${mismatches.length} PARITY MISMATCH(es):`);
        for (const m of mismatches) {
          console.error(`    - ${m.field}: PDF="${m.pdf}" portal="${m.portal}"`);
        }
      } else {
        console.log(
          `\u2713 [${firm.slug}/${slug}] parity OK (${pdfRubric.portcoComposite}/8, ${pdfRubric.portcoBand} band)`,
        );
      }
    }
  }

  console.log(`\n${"\u2500".repeat(64)}`);
  console.log(`Audited ${audited} portal-visible company(ies).`);
  if (gapNotes.length > 0) {
    console.log(
      `\nNOTE - gap-title differences (informational, intentional algorithm divergence, NOT a failure):`,
    );
    console.log(gapNotes.join("\n"));
  }
  if (hardFailures > 0) {
    console.error(`\n\u2717 FAIL: ${hardFailures} company(ies) have PDF/portal value mismatches.`);
    return 1;
  }
  console.log(`\n\u2713 PASS: every PDF value matches the portal engine for all ${audited} companies.`);
  return 0;
}

main()
  .then(async (code) => {
    await pool.end();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error("verify-pdf-portal-parity crashed:", err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
