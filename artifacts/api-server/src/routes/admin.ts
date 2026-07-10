import { Router, type IRouter } from "express";
import { and, count, desc, eq, inArray, like, notInArray } from "drizzle-orm";
import { db, assessmentsTable, companiesTable, firmsTable, jobsTable } from "@workspace/db";
import { AddAdminFirmCompanyBody, ConfirmAdminFirmBody, CreateAdminFirmBody } from "@workspace/api-zod";
import type {
  AdminFirmConfirmResult,
  AdminFirmDetail,
  AdminFirmSummary,
  Company,
  CreateAdminFirmResponse,
  Firm,
  Job,
  SeedLegacyTenantsResult,
} from "@workspace/api-zod";
import { runDiscoveryJob } from "../lib/jobs/discovery.js";
import { runBuildJob } from "../lib/jobs/build.js";
import { getOrigin } from "../lib/http.js";
import { seedLegacyTenants } from "../lib/seedLegacyTenants.js";
import { requireAdminAuth } from "../middlewares/authMiddleware.js";
import {
  getReportData,
  getOrGenerateReportExport,
  CompanyNotFoundError,
  NoAssessmentError,
} from "../lib/reportExport.js";

const router: IRouter = Router();

// Every /admin/* route is internal-only and must reject unauthenticated /
// non-allowlisted requests server-side. The /admin frontend page is also
// gated client-side, but that alone does not protect these API routes from
// being called directly.
router.use(requireAdminAuth);

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "firm";
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await db
    .select({ slug: firmsTable.slug })
    .from(firmsTable)
    .where(like(firmsTable.slug, `${base}%`));
  const taken = new Set(existing.map((row) => row.slug));
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function toCompany(row: typeof companiesTable.$inferSelect, hasAssessment: boolean): Company {
  return {
    id: row.id,
    firmId: row.firmId,
    name: row.name,
    website: row.website,
    status: row.status,
    slug: row.slug,
    createdAt: row.createdAt,
    hasAssessment,
  };
}

function toFirmResponse(row: typeof firmsTable.$inferSelect): Firm {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    slug: row.slug,
    status: row.status,
    createdByEmail: row.createdByEmail,
    createdAt: row.createdAt,
  };
}

function toJobResponse(row: typeof jobsTable.$inferSelect): Job {
  return {
    id: row.id,
    type: row.type,
    targetId: row.targetId,
    status: row.status,
    progressPct: row.progressPct,
    etaSeconds: row.etaSeconds,
    error: row.error,
  };
}

async function companiesWithAssessments(companyIds: number[]): Promise<Set<number>> {
  if (companyIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ companyId: assessmentsTable.companyId })
    .from(assessmentsTable)
    .where(inArray(assessmentsTable.companyId, companyIds));
  return new Set(rows.map((row) => row.companyId));
}

// Every "discovery"/"build" job's targetId is a firm id (as text) — the only
// job types in the system today are both firm-scoped. Loads the single most
// recently created job (any status) per requested firm id in one query
// (not N+1), so list/detail admin views can always link to a firm's current
// job without an extra round trip per row.
async function getLatestJobsByFirmId(firmIds: number[]): Promise<Map<number, Job>> {
  if (firmIds.length === 0) return new Map();
  const targetIds = firmIds.map(String);
  const rows = await db
    .select()
    .from(jobsTable)
    .where(inArray(jobsTable.targetId, targetIds))
    .orderBy(desc(jobsTable.createdAt));

  const latestByFirmId = new Map<number, Job>();
  for (const row of rows) {
    const firmId = Number(row.targetId);
    if (!latestByFirmId.has(firmId)) {
      latestByFirmId.set(firmId, toJobResponse(row));
    }
  }
  return latestByFirmId;
}

// Internal admin firms index: every firm with its current company count and
// its latest job (so the list can always link to a firm's current state —
// in-progress job vs. review screen — without a follow-up request).
router.get("/firms", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: firmsTable.id,
        name: firmsTable.name,
        website: firmsTable.website,
        slug: firmsTable.slug,
        status: firmsTable.status,
        createdAt: firmsTable.createdAt,
        companyCount: count(companiesTable.id),
      })
      .from(firmsTable)
      .leftJoin(companiesTable, eq(companiesTable.firmId, firmsTable.id))
      .groupBy(firmsTable.id)
      .orderBy(firmsTable.createdAt);

    const latestJobs = await getLatestJobsByFirmId(rows.map((row) => row.id));

    const response: AdminFirmSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      website: row.website,
      slug: row.slug,
      status: row.status,
      companyCount: Number(row.companyCount),
      latestJob: latestJobs.get(row.id) ?? null,
      createdAt: row.createdAt,
    }));

    res.json(response);
  } catch (err) {
    _req.log.error({ err }, "Failed to list admin firms");
    res.status(500).json({ error: "Failed to list firms" });
  }
});

// Landing step of the /admin firm-onboarding flow: creates a firm ("pending")
// and queues a stub discovery job for it.
router.post("/firms", async (req, res) => {
  const parsed = CreateAdminFirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, website } = parsed.data;

  try {
    const slug = await uniqueSlug(slugify(name));

    const [firm] = await db
      .insert(firmsTable)
      .values({ name, website, slug, status: "pending", createdByEmail: req.user?.email ?? null })
      .returning();

    if (!firm) {
      throw new Error("Firm insert returned no row");
    }

    const [job] = await db
      .insert(jobsTable)
      .values({
        type: "discovery",
        targetId: String(firm.id),
        status: "queued",
      })
      .returning();

    if (!job) {
      throw new Error("Job insert returned no row");
    }

    const response: CreateAdminFirmResponse = {
      firm: toFirmResponse(firm),
      job: toJobResponse(job),
    };

    res.status(201).json(response);

    // Fire-and-forget: the discovery job runs in the background (Claude web
    // search + DB writes take tens of seconds) while the HTTP response above
    // has already returned. Failures are caught and persisted onto the job
    // row itself, not thrown here.
    void runDiscoveryJob(job.id).catch((err) => {
      req.log.error({ err, jobId: job.id }, "Discovery job crashed outside its own error handling");
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create admin firm");
    res.status(500).json({ error: "Failed to create firm" });
  }
});

// Review-screen data: the firm plus every company on file for it (including
// ones already excluded from a prior confirm), so the checkbox list always
// reflects full history.
router.get("/firms/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid firm id" });
    return;
  }

  try {
    const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.id, id)).limit(1);
    if (!firm) {
      res.status(404).json({ error: "Firm not found" });
      return;
    }

    const companies = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.firmId, id))
      .orderBy(companiesTable.id);

    const assessed = await companiesWithAssessments(companies.map((c) => c.id));
    const latestJobs = await getLatestJobsByFirmId([id]);

    const response: AdminFirmDetail = {
      firm: toFirmResponse(firm),
      companies: companies.map((company) => toCompany(company, assessed.has(company.id))),
      latestJob: latestJobs.get(id) ?? null,
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to load admin firm");
    res.status(500).json({ error: "Failed to load firm" });
  }
});

// Adds a company to a firm under review. Newly added companies default to
// "active" so they show up pre-checked on the review screen.
router.post("/firms/:id/companies", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid firm id" });
    return;
  }

  const parsed = AddAdminFirmCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.id, id)).limit(1);
    if (!firm) {
      res.status(404).json({ error: "Firm not found" });
      return;
    }

    const { name, website } = parsed.data;
    const [company] = await db
      .insert(companiesTable)
      .values({ firmId: id, name, website, status: "active", slug: slugify(name) })
      .returning();

    if (!company) {
      throw new Error("Company insert returned no row");
    }

    res.status(201).json(toCompany(company, false));
  } catch (err) {
    req.log.error({ err }, "Failed to add company to admin firm");
    res.status(500).json({ error: "Failed to add company" });
  }
});

// Confirms the reviewed selection: checked companies -> "active", unchecked
// ones -> "excluded", firm -> "reviewed", plus a stub "build" job.
router.post("/firms/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid firm id" });
    return;
  }

  const parsed = ConfirmAdminFirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.id, id)).limit(1);
    if (!firm) {
      res.status(404).json({ error: "Firm not found" });
      return;
    }

    // Guard against duplicate build jobs: "Confirm & queue build" can be
    // clicked again for a firm that already has one in flight (double
    // click, or navigating back to an already-reviewed firm). The unique
    // partial index on jobs(type, target_id) for queued/running rows is the
    // hard backstop for a genuine race between two concurrent requests; this
    // check is what turns that race into a clean 409 instead of a 500 in the
    // common case.
    const [activeBuildJob] = await db
      .select()
      .from(jobsTable)
      .where(
        and(eq(jobsTable.type, "build"), eq(jobsTable.targetId, String(id)), inArray(jobsTable.status, ["queued", "running"]))
      )
      .orderBy(desc(jobsTable.createdAt))
      .limit(1);

    if (activeBuildJob) {
      res.status(409).json({
        error: "A build job for this firm is already in progress.",
        job: toJobResponse(activeBuildJob),
      });
      return;
    }

    const { companyIds } = parsed.data;

    if (companyIds.length > 0) {
      await db
        .update(companiesTable)
        .set({ status: "active" })
        .where(and(eq(companiesTable.firmId, id), inArray(companiesTable.id, companyIds)));
    }
    await db
      .update(companiesTable)
      .set({ status: "excluded" })
      .where(
        companyIds.length > 0
          ? and(eq(companiesTable.firmId, id), notInArray(companiesTable.id, companyIds))
          : eq(companiesTable.firmId, id)
      );

    const [updatedFirm] = await db
      .update(firmsTable)
      .set({ status: "reviewed" })
      .where(eq(firmsTable.id, id))
      .returning();

    if (!updatedFirm) {
      throw new Error("Firm update returned no row");
    }

    let job: typeof jobsTable.$inferSelect;
    try {
      const [inserted] = await db
        .insert(jobsTable)
        .values({
          type: "build",
          targetId: String(id),
          status: "queued",
        })
        .returning();

      if (!inserted) {
        throw new Error("Job insert returned no row");
      }
      job = inserted;
    } catch (err) {
      // Backstop for the rare race where two concurrent confirm requests
      // both pass the activeBuildJob check above before either inserts: the
      // partial unique index on jobs(type, target_id) rejects the second
      // insert, and we turn that into the same 409 shape instead of a 500.
      if ((err as { code?: string }).code === "23505") {
        const [active] = await db
          .select()
          .from(jobsTable)
          .where(
            and(eq(jobsTable.type, "build"), eq(jobsTable.targetId, String(id)), inArray(jobsTable.status, ["queued", "running"]))
          )
          .orderBy(desc(jobsTable.createdAt))
          .limit(1);
        res.status(409).json({
          error: "A build job for this firm is already in progress.",
          job: active ? toJobResponse(active) : null,
        });
        return;
      }
      throw err;
    }

    const response: AdminFirmConfirmResult = {
      firm: toFirmResponse(updatedFirm),
      job: toJobResponse(job),
    };

    res.json(response);

    // Fire-and-forget: the build job scores each active company via Claude
    // (tens of seconds each) and writes assessments while the HTTP response
    // above has already returned. Failures are caught and persisted onto the
    // job row itself, not thrown here.
    void runBuildJob(job.id, getOrigin(req)).catch((err) => {
      req.log.error({ err, jobId: job.id }, "Build job crashed outside its own error handling");
    });
  } catch (err) {
    req.log.error({ err }, "Failed to confirm admin firm");
    res.status(500).json({ error: "Failed to confirm firm" });
  }
});

// Serves the report-data.json export payload (Diagnostic Report runbook)
// for a company's latest assessment. `reportData` matches the Notion Step-7
// schema field-for-field. If a report_exports row already exists for this
// assessment (see POST .../report-export), its AI-generated narrative
// sections are served (`meta.generatedAt`/`model` non-null); otherwise the
// narrative fields fall back to their neutral placeholder ("" / []) per the
// schema's own designed fallback. This route NEVER calls Claude — it is
// read-only so it's safe for React Query to refetch without risking
// duplicate paid generation calls. `meta` carries admin-only
// provenance/derived fields and must never be copied into the exported JSON
// itself.
router.get("/companies/:id/report-data", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }

  try {
    const response = await getReportData(id);
    res.json(response);
  } catch (err) {
    if (err instanceof CompanyNotFoundError) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    if (err instanceof NoAssessmentError) {
      res.status(404).json({ error: "Company has no assessments yet" });
      return;
    }
    req.log.error({ err }, "Failed to assemble company report data");
    res.status(500).json({ error: "Failed to assemble report data" });
  }
});

// Generates (via Claude, grounded in the Notion scoring rubric) or returns
// the already-cached AI-written narrative sections of the report: execSummary,
// compositeContext, existingSystems, pathForward, pillarSignals, each gap's
// impact/recommendation, and nextSteps. Idempotent per (assessment, rubric
// version) — see reportExport.ts.
router.post("/companies/:id/report-export", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }

  try {
    const response = await getOrGenerateReportExport(id);
    res.json(response);
  } catch (err) {
    if (err instanceof CompanyNotFoundError) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    if (err instanceof NoAssessmentError) {
      res.status(404).json({ error: "Company has no assessments yet" });
      return;
    }
    req.log.error({ err, companyId: id }, "Failed to generate report export");
    res.status(502).json({ error: "Failed to generate report export" });
  }
});

// One-time (idempotent) production data-repair endpoint: seeds the 5 legacy
// demo tenants (stg/pamlico/raviga/longarc/solen) if any are missing from
// `firms`. Auth is enforced by the router-level `requireAdminAuth` above.
router.post("/seed-legacy-tenants", async (req, res) => {
  try {
    const results = await seedLegacyTenants();
    const response: SeedLegacyTenantsResult = { results };
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to seed legacy tenants");
    res.status(500).json({ error: "Failed to seed legacy tenants" });
  }
});

export default router;
