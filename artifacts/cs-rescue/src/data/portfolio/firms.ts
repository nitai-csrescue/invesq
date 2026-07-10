// ---------------------------------------------------------------------------
// Firms registry — one entry per PE-firm tenant.
// The metadata itself (slug/displayName/statusLabel/internalOnly) is now
// canonically defined in @workspace/portfolio-engine/data (LEGACY_FIRMS_META)
// so it can be shared with the one-time migration scripts and the api-server
// legacy-tenant seed endpoint — see replit.md "Database" section. This file
// just re-exports it plus the frontend-only lookup helpers.
// ---------------------------------------------------------------------------
import { LEGACY_FIRMS_META } from "@workspace/portfolio-engine/firms-meta";
import type { Firm } from "./types";

export const FIRMS: Firm[] = LEGACY_FIRMS_META;

export const FIRMS_BY_SLUG: Readonly<Record<string, Firm>> = Object.fromEntries(
  FIRMS.map((f) => [f.slug, f]),
);

export function getFirm(slug: string): Firm | undefined {
  return FIRMS_BY_SLUG[slug];
}

export const AS_OF_DATE = "2026-06-15";
