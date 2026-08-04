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
//   - One-shot via a durable marker: after the wipe, firms.meta gains
//     "migratedToPipelineAt" and every later boot no-ops on that flag —
//     company count is NOT used as completion state, so companies created
//     by future pipeline builds are never touched.
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
      .select({ id: firmsTable.id, slug: firmsTable.slug, meta: firmsTable.meta })
      .from(firmsTable)
      .where(eq(firmsTable.slug, "stg"))
      .limit(1);

    if (!firm) {
      logger.warn("migrateStgToPipeline: no firm with slug 'stg' found; skipping");
      return;
    }

    const meta = (firm.meta ?? {}) as Record<string, unknown>;
    if (meta["migratedToPipelineAt"]) {
      logger.info(
        { migratedToPipelineAt: meta["migratedToPipelineAt"] },
        "migrateStgToPipeline: already migrated (durable marker), nothing to do",
      );
      return;
    }

    const result = await deleteFirmCompaniesCascade(firm.id);

    // Durable completion marker — written AFTER the wipe so a failed wipe
    // retries next boot, and a successful one is never repeated even after
    // the pipeline repopulates STG with new companies.
    await db
      .update(firmsTable)
      .set({ meta: { ...meta, migratedToPipelineAt: new Date().toISOString() } })
      .where(eq(firmsTable.id, firm.id));

    invalidatePortfolioCache();
    logger.info(
      { firmId: firm.id, ...result },
      "migrateStgToPipeline: STG companies wiped for pipeline re-onboarding; cache invalidated",
    );
  } catch (err) {
    logger.error({ err }, "migrateStgToPipeline: failed (left untouched)");
  }
}
