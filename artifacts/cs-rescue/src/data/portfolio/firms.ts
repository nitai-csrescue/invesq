// ---------------------------------------------------------------------------
// Firms registry — one entry per PE-firm tenant.
// Adding a new firm is purely a data operation: append a Firm entry here,
// add a company-data file, and register it in engine.ts. No UI changes needed.
// ---------------------------------------------------------------------------
import type { Firm } from "./types";

export const FIRMS: Firm[] = [
  {
    slug: "stg",
    displayName: "STG",
    statusLabel: "Design-partner preview",
    internalOnly: false,
  },
  {
    slug: "pamlico",
    displayName: "Pamlico Capital",
    statusLabel: "Internal preview — not cleared for external distribution",
    internalOnly: true,
  },
];

export const FIRMS_BY_SLUG: Readonly<Record<string, Firm>> = Object.fromEntries(
  FIRMS.map((f) => [f.slug, f]),
);

export function getFirm(slug: string): Firm | undefined {
  return FIRMS_BY_SLUG[slug];
}

export const AS_OF_DATE = "2026-06-15";
