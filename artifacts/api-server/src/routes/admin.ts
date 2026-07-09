import { Router, type IRouter } from "express";
import { and, count, desc, eq, inArray, like, notInArray } from "drizzle-orm";
import { db, assessmentsTable, companiesTable, firmsTable, jobsTable } from "@workspace/db";
import { AddAdminFirmCompanyBody, ConfirmAdminFirmBody, CreateAdminFirmBody } from "@workspace/api-zod";
import type {
  AdminCompanyReportData,
  AdminFirmConfirmResult,
  AdminFirmDetail,
  AdminFirmSummary,
  Company,
  CreateAdminFirmResponse,
} from "@workspace/api-zod";
import { PILLARS, getTier, textToScore } from "@workspace/portfolio-engine";
import { runDiscoveryJob } from "../lib/jobs/discovery.js";

const router: IRouter = Router();

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

async function companiesWithAssessments(companyIds: number[]): Promise<Set<number>> {
  if (companyIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ companyId: assessmentsTable.companyId })
    .from(assessmentsTable)
    .where(inArray(assessmentsTable.companyId, companyIds));
  return new Set(rows.map((row) => row.companyId));
}

// Internal admin firms index: every firm with its current company count.
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

    const response: AdminFirmSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      website: row.website,
      slug: row.slug,
      status: row.status,
      companyCount: Number(row.companyCount),
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
      .values({ name, website, slug, status: "pending" })
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
      firm: {
        id: firm.id,
        name: firm.name,
        website: firm.website,
        slug: firm.slug,
        status: firm.status,
        createdAt: firm.createdAt,
      },
      job: {
        id: job.id,
        type: job.type,
        targetId: job.targetId,
        status: job.status,
        progressPct: job.progressPct,
        etaSeconds: job.etaSeconds,
        error: job.error,
      },
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

    const response: AdminFirmDetail = {
      firm: {
        id: firm.id,
        name: firm.name,
        website: firm.website,
        slug: firm.slug,
        status: firm.status,
        createdAt: firm.createdAt,
      },
      companies: companies.map((company) => toCompany(company, assessed.has(company.id))),
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

    const [job] = await db
      .insert(jobsTable)
      .values({
        type: "build",
        targetId: String(id),
        status: "queued",
      })
      .returning();

    if (!job) {
      throw new Error("Job insert returned no row");
    }

    const response: AdminFirmConfirmResult = {
      firm: {
        id: updatedFirm.id,
        name: updatedFirm.name,
        website: updatedFirm.website,
        slug: updatedFirm.slug,
        status: updatedFirm.status,
        createdAt: updatedFirm.createdAt,
      },
      job: {
        id: job.id,
        type: job.type,
        targetId: job.targetId,
        status: job.status,
        progressPct: job.progressPct,
        etaSeconds: job.etaSeconds,
        error: job.error,
      },
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to confirm admin firm");
    res.status(500).json({ error: "Failed to confirm firm" });
  }
});

// Assembles the report-data.json export payload (Diagnostic Report runbook)
// from a company's latest assessment: raw p1-p8 scores plus derived
// composite/tier. Narrative fields (execSummary, gaps, nextSteps) are left
// empty — those come from Claude's research, not this endpoint.
router.get("/companies/:id/report-data", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }

  try {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.id, company.firmId)).limit(1);
    if (!firm) {
      throw new Error(`Company ${id} references missing firm ${company.firmId}`);
    }

    const [assessment] = await db
      .select()
      .from(assessmentsTable)
      .where(eq(assessmentsTable.companyId, id))
      .orderBy(desc(assessmentsTable.date))
      .limit(1);

    if (!assessment) {
      res.status(404).json({ error: "Company has no assessments yet" });
      return;
    }

    const scores = {
      p1: assessment.p1,
      p2: assessment.p2,
      p3: assessment.p3,
      p4: assessment.p4,
      p5: assessment.p5,
      p6: assessment.p6,
      p7: assessment.p7,
      p8: assessment.p8,
    };

    const pillarScores = Object.fromEntries(
      PILLARS.map((pillar, index) => {
        const key = `p${index + 1}` as keyof typeof scores;
        return [pillar.id, textToScore(scores[key])];
      })
    );

    const scoredPillars = PILLARS.filter((p) => pillarScores[p.id] !== null);
    const composite = scoredPillars.reduce((sum, p) => sum + (pillarScores[p.id] as number), 0);
    const compositeMax = scoredPillars.length * 2;
    const tierComposite = PILLARS.reduce((sum, p) => {
      const s = pillarScores[p.id];
      return sum + (s === null ? 1 : s);
    }, 0);
    const tier = getTier(tierComposite);

    const response: AdminCompanyReportData = {
      companyId: company.id,
      companyName: company.name,
      parentFund: firm.name,
      preparedForName: "",
      preparedForTitle: "",
      reportDate: new Date().toISOString().slice(0, 10),
      assessmentDate: assessment.date,
      scores: {
        p1: scores.p1 ?? "NA",
        p2: scores.p2 ?? "NA",
        p3: scores.p3 ?? "NA",
        p4: scores.p4 ?? "NA",
        p5: scores.p5 ?? "NA",
        p6: scores.p6 ?? "NA",
        p7: scores.p7 ?? "NA",
        p8: scores.p8 ?? "NA",
      },
      composite,
      compositeMax,
      tier: `Tier ${tier.id} · ${tier.label}`,
      execSummary: "",
      gaps: [],
      nextSteps: "",
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to assemble company report data");
    res.status(500).json({ error: "Failed to assemble report data" });
  }
});

export default router;
