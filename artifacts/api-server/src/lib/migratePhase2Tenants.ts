// ---------------------------------------------------------------------------
// TEMPORARY startup migration: Phase 2 legacy-tenant de-legacize (STG was
// Phase 1). Remove after the change is verified complete in production.
//
// What it does, per environment, exactly once:
//   1. Pamlico ("pamlico"), Long Arc ("longarc"), Solen ("solen"):
//      delete ALL company rows and their FK children (assessments, signals,
//      findings, report exports/revisions/validations, notion sync state,
//      company-targeted jobs, ...) via the shared deleteFirmCompaniesCascade —
//      the exact same FK-safe order as the admin delete route — but KEEP the
//      firm row (slug/name/status/meta) so each tenant survives as an empty
//      pipeline-managed portfolio awaiting re-onboarding.
//   2. Raviga ("raviga"): delete the ENTIRE tenant (firm row + all children)
//      via deleteFirmCascade. Raviga is fictional demo data (HBO Silicon
//      Valley parody names), confirmed for full removal.
//
// Idempotency (per the boot-migration-completion-markers lesson — durable
// markers, never row-count heuristics):
//   - The three preserved firms get firms.meta.migratedToPipelineAt set in
//     the same pass; a firm whose meta already carries the marker is skipped.
//   - Raviga's deletion is naturally idempotent: no firm row -> nothing to do.
//   - STG is never touched (not in the slug list; already migrated Phase 1).
//
// Errors are logged and swallowed per-firm — boot must never crash.
// ---------------------------------------------------------------------------
import { eq, inArray } from "drizzle-orm";
import { db, firmsTable } from "@workspace/db";
import { deleteFirmCascade, deleteFirmCompaniesCascade } from "./deleteFirmCascade.js";
import { invalidatePortfolioCache } from "./portfolioData.js";
import { logger } from "./logger.js";

const WIPE_KEEP_FIRM_SLUGS = ["pamlico", "longarc", "solen"] as const;

export async function migratePhase2Tenants(): Promise<void> {
  let changed = false;

  // 1. Wipe companies (keep firm) for the three de-legacized tenants.
  for (const slug of WIPE_KEEP_FIRM_SLUGS) {
    try {
      const [firm] = await db
        .select({ id: firmsTable.id, meta: firmsTable.meta })
        .from(firmsTable)
        .where(eq(firmsTable.slug, slug))
        .limit(1);
      if (!firm) {
        logger.warn({ slug }, "migratePhase2Tenants: firm not found; skipping");
        continue;
      }
      const meta = (firm.meta ?? {}) as Record<string, unknown>;
      if (meta["migratedToPipelineAt"]) continue; // durable marker: done

      // Marker is stamped INSIDE the cascade's transaction — the wipe and the
      // durable completion marker commit or roll back together.
      const result = await deleteFirmCompaniesCascade(firm.id, {
        stampFirmMeta: { ...meta, migratedToPipelineAt: new Date().toISOString() },
      });
      changed = true;
      logger.info(
        { slug, firmId: firm.id, ...result },
        "migratePhase2Tenants: wiped companies, kept firm row, marker set",
      );
    } catch (err) {
      logger.error({ err, slug }, "migratePhase2Tenants: company wipe failed (left as-is)");
    }
  }

  // 2. Delete the Raviga tenant entirely.
  try {
    const [raviga] = await db
      .select({ id: firmsTable.id })
      .from(firmsTable)
      .where(eq(firmsTable.slug, "raviga"))
      .limit(1);
    if (raviga) {
      const result = await deleteFirmCascade(raviga.id);
      changed = true;
      logger.info(
        { firmId: raviga.id, ...result },
        "migratePhase2Tenants: Raviga tenant fully deleted",
      );
    }
  } catch (err) {
    logger.error({ err }, "migratePhase2Tenants: Raviga deletion failed (left as-is)");
  }

  if (changed) invalidatePortfolioCache();
}
