// ---------------------------------------------------------------------------
// DB column mapping helpers — assessments.p1..p8 map 1:1 to PILLARS order.
// "NA" is stored literally for null (insufficient data) scores.
// ---------------------------------------------------------------------------
import type { PillarScore } from "./types";
import { PILLARS } from "./pillars";

// PILLARS order defines the p1..p8 column mapping.
export const PILLAR_IDS: readonly string[] = PILLARS.map((p) => p.id);

if (PILLAR_IDS.length !== 8) {
  throw new Error(
    `Expected exactly 8 pillars to map onto p1..p8, found ${PILLAR_IDS.length}`,
  );
}

export function scoreToText(score: PillarScore): string {
  return score === null || score === undefined ? "NA" : String(score);
}

export function textToScore(text: string | null): PillarScore {
  if (text === null || text === "NA") return null;
  const n = Number(text);
  if (n !== 0 && n !== 1 && n !== 2) {
    throw new Error(`Unexpected stored assessment score "${text}"`);
  }
  return n as PillarScore;
}
