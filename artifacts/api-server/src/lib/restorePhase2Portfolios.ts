// ---------------------------------------------------------------------------
// TEMPORARY startup routine: Phase 2 portfolio re-onboarding (task: restore
// the three tenants emptied by migratePhase2Tenants). Remove after verified
// complete in production.
//
// What it does, per firm (pamlico / longarc / solen):
//   1. Exactly once (marker-gated): inserts the confirmed company rows
//      (name + real public website, status "active", slugified slug,
//      normalizedName) — the exact same shape as the admin add-company route
//      (POST /firms/:id/companies) — and stamps firms.meta.phase2RestoredAt
//      in the SAME transaction.
//   2. Every boot until built: ensures pipeline coverage — if any restored
//      company still has no assessment and the firm has no queued/running
//      build job, it inserts ONE queued jobs row (type "build", targetId =
//      firm id). It deliberately does NOT call runBuildJob itself: index.ts
//      runs resumeQueuedBuildJobs() right after this routine, which picks the
//      queued row up exactly once. (Firing here AND letting the resume scan
//      reclaim it was a double-execution race — review finding.)
//      This branch also self-heals a failed build: the failed job is no
//      longer queued/running, the companies still lack assessments, so the
//      next boot queues a fresh job.
//
// Idempotency (boot-migration-completion-markers lesson — durable marker,
// never row-count heuristics for the INSERT step; the build-coverage step is
// intentionally state-driven so it can retry failures):
//   - firms.meta.phase2RestoredAt gates the company inserts.
//   - Safety gate: inserts only run on a firm whose meta carries
//     migratedToPipelineAt (i.e. the wipe actually happened).
//   - The job insert is conflict-aware: it pre-checks for an active
//     (queued/running) build job for the firm inside the same transaction,
//     so it never trips the partial unique index on (type, targetId).
//
// Errors are logged and swallowed per-firm — boot must never crash.
// ---------------------------------------------------------------------------
import { and, eq, inArray } from "drizzle-orm";
import { db, firmsTable, companiesTable, jobsTable, assessmentsTable } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
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

async function findActiveBuildJob(
  tx: Pick<typeof db, "select">,
  firmId: number,
): Promise<number | null> {
  const [job] = await tx
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(
      and(
        eq(jobsTable.type, "build"),
        eq(jobsTable.targetId, String(firmId)),
        inArray(jobsTable.status, ["queued", "running"]),
      ),
    )
    .limit(1);
  return job ? job.id : null;
}

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

      // Step 1 — one-shot company inserts, marker-gated.
      if (!meta["phase2RestoredAt"]) {
        if (!meta["migratedToPipelineAt"]) {
          logger.warn(
            { slug },
            "restorePhase2Portfolios: wipe marker missing; refusing to restore",
          );
          continue;
        }
        await db.transaction(async (tx) => {
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
          await tx
            .update(firmsTable)
            .set({ meta: { ...meta, phase2RestoredAt: new Date().toISOString() } })
            .where(eq(firmsTable.id, firm.id));
        });
        logger.info(
          { slug, firmId: firm.id, companies: companies.length },
          "restorePhase2Portfolios: companies inserted, marker set",
        );
      }

      // Step 2 — ensure build coverage (state-driven; retries failed builds).
      const planSlugs = companies.map((c) => slugify(c.name));
      const restored = await db
        .select({ id: companiesTable.id })
        .from(companiesTable)
        .where(
          and(
            eq(companiesTable.firmId, firm.id),
            inArray(companiesTable.slug, planSlugs),
            eq(companiesTable.status, "active"),
          ),
        );
      if (restored.length === 0) continue;
      const assessed = await db
        .select({ companyId: assessmentsTable.companyId })
        .from(assessmentsTable)
        .where(
          inArray(
            assessmentsTable.companyId,
            restored.map((r) => r.id),
          ),
        );
      const assessedIds = new Set(assessed.map((a) => a.companyId));
      const unbuilt = restored.filter((r) => !assessedIds.has(r.id));
      if (unbuilt.length === 0) continue; // fully built — nothing to do

      // Conflict-aware queue: never collide with the partial unique index on
      // an already-active build job; reuse it as the durable work item.
      const jobId = await db.transaction(async (tx) => {
        const active = await findActiveBuildJob(tx, firm.id);
        if (active) return null;
        const [job] = await tx
          .insert(jobsTable)
          .values({ type: "build", targetId: String(firm.id), status: "queued" })
          .returning({ id: jobsTable.id });
        return job.id;
      });
      if (jobId) {
        logger.info(
          { slug, firmId: firm.id, jobId, unbuilt: unbuilt.length },
          "restorePhase2Portfolios: build job queued (resume scan will run it)",
        );
      } else {
        logger.info(
          { slug, firmId: firm.id, unbuilt: unbuilt.length },
          "restorePhase2Portfolios: active build job already present; reusing it",
        );
      }
    } catch (err) {
      logger.error({ err, slug }, "restorePhase2Portfolios: failed (left as-is)");
    }
  }
}
