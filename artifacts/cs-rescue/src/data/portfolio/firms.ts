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

// The 5 hand-authored tenants. This static list is the source of truth for
// their identity/copy and always takes precedence over anything the pipeline
// registers at runtime (see registerDynamicFirms below).
export const FIRMS: Firm[] = LEGACY_FIRMS_META;

export const FIRMS_BY_SLUG: Readonly<Record<string, Firm>> = Object.fromEntries(
  FIRMS.map((f) => [f.slug, f]),
);

// ---------------------------------------------------------------------------
// Dynamic firm registry — firms created by the /admin AI-onboarding pipeline
// arrive in the bootstrap payload at runtime (they aren't in the static list
// above). registerDynamicFirms() is called once during hydration with the
// firm identity carried on that payload, so getFirm()/getAllFirms() surface
// them exactly like the hand-authored tenants — no per-firm code change and no
// frontend redesign. Static firms always win on slug collision.
// ---------------------------------------------------------------------------
const DYNAMIC_FIRMS = new Map<string, Firm>();

export function registerDynamicFirms(
  firms: readonly {
    slug: string;
    displayName: string;
    statusLabel: string;
    internalOnly: boolean;
  }[],
): void {
  DYNAMIC_FIRMS.clear();
  for (const f of firms) {
    // A legacy slug is owned by the static list — never shadow it.
    if (FIRMS_BY_SLUG[f.slug]) continue;
    DYNAMIC_FIRMS.set(f.slug, {
      slug: f.slug,
      displayName: f.displayName,
      statusLabel: f.statusLabel,
      internalOnly: f.internalOnly,
    });
  }
}

// All tenants (hand-authored first, then pipeline-onboarded) for listing UIs.
export function getAllFirms(): Firm[] {
  return [...FIRMS, ...DYNAMIC_FIRMS.values()];
}

export function getFirm(slug: string): Firm | undefined {
  return FIRMS_BY_SLUG[slug] ?? DYNAMIC_FIRMS.get(slug);
}

export const AS_OF_DATE = "2026-06-15";
