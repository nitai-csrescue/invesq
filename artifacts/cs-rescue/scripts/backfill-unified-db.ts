// ---------------------------------------------------------------------------
// One-time (idempotent) Phase 1/2 backfill for ARCHITECTURE-UNIFIED-DB.md:
//   (a) companies.normalizedName <- normalizeCompanyName(name), for every
//       existing company row regardless of status.
//   (b) findings <- fan out each existing assessments.p1..p8 (+ per-pillar
//       evidence) row into up to 8 `findings` rows, one per non-null pillar
//       score/evidence pair. Source is stamped "assessment_backfill" (NOT
//       the live-pipeline default "claude_web_search") because these rows
//       did not come from a fresh Claude call — they are derived from
//       already-stored assessment columns, and mischaracterizing their
//       origin would corrupt any future "which findings came from a live
//       Claude run" query.
//
// Both halves are idempotent: (a) always overwrites with the same
// deterministic value; (b) uses the findings_assessment_pillar_uq unique
// index via onConflictDoNothing, so re-running never creates duplicates.
//
// p1..p8 stay as the denormalized fast-path columns on `assessments`
// (unchanged, still read directly by the bootstrap/engine) — findings is
// purely additive.
//
// Run with:
//   pnpm --filter @workspace/cs-rescue run backfill-unified-db
// ---------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, pool, companiesTable, assessmentsTable, findingsTable } from "@workspace/db";
import { PILLAR_IDS, normalizeCompanyName, textToScore, scoreToText } from "@workspace/portfolio-engine";

const BACKFILL_SOURCE = "assessment_backfill";

async function backfillNormalizedNames(): Promise<number> {
  const companies = await db.select().from(companiesTable);
  let updated = 0;

  for (const c of companies) {
    const normalizedName = normalizeCompanyName(c.name);
    if (c.normalizedName === normalizedName) continue;
    await db.update(companiesTable).set({ normalizedName }).where(eq(companiesTable.id, c.id));
    updated++;
  }

  return updated;
}

interface PillarColumnSet {
  score: string | null;
  evidence: string | null;
}

function pillarColumns(row: typeof assessmentsTable.$inferSelect): Record<string, PillarColumnSet> {
  const scoresByPillar: Record<string, PillarColumnSet> = {};
  const scores = [row.p1, row.p2, row.p3, row.p4, row.p5, row.p6, row.p7, row.p8];
  const evidences = [
    row.p1Evidence,
    row.p2Evidence,
    row.p3Evidence,
    row.p4Evidence,
    row.p5Evidence,
    row.p6Evidence,
    row.p7Evidence,
    row.p8Evidence,
  ];
  PILLAR_IDS.forEach((pillarId, i) => {
    scoresByPillar[pillarId] = { score: scores[i], evidence: evidences[i] };
  });
  return scoresByPillar;
}

async function backfillFindings(): Promise<{ assessmentsScanned: number; findingsInserted: number }> {
  const assessments = await db.select().from(assessmentsTable);
  let findingsInserted = 0;

  for (const row of assessments) {
    const byPillar = pillarColumns(row);

    for (const pillarId of PILLAR_IDS) {
      const { score, evidence } = byPillar[pillarId];
      if (score === null) continue; // no column value stored for this pillar on this row

      // Round-trip through textToScore/scoreToText to reuse the exact same
      // validation @workspace/portfolio-engine already applies elsewhere
      // (throws on an unexpected non-"0"/"1"/"2"/"NA" value) instead of
      // inventing a parallel check here.
      const normalizedScore = scoreToText(textToScore(score));

      const inserted = await db
        .insert(findingsTable)
        .values({
          assessmentId: row.id,
          pillarId,
          score: normalizedScore,
          evidence,
          source: BACKFILL_SOURCE,
          // Inherit the parent assessment's stamped version rather than
          // assuming the current one — this script can re-run over old rows.
          rubricVersion: row.rubricVersion,
        })
        .onConflictDoNothing({ target: [findingsTable.assessmentId, findingsTable.pillarId] })
        .returning({ id: findingsTable.id });

      if (inserted.length > 0) findingsInserted++;
    }
  }

  return { assessmentsScanned: assessments.length, findingsInserted };
}

async function main() {
  console.log("=== Backfilling companies.normalizedName + findings (Phase 1/2) ===\n");

  const namesUpdated = await backfillNormalizedNames();
  console.log(`companies.normalizedName: ${namesUpdated} row(s) updated (idempotent — same value on re-run).`);

  const { assessmentsScanned, findingsInserted } = await backfillFindings();
  console.log(
    `findings: scanned ${assessmentsScanned} assessment row(s), inserted ${findingsInserted} new finding row(s) (source="${BACKFILL_SOURCE}").`,
  );

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
