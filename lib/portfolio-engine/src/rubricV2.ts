// ---------------------------------------------------------------------------
// Rubric v2 — 4-pillar Low/Medium/High rubric (Phase 2 migration).
//
// This is the SINGLE shared implementation of the v2 mapping and rollup.
// Every caller (backfill, build pipeline, any future edit path) must go
// through computeRubricV2() — never copy-paste the bucketing rules.
//
// Concept mapping (by pillar ID, never by p1..p8 column number):
//   org_design_score        = combine(org, leadership)
//   onboarding_score        = single(onboarding)
//   health_scoring_score    = combine(health, escalation)
//   renewal_expansion_score = combine(revenue, planning)
//   (the "ai" pillar drops out of the v2 rubric)
//
// portco_score = numeric composite across the row's 4 pillar values:
// each pillar maps Low=0 / Medium=1 / High=2, with Insufficient Data
// substituting as Medium (1) FOR THIS SUM ONLY (the stored per-pillar value
// stays "Insufficient Data"). Composite range is 0-8, banded
// 0-2 Low, 3-5 Medium, 6-8 High.
//
// The previous plurality-based rollup (count bands, plurality wins, ties to
// the lower band) is RETIRED as of the 2026-07-20 hard-gate sign-off; do not
// reintroduce it anywhere.
// ---------------------------------------------------------------------------
import type { PillarScore } from "./types";

export type RubricBand = "Low" | "Medium" | "High";
export type RubricValue = RubricBand | "Insufficient Data";

export const RUBRIC_INSUFFICIENT: RubricValue = "Insufficient Data";
export const RUBRIC_VERSION_V2 = "v2";

// Conservative-first ordering (Low < Medium < High) for band sorting/display.
export const RUBRIC_BAND_ORDER: readonly RubricBand[] = ["Low", "Medium", "High"];

/** single(x): NA -> Insufficient Data, 0 -> Low, 1 -> Medium, 2 -> High. */
export function singleToRubric(score: PillarScore | undefined): RubricValue {
  if (score === null || score === undefined) return RUBRIC_INSUFFICIENT;
  return score === 0 ? "Low" : score === 1 ? "Medium" : "High";
}

/**
 * combine(a, b): both NA -> Insufficient Data; exactly one NA -> single()
 * of the other; both present -> sum (0-4) bucketed 0-1 Low, 2 Medium,
 * 3-4 High.
 */
export function combineToRubric(
  a: PillarScore | undefined,
  b: PillarScore | undefined,
): RubricValue {
  const aNa = a === null || a === undefined;
  const bNa = b === null || b === undefined;
  if (aNa && bNa) return RUBRIC_INSUFFICIENT;
  if (aNa) return singleToRubric(b);
  if (bNa) return singleToRubric(a);
  const sum = (a as number) + (b as number);
  return sum <= 1 ? "Low" : sum === 2 ? "Medium" : "High";
}

/**
 * Numeric points for one pillar value in the PortCo composite:
 * Low=0, Medium=1, High=2. Insufficient Data substitutes as Medium (1)
 * for THIS sum only; the pillar itself still displays as Insufficient Data.
 */
export function rubricValueToPoints(v: RubricValue): number {
  if (v === "Low") return 0;
  if (v === "High") return 2;
  // Medium and Insufficient Data both contribute 1.
  return 1;
}

/** PortCo composite = sum of the 4 pillar point values. Range 0-8. */
export function computePortcoComposite(pillarValues: readonly RubricValue[]): number {
  return pillarValues.reduce((sum, v) => sum + rubricValueToPoints(v), 0);
}

/** Band the 0-8 composite: 0-2 Low, 3-5 Medium, 6-8 High. */
export function portcoBandFromComposite(composite: number): RubricBand {
  return composite <= 2 ? "Low" : composite <= 5 ? "Medium" : "High";
}

/**
 * PortCo Score rollup: numeric composite of the 4 pillar values (see
 * rubricValueToPoints), banded 0-2 Low / 3-5 Medium / 6-8 High.
 */
export function computePortcoScore(pillarValues: readonly RubricValue[]): RubricBand {
  return portcoBandFromComposite(computePortcoComposite(pillarValues));
}

export interface RubricV2Scores {
  orgDesignScore: RubricValue;
  onboardingScore: RubricValue;
  healthScoringScore: RubricValue;
  renewalExpansionScore: RubricValue;
  portcoScore: RubricBand;
}

/**
 * Compute all 5 v2 fields from an assessment's pillarScores map (keyed by
 * pillar ID — org, onboarding, health, escalation, revenue, leadership,
 * planning, ai). Matching is by CONCEPT (pillar id), never column number.
 */
export function computeRubricV2(
  pillarScores: Record<string, PillarScore>,
): RubricV2Scores {
  const orgDesignScore = combineToRubric(pillarScores["org"], pillarScores["leadership"]);
  const onboardingScore = singleToRubric(pillarScores["onboarding"]);
  const healthScoringScore = combineToRubric(pillarScores["health"], pillarScores["escalation"]);
  const renewalExpansionScore = combineToRubric(pillarScores["revenue"], pillarScores["planning"]);
  const portcoScore = computePortcoScore([
    orgDesignScore,
    onboardingScore,
    healthScoringScore,
    renewalExpansionScore,
  ]);
  return { orgDesignScore, onboardingScore, healthScoringScore, renewalExpansionScore, portcoScore };
}

// ---------------------------------------------------------------------------
// Display metadata for the 4 v2 pillars (order is the render order).
// ---------------------------------------------------------------------------
export interface RubricPillarDef {
  /** camelCase key into RubricV2Scores */
  key: keyof Omit<RubricV2Scores, "portcoScore">;
  name: string;
  /** Which v1 pillar concepts feed this pillar (documentation/tooltips). */
  sourcePillarIds: readonly string[];
  measures: string;
}

export const RUBRIC_PILLARS: readonly RubricPillarDef[] = [
  {
    key: "orgDesignScore",
    name: "Org Design",
    sourcePillarIds: ["org", "leadership"],
    measures:
      "Whether CS is structured as a distinct function with senior leadership carrying a value-creation mandate.",
  },
  {
    key: "onboardingScore",
    name: "Onboarding",
    sourcePillarIds: ["onboarding"],
    measures:
      "Whether new customers are activated through a structured, repeatable process that drives early time-to-value.",
  },
  {
    key: "healthScoringScore",
    name: "Health Scoring",
    sourcePillarIds: ["health", "escalation"],
    measures:
      "Whether customer health is measured systematically and at-risk accounts are managed proactively before churn.",
  },
  {
    key: "renewalExpansionScore",
    name: "Renewal & Expansion",
    sourcePillarIds: ["revenue", "planning"],
    measures:
      "Whether CS owns expansion revenue and high-value accounts run on structured success plans and QBR cadences.",
  },
];
