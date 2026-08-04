// ---------------------------------------------------------------------------
// TEMPORARY startup routine: Phase 2 portfolio re-onboarding (task: restore
// the three tenants emptied by migratePhase2Tenants). Remove after verified
// complete in production.
//
// What it does, per firm (pamlico / longarc / solen), exactly once:
//   1. Inserts the confirmed company rows (name + real public website,
//      status "active", slugified slug, normalizedName) — the exact same
//      shape as the admin add-company route (POST /firms/:id/companies).
//   2. Queues ONE jobs row (type "build", targetId = firm id, status
//      "queued") and fires runBuildJob — the exact same pipeline (Claude
//      research + 4-pillar scoring + meta/assessment/signal writes) used for
//      STG's rebuild. If the server restarts mid-build,
//      resumeQueuedBuildJobs() picks the job back up.
//
// Idempotency (boot-migration-completion-markers lesson — durable marker,
// never row-count heuristics):
//   - firms.meta.phase2RestoredAt is stamped in the SAME transaction as the
//     company inserts + job insert; a firm already carrying the marker is
//     skipped entirely.
//   - Safety gate: only runs on a firm whose meta carries migratedToPipelineAt
//     (i.e. the wipe actually happened) — never fires on an unmigrated DB.
//   - Company inserts skip slugs that already exist for the firm, so a crash
//     between commit and build completion cannot duplicate rows.
//
// Errors are logged and swallowed per-firm — boot must never crash.
// ---------------------------------------------------------------------------
import { and, eq } from "drizzle-orm";
import { db, firmsTable, companiesTable, jobsTable } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
import { runBuildJob } from "./jobs/build.js";
import { logger } from "./logger.js";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "company";
}

// Real public websites resolved via web search on 2026-08-04.
const RESTORE_PLAN: Record<string, Array<{ name: string; website: string }>> = {
  pamlico: [
    { name: "Profisee", website: "https://profisee.com" },
    { name: "EHS Insight", website: "https://www.ehsinsight.com" },
    { name: "CEATI International", website: "https://www.ceati.com" },
  ],
  longarc: [
    { name: "Concertiv", website: "https://concertiv.com" },
    { name: "CircleBlack", website: "https://www.circleblack.com" },
    { name: "Tinubu", website: "https://www.tinubu.com" },
  ],
  solen: [
    { name: "Track Star", website: "https://trackstar.com" },
    { name: "ViaPeople", website: "https://www.viapeople.com" },
    { name: "Champ Software", website: "https://www.champsoftware.com" },
    { name: "Cairn Applications", website: "https://cairnapplications.com" },
    { name: "SMRTR", website: "https://smrtrsolutions.com" },
    { name: "Primate Technologies", website: "https://primate-tech.com" },
  ],
};

export async function restorePhase2Portfolios(): Promise<void> {
  for (const [slug, companies] of Object.entries(RESTORE_PLAN)) {
    try {
      const [firm] = await db
        .select({ id: firmsTable.id, meta: firmsTable.meta })
        .from(firmsTable)
        .where(eq(firmsTable.slug, slug))
        .limit(1);
      if (!firm) {
        logger.warn({ slug }, "restorePhase2Portfolios: firm not found; skipping");
        continue;
      }
      const meta = (firm.meta ?? {}) as Record<string, unknown>;
      if (meta["phase2RestoredAt"]) continue; // durable marker: done
      if (!meta["migratedToPipelineAt"]) {
        logger.warn(
          { slug },
          "restorePhase2Portfolios: wipe marker missing; refusing to restore",
        );
        continue;
      }

      // Companies + queued build job + completion marker: one transaction.
      const jobId = await db.transaction(async (tx) => {
        for (const c of companies) {
          const companySlug = slugify(c.name);
          const [existing] = await tx
            .select({ id: companiesTable.id })
            .from(companiesTable)
            .where(
              and(
                eq(companiesTable.firmId, firm.id),
                eq(companiesTable.slug, companySlug),
              ),
            )
            .limit(1);
          if (existing) continue;
          await tx.insert(companiesTable).values({
            firmId: firm.id,
            name: c.name,
            website: c.website,
            status: "active",
            slug: companySlug,
            normalizedName: normalizeCompanyName(c.name),
          });
        }
        const [job] = await tx
          .insert(jobsTable)
          .values({ type: "build", targetId: String(firm.id), status: "queued" })
          .returning({ id: jobsTable.id });
        await tx
          .update(firmsTable)
          .set({ meta: { ...meta, phase2RestoredAt: new Date().toISOString() } })
          .where(eq(firmsTable.id, firm.id));
        return job.id;
      });

      logger.info(
        { slug, firmId: firm.id, jobId, companies: companies.length },
        "restorePhase2Portfolios: companies inserted, build job queued",
      );
      // Same fire-and-forget as the admin confirm route; failures are
      // persisted onto the job row and resumed at next startup.
      void runBuildJob(jobId).catch((err) =>
        logger.error({ err, jobId, slug }, "restorePhase2Portfolios: build job crashed"),
      );
    } catch (err) {
      logger.error({ err, slug }, "restorePhase2Portfolios: failed (left as-is)");
    }
  }
}
