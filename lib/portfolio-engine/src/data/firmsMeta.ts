// ---------------------------------------------------------------------------
// Legacy demo tenants — firm metadata (slug/displayName/statusLabel/internalOnly).
// Canonical source shared by:
//   - the cs-rescue frontend's firms registry (src/data/portfolio/firms.ts)
//   - the one-time migration/backfill/verify-parity scripts
//   - the production legacy-tenant seed endpoint (api-server admin routes)
// ---------------------------------------------------------------------------
import type { Firm } from "../types";

export const LEGACY_FIRMS_META: Firm[] = [
  {
    slug: "stg",
    displayName: "STG",
    statusLabel: "Design-partner preview",
    internalOnly: false,
    icpFit: "Strong",
  },
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
