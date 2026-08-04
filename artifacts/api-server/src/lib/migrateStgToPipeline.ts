// ---------------------------------------------------------------------------
// TEMPORARY startup migration: de-legacize the "stg" tenant (Phase 1 of the
// 5-tenant migration; pamlico/raviga/longarc/solen stay legacy for now).
// Remove after the migration is verified live in production.
//
// What it does (explicitly signed off by Nitai, 2026-08-04):
//   1. Deletes ALL companies under the "stg" firm plus every child row
//      (assessments, report exports/revisions/validations, signals, findings,
//      calibration rows, confirmation requests, tier disputes/audit, etc.)
//      via the shared deleteFirmCompaniesCascade helper — same FK-safe order
//      as the admin firm-delete route. Full clean slate for STG's companies.
//   2. Keeps the firm row itself (slug "stg", name "STG", status, meta)
//      untouched apart from the company children. With "stg" removed from
//      LEGACY_FIRMS_META, the firm now flows through the fail-soft pipeline
//      bootstrap branch and renders an empty portfolio until the first
//      "Confirm & queue build" pipeline run repopulates it.
//
// Safety gates:
//   - Only the firm with slug exactly "stg" is touched; the other four
//     legacy tenants and all pipeline firms are never read for write.
//   - Idempotent: on any boot after the companies are gone, the cascade
//     finds zero company ids and deletes nothing.
//   - Errors are logged and swallowed (never crash the server at boot).
// ---------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, firmsTable } from "@workspace/db";
import { deleteFirmCompaniesCascade } from "./deleteFirmCascade.js";
import { invalidatePortfolioCache } from "./portfolioData.js";
import { logger } from "./logger.js";

export async function migrateStgToPipeline(): Promise<void> {
  try {
    const [firm] = await db
      .select({ id: firmsTable.id, slug: firmsTable.slug, name: firmsTable.name })
      .from(firmsTable)
      .where(eq(firmsTable.slug, "stg"))
      .limit(1);

    if (!firm) {
      logger.warn("migrateStgToPipeline: no firm with slug 'stg' found; skipping");
      return;
    }

    const result = await deleteFirmCompaniesCascade(firm.id);

    if (result.removedCompanies === 0) {
      logger.info("migrateStgToPipeline: already migrated (0 companies), nothing to do");
      return;
    }

    invalidatePortfolioCache();
    logger.info(
      { firmId: firm.id, ...result },
      "migrateStgToPipeline: STG companies wiped for pipeline re-onboarding; cache invalidated",
    );
  } catch (err) {
    logger.error({ err }, "migrateStgToPipeline: failed (left untouched)");
  }
}
