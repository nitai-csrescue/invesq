// ---------------------------------------------------------------------------
// Startup refresh for the stored rubric-v2 columns on assessments.
//
// The PortCo Score rollup changed from the retired plurality logic to the
// numeric composite (Low=0/Medium=1/High=2, Insufficient Data counts as 1 for
// the sum only; composite 0-8 banded 0-2 Low / 3-5 Medium / 6-8 High).
// Production rows still carry stored portco_score values computed under the
// OLD formula (readers prefer stored values, so a code-only deploy would keep
// displaying stale bands). This idempotent routine recomputes the six rubric
// columns for EVERY row from its stored p1..p8 values on boot and updates only
// rows whose stored values differ from the recomputed ones, so it no-ops once
// production is refreshed (and in dev, where the backfill script already ran).
//
// All bucketing math lives in the single shared computeRubricV2()
// implementation in @workspace/portfolio-engine -- never duplicated here.
// p1..p8 and evidence columns are strictly read-only; the only UPDATE sets the
// six rubric columns. Non-fatal by design: failures are logged, never crash
// the server on boot.
// ---------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, assessmentsTable } from "@workspace/db";
import {
  PILLAR_IDS,
  textToScore,
  computeRubricV2,
  RUBRIC_VERSION_V2,
  type PillarScore,
} from "@workspace/portfolio-engine";
import { logger } from "./logger.js";

type AssessmentRow = typeof assessmentsTable.$inferSelect;

function pillarScoresById(row: AssessmentRow): Record<string, PillarScore> {
  const cols = [row.p1, row.p2, row.p3, row.p4, row.p5, row.p6, row.p7, row.p8];
  const scores: Record<string, PillarScore> = {};
  PILLAR_IDS.forEach((pillarId, i) => {
    scores[pillarId] = textToScore(cols[i]);
  });
  return scores;
}

export async function backfillRubricV2(): Promise<void> {
  try {
    const rows = await db.select().from(assessmentsTable);

    let updated = 0;
    let portcoChanged = 0;
    for (const row of rows) {
      const rubric = computeRubricV2(pillarScoresById(row));

      const isStale =
        row.orgDesignScore !== rubric.orgDesignScore ||
        row.onboardingScore !== rubric.onboardingScore ||
        row.healthScoringScore !== rubric.healthScoringScore ||
        row.renewalExpansionScore !== rubric.renewalExpansionScore ||
        row.portcoScore !== rubric.portcoScore ||
        row.rubricVersion !== RUBRIC_VERSION_V2;

      if (!isStale) continue;

      if (row.portcoScore !== null && row.portcoScore !== rubric.portcoScore) {
        portcoChanged += 1;
      }

      await db
        .update(assessmentsTable)
        .set({
          orgDesignScore: rubric.orgDesignScore,
          onboardingScore: rubric.onboardingScore,
          healthScoringScore: rubric.healthScoringScore,
          renewalExpansionScore: rubric.renewalExpansionScore,
          portcoScore: rubric.portcoScore,
          rubricVersion: RUBRIC_VERSION_V2,
        })
        .where(eq(assessmentsTable.id, row.id));
      updated += 1;
    }

    if (updated === 0) {
      logger.info({ total: rows.length }, "rubric v2 stored values already current; no refresh needed");
    } else {
      logger.info(
        { total: rows.length, updated, portcoBandChanged: portcoChanged },
        "rubric v2 stored-value refresh complete",
      );
    }
  } catch (err) {
    logger.error({ err }, "rubric v2 stored-value refresh failed (non-fatal)");
  }
}
