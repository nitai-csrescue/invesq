// ---------------------------------------------------------------------------
// Phase 2 rubric-v2 backfill (idempotent).
//
// For EVERY existing assessments row, computes the 4-pillar Low/Medium/High
// rubric fields (org_design_score, onboarding_score, health_scoring_score,
// renewal_expansion_score, portco_score) from the row's stored p1..p8 values
// and stamps the canonical rubric_version (RUBRIC_VERSION). Matching is by pillar CONCEPT via
// PILLAR_IDS (p1..p8 map 1:1 to PILLARS order), and ALL bucketing math lives
// in the single shared computeRubricV2() implementation in
// @workspace/portfolio-engine — never duplicated here.
//
// p1..p8 and evidence columns are strictly read-only in this script: the
// only UPDATE sets the 6 new columns. Re-running always overwrites with the
// same deterministic values (idempotent).
//
// Run with:
//   pnpm --filter @workspace/cs-rescue run backfill-rubric-v2
// ---------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, pool, assessmentsTable } from "@workspace/db";
import {
  PILLAR_IDS,
  textToScore,
  computeRubricV2,
  RUBRIC_VERSION,
  type PillarScore,
  type RubricV2Scores,
} from "@workspace/portfolio-engine";

type AssessmentRow = typeof assessmentsTable.$inferSelect;

function pillarScoresById(row: AssessmentRow): Record<string, PillarScore> {
  const cols = [row.p1, row.p2, row.p3, row.p4, row.p5, row.p6, row.p7, row.p8];
  const scores: Record<string, PillarScore> = {};
  PILLAR_IDS.forEach((pillarId, i) => {
    scores[pillarId] = textToScore(cols[i]);
  });
  return scores;
}

const PILLAR_COLUMNS = [
  "orgDesignScore",
  "onboardingScore",
  "healthScoringScore",
  "renewalExpansionScore",
] as const satisfies readonly (keyof RubricV2Scores)[];

async function main() {
  const rows = await db.select().from(assessmentsTable);
  console.log(`Backfilling rubric v2 for ${rows.length} assessments rows...`);

  const distributions: Record<string, Record<string, number>> = {
    orgDesignScore: {},
    onboardingScore: {},
    healthScoringScore: {},
    renewalExpansionScore: {},
    portcoScore: {},
  };

  let updated = 0;
  for (const row of rows) {
    const rubric = computeRubricV2(pillarScoresById(row));

    for (const col of PILLAR_COLUMNS) {
      distributions[col][rubric[col]] = (distributions[col][rubric[col]] ?? 0) + 1;
    }
    distributions.portcoScore[rubric.portcoScore] =
      (distributions.portcoScore[rubric.portcoScore] ?? 0) + 1;

    await db
      .update(assessmentsTable)
      .set({
        orgDesignScore: rubric.orgDesignScore,
        onboardingScore: rubric.onboardingScore,
        healthScoringScore: rubric.healthScoringScore,
        renewalExpansionScore: rubric.renewalExpansionScore,
        portcoScore: rubric.portcoScore,
        rubricVersion: RUBRIC_VERSION,
      })
      .where(eq(assessmentsTable.id, row.id));
    updated++;
  }

  console.log(`Updated ${updated}/${rows.length} rows to rubric_version=${RUBRIC_VERSION}.`);
  console.log("Value distributions:");
  for (const [col, dist] of Object.entries(distributions)) {
    const parts = Object.entries(dist)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => `${value}=${count}`);
    console.log(`  ${col}: ${parts.join(", ")}`);
  }
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Backfill failed:", err);
    return pool.end().then(() => process.exit(1));
  });
