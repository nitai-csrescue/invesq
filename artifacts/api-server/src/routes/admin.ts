import { Router, type IRouter } from "express";
import { and, count, desc, eq, inArray, like, notInArray } from "drizzle-orm";
import { db, assessmentsTable, companiesTable, firmsTable, jobsTable } from "@workspace/db";
import {
  AddAdminFirmCompanyBody,
  ConfirmAdminFirmBody,
  CreateAdminFirmBody,
  UpdateAdminFirmBody,
} from "@workspace/api-zod";
import type {
  AdminFirmConfirmResult,
  AdminFirmDetail,
  AdminFirmSummary,
  BackfillPipelineMetaFirm,
  BackfillPipelineMetaResult,
  Company,
  CreateAdminFirmResponse,
  Firm,
  Job,
  SeedLegacyTenantsResult,
} from "@workspace/api-zod";
import { LEGACY_FIRMS_META } from "@workspace/portfolio-engine/data";
import type { FirmMeta } from "@workspace/portfolio-engine";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
import { runDiscoveryJob } from "../lib/jobs/discovery.js";
import { runBuildJob } from "../lib/jobs/build.js";
import { getOrigin } from "../lib/http.js";
import { seedLegacyTenants } from "../lib/seedLegacyTenants.js";
import { invalidatePortfolioCache } from "../lib/portfolioData.js";
import { requireAdminAuth } from "../middlewares/authMiddleware.js";
import {
  getReportData,
  getOrGenerateReportExport,
  getCompanyWebsite,
  getFirmDistribution,
  CompanyNotFoundError,
  NoAssessmentError,
} from "../lib/reportExport.js";
import { buildReportPdfHtml } from "../lib/pdf/reportHtml.js";
import { renderHtmlToPdf } from "../lib/pdf/renderPdf.js";

const router: IRouter = Router();

// Every /admin/* route is internal-only and must reject unauthenticated /
// non-allowlisted requests server-side. The /admin frontend page is also
// gated client-side, but that alone does not protect these API routes from
// being called directly.
router.use(requireAdminAuth);

// The 5 hand-authored tenant slugs. They are not pipeline-managed, so the
// on-demand re-run endpoint refuses to touch them (a rebuild would append a
// Claude-scored assessment onto curated demo data).
const LEGACY_SLUGS = new Set<string>(LEGACY_FIRMS_META.map((f) => f.slug));

// Default portal metadata for a pipeline-built firm — kept in sync with the
// identical constant in lib/jobs/build.ts so the repair endpoint stamps the
// same "internal preview" default the build job would have.
const DEFAULT_PIPELINE_FIRM_META: FirmMeta = {
  statusLabel: "Internal preview — not cleared for external distribution",
  internalOnly: true,
};

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
    dataAuthority: row.dataAuthority,
    meta: (row.meta as FirmMeta | null) ?? null,
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
        dataAuthority: firmsTable.dataAuthority,
        meta: firmsTable.meta,
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
      dataAuthority: row.dataAuthority,
      meta: (row.meta as FirmMeta | null) ?? null,
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

// Admin toggle: promote dataAuthority and/or update portal meta
// (statusLabel, internalOnly, requireLogin). Only provided keys change; `meta`
// replaces the whole portal-metadata object. Invalidates the server-side
// bootstrap cache so meta/requireLogin changes reach tenant pages immediately.
router.patch("/firms/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid firm id" });
    return;
  }

  const parsed = UpdateAdminFirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { dataAuthority, meta } = parsed.data;
  if (dataAuthority === undefined && meta === undefined) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const updates: Partial<typeof firmsTable.$inferInsert> = {};
  if (dataAuthority !== undefined) updates.dataAuthority = dataAuthority;
  if (meta !== undefined) updates.meta = meta;

  try {
    const [updated] = await db
      .update(firmsTable)
      .set(updates)
      .where(eq(firmsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Firm not found" });
      return;
    }

    // meta (statusLabel/internalOnly/requireLogin) rides the public bootstrap,
    // which is cached server-side — force the next load to re-read from the DB.
    invalidatePortfolioCache();

    res.json(toFirmResponse(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update admin firm");
    res.status(500).json({ error: "Failed to update firm" });
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
      .values({ firmId: id, name, website, status: "active", slug: slugify(name), normalizedName: normalizeCompanyName(name) })
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

// On-demand re-run for an already-onboarded firm. Queues a fresh build job
// that re-scores every currently-active company; because scoreAndPersistCompany
// INSERTS a new assessment row (never updates), each re-run APPENDS to the
// assessment history rather than overwriting it. Refuses the 5 hand-authored
// legacy tenants (they aren't pipeline-managed). Shares the confirm route's
// duplicate-job guard so concurrent/re-clicked runs return a clean 409 rather
// than stacking builds. Fire-and-forget, exactly like confirm.
router.post("/firms/:id/refresh", async (req, res) => {
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

    if (LEGACY_SLUGS.has(firm.slug)) {
      res.status(400).json({
        error: "This is a hand-authored tenant and cannot be re-run by the onboarding pipeline.",
      });
      return;
    }

    const activeCount = await db
      .select({ value: count() })
      .from(companiesTable)
      .where(and(eq(companiesTable.firmId, id), eq(companiesTable.status, "active")));
    if ((activeCount[0]?.value ?? 0) === 0) {
      res.status(404).json({ error: "Firm has no active companies to re-score" });
      return;
    }

    // Same duplicate-job guard as confirm: one build in flight per firm.
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

    let job: typeof jobsTable.$inferSelect;
    try {
      const [inserted] = await db
        .insert(jobsTable)
        .values({ type: "build", targetId: String(id), status: "queued" })
        .returning();
      if (!inserted) {
        throw new Error("Job insert returned no row");
      }
      job = inserted;
    } catch (err) {
      // Partial unique index on jobs(type, target_id) for queued/running rows
      // turns a genuine concurrent-insert race into the same clean 409.
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
      firm: toFirmResponse(firm),
      job: toJobResponse(job),
    };

    res.json(response);

    // Fire-and-forget, same as confirm — the build runs in the background and
    // persists its own status/progress/error onto the job row.
    void runBuildJob(job.id, getOrigin(req)).catch((err) => {
      req.log.error({ err, jobId: job.id }, "Refresh build job crashed outside its own error handling");
    });
  } catch (err) {
    req.log.error({ err, firmId: id }, "Failed to refresh admin firm");
    res.status(500).json({ error: "Failed to refresh firm" });
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

// Renders the branded INVESQ Diagnostic Report PDF (7-page print template, see
// lib/pdf/) for a company's latest assessment. Read-only — reuses the same
// cache-only `getReportData` as the JSON export route, so it never calls Claude
// and is safe to hit repeatedly. Requires a previously generated narrative
// (meta.generatedAt) since the PDF's narrative sections (exec summary,
// composite context, next steps, etc.) would otherwise render as designed-blank
// placeholders — 409 tells the admin to generate first. Admins may export a
// company at ANY time; the chrome is stamped "INTERNAL — NOT FOR DISTRIBUTION"
// unless the firm is sendable (not internal-only).
router.get("/companies/:id/report-pdf", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }

  try {
    const [data, website, distribution] = await Promise.all([
      getReportData(id),
      getCompanyWebsite(id),
      getFirmDistribution(id),
    ]);

    if (!data.meta.generatedAt) {
      res.status(409).json({ error: "Report narrative has not been generated yet for this assessment" });
      return;
    }

    const html = buildReportPdfHtml(data, website, distribution.sendable);
    const pdf = await renderHtmlToPdf(html);

    const safeCompanyName = data.reportData.companyName.replace(/[\\/:*?"<>|]/g, "").trim();
    const filename = distribution.sendable
      ? `${safeCompanyName} - INVESQ Diagnostic Report.pdf`
      : `${safeCompanyName} - INVESQ Diagnostic (Internal).pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    if (err instanceof CompanyNotFoundError) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    if (err instanceof NoAssessmentError) {
      res.status(404).json({ error: "Company has no assessments yet" });
      return;
    }
    req.log.error({ err, companyId: id }, "Failed to render report PDF");
    res.status(500).json({ error: "Failed to render report PDF" });
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

// Idempotent production data-repair for pipeline-onboarded (non-legacy) firms
// that predate the build job's portal-meta / de-dup behaviour. It (1) stamps
// the default "internal preview" firms.meta on any non-legacy firm that is
// already "ready" but has no meta yet, and (2) unifies duplicate companies
// within a firm (same normalized name) by keeping the lowest-id active row and
// marking the others "excluded" — never a delete. The 5 hand-authored legacy
// tenants are skipped entirely. Auth is enforced by router-level requireAdminAuth.
router.post("/backfill-pipeline-meta", async (req, res) => {
  try {
    const allFirms = await db.select().from(firmsTable);
    const perFirm: BackfillPipelineMetaFirm[] = [];
    let firmsMetaStamped = 0;
    let duplicatesExcluded = 0;

    for (const firm of allFirms) {
      if (LEGACY_SLUGS.has(firm.slug)) continue;

      let metaStamped = false;
      if (firm.status === "ready" && firm.meta == null) {
        await db.update(firmsTable).set({ meta: DEFAULT_PIPELINE_FIRM_META }).where(eq(firmsTable.id, firm.id));
        metaStamped = true;
        firmsMetaStamped++;
      }

      // Unify duplicate active companies by normalized name, keeping lowest id.
      const activeCompanies = await db
        .select()
        .from(companiesTable)
        .where(and(eq(companiesTable.firmId, firm.id), eq(companiesTable.status, "active")))
        .orderBy(companiesTable.id);

      const seen = new Set<string>();
      const dupeIds: number[] = [];
      for (const c of activeCompanies) {
        const key = slugify(c.name);
        if (seen.has(key)) {
          dupeIds.push(c.id);
        } else {
          seen.add(key);
        }
      }

      if (dupeIds.length > 0) {
        await db
          .update(companiesTable)
          .set({ status: "excluded" })
          .where(and(eq(companiesTable.firmId, firm.id), inArray(companiesTable.id, dupeIds)));
        duplicatesExcluded += dupeIds.length;
      }

      if (metaStamped || dupeIds.length > 0) {
        perFirm.push({
          id: firm.id,
          slug: firm.slug,
          metaStamped,
          duplicatesExcluded: dupeIds.length,
        });
      }
    }

    // Only bother invalidating the bootstrap cache if anything actually changed.
    if (firmsMetaStamped > 0 || duplicatesExcluded > 0) {
      invalidatePortfolioCache();
    }

    const response: BackfillPipelineMetaResult = { firmsMetaStamped, duplicatesExcluded, firms: perFirm };
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to backfill pipeline meta");
    res.status(500).json({ error: "Failed to backfill pipeline meta" });
  }
});

export default router;
