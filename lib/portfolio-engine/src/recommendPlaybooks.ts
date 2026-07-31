// ---------------------------------------------------------------------------
// Pillar-gap -> playbook recommendation (Raviga pilot).
//
// Pure function over the derived Company's stored 4-pillar rubric values.
// A playbook is recommended when its pillar's band is in its triggerBands
// (Low/Medium). High and Insufficient Data never trigger a recommendation —
// an empty result is a valid, expected state, not an error.
// ---------------------------------------------------------------------------
import type { RubricValue, RubricV2Scores } from "./rubricV2";
import { pillarPlaybooks, type PillarPlaybook } from "./data/pillarPlaybooks";

/** Sort order: recommendations for lower-scoring pillars come first. */
function bandRank(v: RubricValue): number {
  return v === "Low" ? 0 : v === "Medium" ? 1 : 2;
}

/**
 * Structural parameter: any object carrying a resolved 4-pillar rubric
 * (RubricV2Scores). Note the engine's own Company type does NOT carry a
 * rubric field — callers holding one must resolve it first (stored
 * assessment rubric, else computeRubricV2), exactly as the cs-rescue
 * frontend's resolveRubric() does before its Company reaches this function.
 */
export function getRecommendedPlaybooks(company: { rubric: RubricV2Scores }): PillarPlaybook[] {
  return pillarPlaybooks
    .filter((pb) => {
      const value = company.rubric[pb.pillar];
      return (pb.triggerBands as readonly RubricValue[]).includes(value);
    })
    .sort(
      (a, b) => bandRank(company.rubric[a.pillar]) - bandRank(company.rubric[b.pillar]),
    );
}
