// ---------------------------------------------------------------------------
// TEMPORARY startup routine: re-onboard STG's 6 companies through the REAL
// pipeline (Phase 1b of the STG de-legacize). Remove after the build is
// verified complete in production.
//
// This is NOT a data patch. It replicates exactly what the admin UI does:
//   1. "Add company"            → insert companies rows (status active, slug,
//                                 normalizedName, website) — same shape as
//                                 POST /firms/:id/companies in routes/admin.ts.
//   2. "Confirm & queue build"  → firm status "reviewed" + insert a queued
//                                 "build" job row — same as POST /firms/:id/confirm.
// The queued job is then executed by the standard resumeQueuedBuildJobs()
// boot pass (sequenced after this routine in index.ts), which runs the real
// runBuildJob → Claude research → assessments/signals/meta writes.
//
// Safety gates:
//   - Only the firm with slug exactly "stg" is touched.
//   - One-shot via durable marker firms.meta.stgPipelineSeededAt (never
//     row-count heuristics). Skips if the firm already has ANY companies.
//   - Respects the partial unique index on jobs(type, target_id): if a
//     build job is already queued/running for the firm, does nothing.
//   - Errors are logged and swallowed (never crash boot).
// ---------------------------------------------------------------------------
import { and, eq, inArray } from "drizzle-orm";
import { db, firmsTable, companiesTable, jobsTable } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
import { logger } from "./logger.js";

// Same implementation as routes/admin.ts (local there, not exported).
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "firm";
}

const STG_COMPANIES: Array<{ name: string; website: string }> = [
  { name: "TaxCalc", website: "https://www.taxcalc.com" },
  { name: "Nomis Solutions", website: "https://www.nomissolutions.com" },
  { name: "Cadmium", website: "https://gocadmium.com" },
  { name: "Confience", website: "https://www.confience.com" },
  { name: "MediaValet", website: "https://www.mediavalet.com" },
  { name: "Trellix", website: "https://www.trellix.com" },
];

export async function seedStgPipelineRebuild(): Promise<void> {
  try {
    const [firm] = await db
      .select({ id: firmsTable.id, meta: firmsTable.meta })
      .from(firmsTable)
      .where(eq(firmsTable.slug, "stg"))
      .limit(1);

    if (!firm) {
      logger.warn("seedStgPipelineRebuild: no firm with slug 'stg'; skipping");
      return;
    }

    const meta = (firm.meta ?? {}) as Record<string, unknown>;
    if (meta["stgPipelineSeededAt"]) {
      return; // already seeded (durable marker) — normal boots stay quiet
    }

    const existing = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.firmId, firm.id))
      .limit(1);
    if (existing.length > 0) {
      logger.warn(
        "seedStgPipelineRebuild: STG already has companies but no marker; skipping (manual review needed)",
      );
      return;
    }

    // Mirror POST /firms/:id/companies for each company.
    const inserted = await db
      .insert(companiesTable)
      .values(
        STG_COMPANIES.map((c) => ({
          firmId: firm.id,
          name: c.name,
          website: c.website,
          status: "active" as const,
          slug: slugify(c.name),
          normalizedName: normalizeCompanyName(c.name),
        })),
      )
      .returning({ id: companiesTable.id, name: companiesTable.name });

    // Mirror POST /firms/:id/confirm: firm → "reviewed", queue a build job.
    await db.update(firmsTable).set({ status: "reviewed" }).where(eq(firmsTable.id, firm.id));

    try {
      await db
        .insert(jobsTable)
        .values({ type: "build", targetId: String(firm.id), status: "queued" });
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        // Partial unique index: a build job is already queued/running.
        const active = await db
          .select({ id: jobsTable.id, status: jobsTable.status })
          .from(jobsTable)
          .where(
            and(
              eq(jobsTable.type, "build"),
              eq(jobsTable.targetId, String(firm.id)),
              inArray(jobsTable.status, ["queued", "running"]),
            ),
          )
          .limit(1);
        logger.warn({ active }, "seedStgPipelineRebuild: build job already in flight; not queueing another");
      } else {
        throw err;
      }
    }

    // Durable one-shot marker, written after the seed succeeds.
    await db
      .update(firmsTable)
      .set({ meta: { ...meta, stgPipelineSeededAt: new Date().toISOString() } })
      .where(eq(firmsTable.id, firm.id));

    logger.info(
      { firmId: firm.id, companies: inserted },
      "seedStgPipelineRebuild: 6 STG companies added and build job queued; resumeQueuedBuildJobs will execute it",
    );
  } catch (err) {
    logger.error({ err }, "seedStgPipelineRebuild: failed (left untouched)");
  }
}
