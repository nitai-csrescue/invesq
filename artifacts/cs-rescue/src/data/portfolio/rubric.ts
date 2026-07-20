// ---------------------------------------------------------------------------
// Rubric v2 (4-pillar Low/Medium/High) -- display helpers for the tenant
// portal cutover.
//
// Band values come from the DB (assessments.rubric via bootstrap);
// resolveRubric() falls back to the shared computeRubricV2() so a company
// NEVER renders blank when a stored rubric is missing. The mapping itself
// lives in @workspace/portfolio-engine (single source of truth) -- never
// re-implement bucketing rules here.
//
// This module only powers what the tenant routes DISPLAY. Internal
// composite/tier math in engine.ts (arrAtRisk, gaps, validation) is
// deliberately untouched.
// ---------------------------------------------------------------------------
import {
  computeRubricV2,
  RUBRIC_PILLARS,
  type RubricBand,
  type RubricValue,
  type RubricV2Scores,
  type RubricPillarDef,
} from "@workspace/portfolio-engine";
import type { Assessment } from "./types";

export { computeRubricV2, RUBRIC_PILLARS };
export type { RubricBand, RubricValue, RubricV2Scores, RubricPillarDef };

// ---------------------------------------------------------------------------
// Band display metadata (dark-theme tenant portal palette).
// ---------------------------------------------------------------------------
export interface RubricBandMeta {
  label: string;
  /** hex for rings / charts / dots */
  color: string;
  textClass: string;
  badgeClass: string;
  barClass: string;
  /** bar fill percentage for pillar rows */
  fillPct: number;
  /** Low 1 / Medium 2 / High 3 / null for Insufficient Data */
  ordinal: number | null;
  /** one-line meaning shown in scorecards / tooltips */
  description: string;
}

export const RUBRIC_BAND_META: Record<RubricValue, RubricBandMeta> = {
  Low: {
    label: "Low",
    color: "#fb7185",
    textClass: "text-rose-400",
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    barClass: "bg-rose-500",
    fillPct: 33,
    ordinal: 1,
    description: "Material capability gap; structured intervention recommended",
  },
  Medium: {
    label: "Medium",
    color: "#fbbf24",
    textClass: "text-amber-400",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    barClass: "bg-amber-500",
    fillPct: 66,
    ordinal: 2,
    description: "Partial capability in place; targeted upgrades available",
  },
  High: {
    label: "High",
    color: "#34d399",
    textClass: "text-emerald-400",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    barClass: "bg-emerald-500",
    fillPct: 100,
    ordinal: 3,
    description: "Structured and operating; monitor and maintain",
  },
  "Insufficient Data": {
    label: "Insufficient Data",
    color: "#94a3b8",
    textClass: "text-slate-400",
    badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-400",
    barClass: "bg-slate-500",
    fillPct: 100,
    ordinal: null,
    description: "Not enough external signal to score this pillar",
  },
};

export function rubricBandMeta(v: RubricValue): RubricBandMeta {
  return RUBRIC_BAND_META[v];
}

/** Conservative-first ordinal used for sorting and trend charts. */
export function portcoOrdinal(band: RubricBand): number {
  return RUBRIC_BAND_META[band].ordinal as number;
}

/**
 * Resolve an assessment's rubric: prefer the DB-stored value shipped via
 * bootstrap, fall back to computing it from pillarScores with the shared
 * engine mapping. Guarantees a non-blank rubric for every assessment.
 */
export function resolveRubric(a: Assessment): RubricV2Scores {
  return a.rubric ?? computeRubricV2(a.pillarScores);
}
