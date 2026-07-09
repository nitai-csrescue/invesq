// ---------------------------------------------------------------------------
// Standalone, read-only parity check: recomputes each tenant's
// companyCount / tierCounts / avgComposite two independent ways —
//   (a) "file"  — straight from the static TS tenant files, via the shared
//                 portfolio-engine (buildFirmPortfolio), same code path the
//                 one-time migration script used before any DB rows existed.
//   (b) "db"    — straight from whatever is currently in Postgres
//                 (firms/companies/assessments), the same tables the live
//                 app now hydrates from via /api/portfolio/bootstrap.
//
// Unlike migrate-portfolio-to-db.ts, this script performs ZERO writes and
// has no empty-table guard, so it can be re-run at any time post-cutover to
// confirm the DB has not drifted from the original file-based data.
//
// Run with:
//   pnpm --filter @workspace/cs-rescue exec tsx scripts/verify-portfolio-parity.ts
// ---------------------------------------------------------------------------
import { eq, inArray } from "drizzle-orm";
import { db, pool, firmsTable, companiesTable, assessmentsTable } from "@workspace/db";
import { buildFirmPortfolio } from "@workspace/portfolio-engine";

import { FIRMS } from "../src/data/portfolio/firms";
import { PILLARS, TIERS } from "../src/data/portfolio/pillars";
import type { RawCompany, PillarScore, TierCount } from "../src/data/portfolio/types";

import STG_COMPANIES from "../src/data/portfolio/stg";
import PAMLICO_COMPANIES from "../src/data/portfolio/pamlico";
import RAVIGA_COMPANIES from "../src/data/portfolio/raviga";
import LONGARC_COMPANIES from "../src/data/portfolio/longarc";
import SOLEN_COMPANIES from "../src/data/portfolio/solen";

const RAW_COMPANIES_BY_FIRM: Readonly<Record<string, RawCompany[]>> = {
  stg: STG_COMPANIES,
  pamlico: PAMLICO_COMPANIES,
  raviga: RAVIGA_COMPANIES,
  longarc: LONGARC_COMPANIES,
  solen: SOLEN_COMPANIES,
};

const PILLAR_IDS = PILLARS.map((p) => p.id);
if (PILLAR_IDS.length !== 8) {
  throw new Error(`Expected exactly 8 pillars to map onto p1..p8, found ${PILLAR_IDS.length}`);
}

function textToScore(text: string | null): PillarScore {
  if (text === null || text === "NA") return null;
  const n = Number(text);
  if (n !== 0 && n !== 1 && n !== 2) {
    throw new Error(`Unexpected stored assessment score "${text}"`);
  }
  return n as PillarScore;
}

function computeTierComposite(scores: PillarScore[]): number {
  return scores.reduce((sum: number, s) => sum + (s === null ? 1 : s), 0);
}

function getTierId(tierComposite: number): number {
  const tier = TIERS.find((t) => tierComposite >= t.range[0] && tierComposite <= t.range[1]);
  return (tier ?? TIERS[0]).id;
}

interface Summary {
  companyCount: number;
  tierCounts: Map<number, number>;
  avgComposite: number;
}

function tierCountsToMap(tierCounts: TierCount[]): Map<number, number> {
  return new Map(tierCounts.map((tc) => [tc.tier.id, tc.count]));
}

function formatTierCounts(map: Map<number, number>): string {
  return [1, 2, 3, 4].map((id) => `T${id}=${map.get(id) ?? 0}`).join(", ");
}

async function computeDbSummary(firmSlug: string): Promise<Summary> {
  const tierCounts = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ]);

  const [firmRow] = await db.select().from(firmsTable).where(eq(firmsTable.slug, firmSlug));
  if (!firmRow) {
    return { companyCount: 0, tierCounts, avgComposite: 0 };
  }

  const companyRows = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.firmId, firmRow.id));
  const companyIds = companyRows.map((c) => c.id);

  if (companyIds.length === 0) {
    return { companyCount: 0, tierCounts, avgComposite: 0 };
  }

  const assessmentRows = await db
    .select()
    .from(assessmentsTable)
    .where(inArray(assessmentsTable.companyId, companyIds));

  const latestByCompany = new Map<number, (typeof assessmentRows)[number]>();
  for (const row of assessmentRows) {
    const existing = latestByCompany.get(row.companyId);
    if (!existing || row.date > existing.date) {
      latestByCompany.set(row.companyId, row);
    }
  }

  let compositeSum = 0;
  let scoredCompanyCount = 0;

  for (const row of latestByCompany.values()) {
    const scores: PillarScore[] = [
      textToScore(row.p1),
      textToScore(row.p2),
      textToScore(row.p3),
      textToScore(row.p4),
      textToScore(row.p5),
      textToScore(row.p6),
      textToScore(row.p7),
      textToScore(row.p8),
    ];
    const scoredCount = scores.filter((s) => s !== null).length;
    const composite = scores.reduce((sum: number, s) => sum + (s ?? 0), 0);
    const displayMax = scoredCount * 2;
    const tierId = getTierId(computeTierComposite(scores));
    tierCounts.set(tierId, (tierCounts.get(tierId) ?? 0) + 1);

    if (displayMax > 0) {
      compositeSum += (composite / displayMax) * 16; // PILLAR_MAX = 16
      scoredCompanyCount++;
    }
  }

  const avgComposite =
    scoredCompanyCount > 0 ? Math.round((compositeSum / scoredCompanyCount) * 10) / 10 : 0;

  return { companyCount: companyIds.length, tierCounts, avgComposite };
}

async function main() {
  console.log("=== Portfolio parity check: file-based vs DB-based, per tenant ===\n");

  let anyMismatch = false;
  let totalCompaniesFile = 0;
  let totalCompaniesDb = 0;

  for (const firm of FIRMS) {
    const rawList = RAW_COMPANIES_BY_FIRM[firm.slug] ?? [];
    const fileSummary = buildFirmPortfolio(firm.slug, rawList).summary;
    const fileTierMap = tierCountsToMap(fileSummary.tierCounts);
    const dbSummary = await computeDbSummary(firm.slug);

    totalCompaniesFile += fileSummary.companyCount;
    totalCompaniesDb += dbSummary.companyCount;

    console.log(`[${firm.slug}] ${firm.displayName}`);
    console.log(`  companyCount   file=${fileSummary.companyCount}  db=${dbSummary.companyCount}`);
    console.log(`  avgComposite   file=${fileSummary.avgComposite}  db=${dbSummary.avgComposite}`);
    console.log(
      `  tierCounts     file=[${formatTierCounts(fileTierMap)}]  db=[${formatTierCounts(dbSummary.tierCounts)}]`,
    );

    const mismatches: string[] = [];
    if (fileSummary.companyCount !== dbSummary.companyCount) {
      mismatches.push(
        `companyCount mismatch: file=${fileSummary.companyCount} db=${dbSummary.companyCount}`,
      );
    }
    if (fileSummary.avgComposite !== dbSummary.avgComposite) {
      mismatches.push(
        `avgComposite mismatch: file=${fileSummary.avgComposite} db=${dbSummary.avgComposite}`,
      );
    }
    for (const tierId of [1, 2, 3, 4]) {
      const f = fileTierMap.get(tierId) ?? 0;
      const d = dbSummary.tierCounts.get(tierId) ?? 0;
      if (f !== d) {
        mismatches.push(`tier ${tierId} count mismatch: file=${f} db=${d}`);
      }
    }

    if (mismatches.length > 0) {
      anyMismatch = true;
      console.log(`  >>> MISMATCH DETECTED for "${firm.slug}":`);
      for (const m of mismatches) console.log(`      - ${m}`);
    } else {
      console.log(`  OK — exact match.`);
    }
    console.log("");
  }

  console.log(`Total companies — file=${totalCompaniesFile}  db=${totalCompaniesDb}`);
  console.log("\n=== Final result ===");
  if (anyMismatch) {
    console.log("MISMATCHES FOUND — see flagged tenant(s) above. Not silently reconciled.");
    process.exitCode = 1;
  } else {
    console.log("All 5 tenants match exactly between file-based and DB-based rollups.");
  }
}

main()
  .catch((err) => {
    console.error("Parity check failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
