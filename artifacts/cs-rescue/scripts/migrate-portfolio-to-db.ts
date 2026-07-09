// ---------------------------------------------------------------------------
// One-time migration: hardcoded tenant portfolio data (src/data/portfolio/*)
// -> Postgres (firms / companies / assessments tables).
//
// This script is READ-ONLY with respect to the TypeScript data files — it
// never writes to them. It is purely additive to the database.
//
// Run with:
//   pnpm --filter @workspace/cs-rescue run migrate-portfolio
//
// Safety: refuses to run if the `firms` table is not empty, so it cannot be
// accidentally run twice and duplicate rows.
// ---------------------------------------------------------------------------
import { sql, inArray } from "drizzle-orm";
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

// PILLARS order defines the p1..p8 column mapping. Verified against
// lib/db/src/schema/assessments.ts (8 generic text columns, p1..p8).
const PILLAR_IDS = PILLARS.map((p) => p.id);
if (PILLAR_IDS.length !== 8) {
  throw new Error(
    `Expected exactly 8 pillars to map onto p1..p8, found ${PILLAR_IDS.length}`,
  );
}

function scoreToText(score: PillarScore): string {
  return score === null || score === undefined ? "NA" : String(score);
}

function textToScore(text: string | null): PillarScore {
  if (text === null || text === "NA") return null;
  const n = Number(text);
  if (n !== 0 && n !== 1 && n !== 2) {
    throw new Error(`Unexpected stored assessment score "${text}"`);
  }
  return n as PillarScore;
}

function pillarColumns(scores: Record<string, PillarScore>) {
  const [p1, p2, p3, p4, p5, p6, p7, p8] = PILLAR_IDS.map((id) =>
    scoreToText(scores[id] ?? null),
  );
  return { p1, p2, p3, p4, p5, p6, p7, p8 };
}

// Mirrors engine.ts's computeTierComposite: NA substitutes as 1 for tier
// assignment only.
function computeTierComposite(scores: PillarScore[]): number {
  return scores.reduce((sum: number, s) => sum + (s === null ? 1 : s), 0);
}

function getTierId(tierComposite: number): number {
  const tier = TIERS.find(
    (t) => tierComposite >= t.range[0] && tierComposite <= t.range[1],
  );
  return (tier ?? TIERS[0]).id;
}

// ---------------------------------------------------------------------------
// Step 1: migrate
// ---------------------------------------------------------------------------
async function migrate() {
  const existingFirms = await db.select().from(firmsTable);
  if (existingFirms.length > 0) {
    throw new Error(
      `Refusing to run: firms table already has ${existingFirms.length} row(s). ` +
        `This is a one-time migration. If you intend to re-run it, clear the ` +
        `firms/companies/assessments tables manually first.`,
    );
  }

  let firmsInserted = 0;
  let companiesInserted = 0;
  let assessmentsInserted = 0;

  // firmSlug -> companyId[] (db ids), used to recompute the DB-side rollup
  // per firm during verification.
  const companyIdsByFirm = new Map<string, number[]>();

  for (const firm of FIRMS) {
    const rawList = RAW_COMPANIES_BY_FIRM[firm.slug] ?? [];

    const [firmRow] = await db
      .insert(firmsTable)
      .values({
        name: firm.displayName,
        slug: firm.slug,
        website: null,
        status: "active",
      })
      .returning();
    firmsInserted++;

    const companyIds: number[] = [];

    for (const raw of rawList) {
      const [companyRow] = await db
        .insert(companiesTable)
        .values({
          firmId: firmRow.id,
          name: raw.name,
          website: null,
          status: "active",
        })
        .returning();
      companiesInserted++;
      companyIds.push(companyRow.id);

      const assessmentRows = raw.assessments.map((a) => ({
        companyId: companyRow.id,
        date: a.date,
        ...pillarColumns(a.pillarScores),
      }));

      if (assessmentRows.length > 0) {
        await db.insert(assessmentsTable).values(assessmentRows);
        assessmentsInserted += assessmentRows.length;
      }
    }

    companyIdsByFirm.set(firm.slug, companyIds);
  }

  return { firmsInserted, companiesInserted, assessmentsInserted, companyIdsByFirm };
}

// ---------------------------------------------------------------------------
// Step 2: recompute rollups strictly from what's now in the DB
// ---------------------------------------------------------------------------
interface DbFirmSummary {
  companyCount: number;
  tierCounts: Map<number, number>; // tierId -> count
  avgComposite: number;
}

async function computeDbSummary(companyIds: number[]): Promise<DbFirmSummary> {
  const tierCounts = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ]);

  if (companyIds.length === 0) {
    return { companyCount: 0, tierCounts, avgComposite: 0 };
  }

  const rows = await db
    .select()
    .from(assessmentsTable)
    .where(inArray(assessmentsTable.companyId, companyIds));

  // Company state is always derived from its LATEST assessment (per
  // types.ts contract) — pick max(date) per companyId.
  const latestByCompany = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
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
    const tierComposite = computeTierComposite(scores);
    const tierId = getTierId(tierComposite);
    tierCounts.set(tierId, (tierCounts.get(tierId) ?? 0) + 1);

    if (displayMax > 0) {
      compositeSum += (composite / displayMax) * 16; // PILLAR_MAX = 16
      scoredCompanyCount++;
    }
  }

  const avgComposite =
    scoredCompanyCount > 0
      ? Math.round((compositeSum / scoredCompanyCount) * 10) / 10
      : 0;

  return {
    companyCount: latestByCompany.size,
    tierCounts,
    avgComposite,
  };
}

function tierCountsToMap(tierCounts: TierCount[]): Map<number, number> {
  return new Map(tierCounts.map((tc) => [tc.tier.id, tc.count]));
}

function formatTierCounts(map: Map<number, number>): string {
  return [1, 2, 3, 4].map((id) => `T${id}=${map.get(id) ?? 0}`).join(", ");
}

// ---------------------------------------------------------------------------
// Step 3: report
// ---------------------------------------------------------------------------
async function main() {
  console.log("Starting one-time portfolio migration (files -> Postgres)...\n");

  const { firmsInserted, companiesInserted, assessmentsInserted, companyIdsByFirm } =
    await migrate();

  const [{ count: firmRowCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(firmsTable);
  const [{ count: companyRowCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companiesTable);
  const [{ count: assessmentRowCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assessmentsTable);

  console.log("=== Migration complete ===");
  console.log(`  inserted this run -> firms: ${firmsInserted}, companies: ${companiesInserted}, assessments: ${assessmentsInserted}`);
  console.log("\n=== Row counts per table (verified via SELECT count(*)) ===");
  console.log(`  firms:       ${firmRowCount}`);
  console.log(`  companies:   ${companyRowCount}`);
  console.log(`  assessments: ${assessmentRowCount}`);

  console.log("\n=== Rollup comparison: file-based (old) vs DB-based (new), per tenant ===");

  let anyMismatch = false;

  for (const firm of FIRMS) {
    const rawList = RAW_COMPANIES_BY_FIRM[firm.slug] ?? [];
    const oldSummary = rawList.length > 0 ? buildFirmPortfolio(firm.slug, rawList).summary : undefined;
    if (!oldSummary) {
      console.log(`\n[${firm.slug}] SKIPPED — no file-based summary found (unexpected).`);
      anyMismatch = true;
      continue;
    }

    const companyIds = companyIdsByFirm.get(firm.slug) ?? [];
    const newSummary = await computeDbSummary(companyIds);
    const oldTierMap = tierCountsToMap(oldSummary.tierCounts);

    console.log(`\n[${firm.slug}] ${firm.displayName}`);
    console.log(`  companyCount   old=${oldSummary.companyCount}  new=${newSummary.companyCount}`);
    console.log(`  avgComposite   old=${oldSummary.avgComposite}  new=${newSummary.avgComposite}`);
    console.log(`  tierCounts     old=[${formatTierCounts(oldTierMap)}]  new=[${formatTierCounts(newSummary.tierCounts)}]`);

    const mismatches: string[] = [];
    if (oldSummary.companyCount !== newSummary.companyCount) {
      mismatches.push(
        `companyCount mismatch: old=${oldSummary.companyCount} new=${newSummary.companyCount}`,
      );
    }
    if (oldSummary.avgComposite !== newSummary.avgComposite) {
      mismatches.push(
        `avgComposite mismatch: old=${oldSummary.avgComposite} new=${newSummary.avgComposite}`,
      );
    }
    for (const tierId of [1, 2, 3, 4]) {
      const o = oldTierMap.get(tierId) ?? 0;
      const n = newSummary.tierCounts.get(tierId) ?? 0;
      if (o !== n) {
        mismatches.push(`tier ${tierId} count mismatch: old=${o} new=${n}`);
      }
    }

    if (mismatches.length > 0) {
      anyMismatch = true;
      console.log(`  >>> MISMATCH DETECTED for "${firm.slug}":`);
      for (const m of mismatches) console.log(`      - ${m}`);
    } else {
      console.log(`  OK — exact match.`);
    }
  }

  console.log("\n=== Final result ===");
  if (anyMismatch) {
    console.log("MISMATCHES FOUND — see flagged tenant(s) above. Not silently reconciled.");
    process.exitCode = 1;
  } else {
    console.log("All tenants match exactly between file-based and DB-based rollups.");
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
