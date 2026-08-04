// ---------------------------------------------------------------------------
// Legacy demo tenants — firm metadata (slug/displayName/statusLabel/internalOnly).
// Canonical source shared by:
//   - the cs-rescue frontend's firms registry (src/data/portfolio/firms.ts)
//   - the one-time migration/backfill/verify-parity scripts
//   - the production legacy-tenant seed endpoint (api-server admin routes)
// ---------------------------------------------------------------------------
import type { Firm } from "../types";

// NOTE (2026-08-04): "stg" was de-legacized — it is now a standard
// pipeline-managed tenant (firms.meta + fail-soft bootstrap branch), so it no
// longer appears here. Pamlico/Raviga/Long Arc/Solen remain legacy until their
// own migration passes.
export const LEGACY_FIRMS_META: Firm[] = [
  {
    slug: "pamlico",
    displayName: "Pamlico Capital",
    statusLabel: "Internal preview — not cleared for external distribution",
    internalOnly: true,
    icpFit: "Moderate",
  },
  {
    slug: "raviga",
    displayName: "Raviga Capital",
    statusLabel: "Demo Sandbox — Not for External Use",
    internalOnly: true,
  },
  {
    slug: "longarc",
    displayName: "Long Arc Capital",
    statusLabel: "Internal preview — not cleared for external distribution",
    internalOnly: true,
  },
  {
    slug: "solen",
    displayName: "Solen Software Group",
    statusLabel: "Internal preview — not cleared for external distribution",
    internalOnly: true,
  },
];
