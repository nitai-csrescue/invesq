// ---------------------------------------------------------------------------
// Legacy demo tenants — firm metadata (slug/displayName/statusLabel/internalOnly).
// Canonical source shared by:
//   - the cs-rescue frontend's firms registry (src/data/portfolio/firms.ts)
//   - the one-time migration/backfill/verify-parity scripts
//   - the production legacy-tenant seed endpoint (api-server admin routes)
// ---------------------------------------------------------------------------
import type { Firm } from "../types";

// NOTE (2026-08-04): the legacy-tenant era is over.
//   - "stg" was de-legacized first (pipeline re-onboarded, verified in prod).
//   - Phase 2: "pamlico", "longarc", and "solen" were de-legacized the same
//     way (firm rows preserved, company data wiped for pipeline re-onboarding)
//     and "raviga" (fictional demo sandbox) was deleted entirely.
// All tenants are now standard pipeline-managed firms (firms.meta +
// fail-soft bootstrap branch). This list stays as the derivation point for
// LEGACY_SLUGS guards, which now correctly match nothing.
export const LEGACY_FIRMS_META: Firm[] = [];
