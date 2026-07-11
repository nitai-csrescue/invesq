// ---------------------------------------------------------------------------
// PDF <-> portal data-parity gate.
//
// The branded Diagnostic Report PDF (artifacts/api-server/src/lib/pdf) and the
// public tenant portal (lib/portfolio-engine + the /portfolio pages) must show
// the SAME numbers for the same company. This script proves that for every
// portal-visible company by running BOTH real pipelines and diffing them:
//
//   PDF side    -> getReportData(companyId)  (the exact cache-only payload the
//                  PDF route feeds into buildReportPdfHtml), plus the tier the
//                  PDF actually renders: getTier(computeTierComposite(scores)).
//   Portal side -> buildCompany(RawCompany) for each company returned by
//                  getPortfolioBootstrap() (the exact payload the SPA hydrates).
//
// HARD failures (exit 1): companyName, composite, compositeMax<->displayMax,
// tier.id, tier.label, all 8 pillar scores (frozen cache vs live engine),
// assessmentDate<->lastDiagnostic. These are the values printed on the PDF and
// must never drift from the portal.
//
// INFORMATIONAL (never fails): gap-title differences. The PDF's gap selection
// (3 lowest pillars, Insufficient-Data counted as 1) and the portal's
// (score<2 non-null pillars ranked by (2-score)*weight) are intentionally
// different algorithms. Reconciling them would require regenerating every
// cached report_exports row (a RUBRIC_VERSION bump), which is out of scope for
// a data-parity gate. Reported for visibility only.
//
// Performs ZERO writes. Run with:
//   pnpm --filter @workspace/api-server run verify-pdf-parity
// ---------------------------------------------------------------------------
import { db, pool, companiesTable } from "@workspace/db";
import {
  PILLARS,
  getTier,
  buildCompany,
  gapTitle,
  type RawCompany,
} from "@workspace/portfolio-engine";
import { parseRawScore } from "../src/lib/pdf/scoreParsing.js";
import { getReportData } from "../src/lib/reportExport.js";
import { getPortfolioBootstrap } from "../src/lib/portfolioData.js";

interface Mismatch {
  field: string;
  pdf: string;
  portal: string;
}

// Mirrors computeTierComposite in reportHtml.ts exactly: sum all 8 pillars,
// substituting 1 for every Insufficient-Data pillar. This is the composite the
// PDF feeds into getTier() to pick the engagement tier it prints.
function pdfTierComposite(scores: Record<string, number | string>): number {
  return PILLARS.reduce((sum, _pillar, index) => {
    const score = parseRawScore(scores[`p${index + 1}`]);
    return sum + (score === "NA" ? 1 : score);
  }, 0);
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

      if (pdf.reportData.companyName !== company.name) {
        mismatches.push({ field: "companyName", pdf: pdf.reportData.companyName, portal: company.name });
      }
      if (pdf.meta.composite !== company.composite) {
        mismatches.push({ field: "composite", pdf: String(pdf.meta.composite), portal: String(company.composite) });
      }
      if (pdf.meta.compositeMax !== company.displayMax) {
        mismatches.push({ field: "compositeMax", pdf: String(pdf.meta.compositeMax), portal: String(company.displayMax) });
      }

      const pdfTier = getTier(pdfTierComposite(pdf.reportData.scores));
      if (pdfTier.id !== company.tier.id) {
        mismatches.push({ field: "tier.id", pdf: String(pdfTier.id), portal: String(company.tier.id) });
      }
      if (pdfTier.label !== company.tier.label) {
        mismatches.push({ field: "tier.label", pdf: pdfTier.label, portal: company.tier.label });
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
          `\u2713 [${firm.slug}/${slug}] parity OK (${pdf.meta.composite}/${pdf.meta.compositeMax}, Tier ${pdfTier.id} ${pdfTier.label})`,
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
