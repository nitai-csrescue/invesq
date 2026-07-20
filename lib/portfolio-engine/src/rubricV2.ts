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
// portco_score = plurality band across the row's 4 pillar values,
// substituting Medium for any Insufficient Data pillar FOR THIS ROLLUP ONLY
// (the stored per-pillar value stays "Insufficient Data"). An exact tie
// between two bands resolves to the lower, more conservative band
// (Low < Medium < High).
// ---------------------------------------------------------------------------
import type { PillarScore } from "./types";

export type RubricBand = "Low" | "Medium" | "High";
export type RubricValue = RubricBand | "Insufficient Data";

export const RUBRIC_INSUFFICIENT: RubricValue = "Insufficient Data";
export const RUBRIC_VERSION_V2 = "v2";

// Conservative-first ordering used for tie-breaking and any band sorting.
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
 * Plurality rollup across the 4 pillar values. Insufficient Data pillars
 * count as Medium for THIS calculation only. Exact ties resolve to the
 * lower (more conservative) band.
 */
export function computePortcoScore(pillarValues: readonly RubricValue[]): RubricBand {
  const counts: Record<RubricBand, number> = { Low: 0, Medium: 0, High: 0 };
  for (const v of pillarValues) {
    const band: RubricBand = v === "Insufficient Data" ? "Medium" : v;
    counts[band] += 1;
  }
  const max = Math.max(counts.Low, counts.Medium, counts.High);
  // RUBRIC_BAND_ORDER is conservative-first, so the first band at max count
  // is the tie-broken winner.
  return RUBRIC_BAND_ORDER.find((b) => counts[b] === max) as RubricBand;
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
