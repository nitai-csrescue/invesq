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

// ---------------------------------------------------------------------------
// Company name normalization — canonical slug used for cross-request dedup
// (companies.normalizedName, see ARCHITECTURE-UNIFIED-DB.md Section 3.2).
// Deliberately identical to the ad-hoc `slugify()` already used by
// `routes/admin.ts`'s `/admin/backfill-pipeline-meta` repair endpoint (grouping
// active companies by `slugify(c.name)` per firm) — this is a single canonical
// copy of that same normalization so the DB-level unique index and the
// pre-existing repair endpoint's notion of "duplicate" never disagree.
// ---------------------------------------------------------------------------
export function normalizeCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "company";
}
