import { and, eq, inArray } from "drizzle-orm";
import { db, assessmentsTable, companiesTable, firmsTable, jobsTable, type Company, type Firm } from "@workspace/db";
import {
  PILLARS,
  scoreToText,
  getTier,
  type CompanyMeta,
  type FirmMeta,
} from "@workspace/portfolio-engine";
import { logger } from "../logger.js";
import { writeDiagnosticToNotion } from "../notion.js";
import { scoreCompanyPillars, type CompanyProfile, type PillarResult } from "./scoring.js";
import { claimJob, createJobTicker } from "./common.js";
import { sendBuildCompleteEmail } from "../email.js";
import { invalidatePortfolioCache } from "../portfolioData.js";

const PER_COMPANY_TARGET_MS = 90_000;

// Default portal metadata for a pipeline-built firm. Every AI-onboarded firm
// is an internal preview until a human clears it for external distribution —
// this mirrors the stance of the hand-authored internal tenants and is only
// applied when the firm has no meta yet (a re-run never overwrites it).
const DEFAULT_PIPELINE_FIRM_META: FirmMeta = {
  statusLabel: "Internal preview — not cleared for external distribution",
  internalOnly: true,
};

// Builds the CompanyMeta (the companies.meta jsonb the portfolio engine reads)
// from the researched profile plus values DERIVED from the pillar scores, so a
// pipeline company renders on the tenant portal exactly like a hand-authored
// one. Nothing here is fabricated: descriptive fields come from the profile
// (with their own sentinels), engagement/invesqSignal come from the computed
// tier, and confidence is a deterministic function of how many pillars came
// back "Insufficient Data".
function buildCompanyMeta(
  company: Company,
  pillarResults: Record<string, PillarResult>,
  profile: CompanyProfile,
): CompanyMeta {
  // Tier composite substitutes NA -> 1, exactly like the rest of the app.
  const tierComposite = PILLARS.reduce((sum, pillar) => {
    const score = pillarResults[pillar.id]!.score;
    return sum + (score === "Insufficient Data" ? 1 : score);
  }, 0);
  const tier = getTier(tierComposite);

  const naCount = PILLARS.filter((p) => pillarResults[p.id]!.score === "Insufficient Data").length;
  const confidence: CompanyMeta["confidence"] = naCount <= 1 ? "High" : naCount <= 3 ? "Medium" : "Low";

  return {
    sector: profile.sector,
    hq: profile.hq,
    employeesDisplay: profile.employeesDisplay,
    arrDisplay: profile.arrDisplay,
    arrForRollup: profile.arrForRollup,
    confidence,
    engagement: tier.engagement,
    invesqSignal: tier.invesqSignal,
    summary:
      profile.summary ||
      `Operational Customer Success diagnostic for ${company.name}, generated from public signals.`,
  };
}

export interface CompanyScoreOutcome {
  companyId: number;
  companyName: string;
  pillarResults: Record<string, PillarResult>;
  notion: { attempted: boolean; success: boolean; reason?: string };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function scoreAndPersistCompany(company: Company, firm: Firm): Promise<CompanyScoreOutcome> {
  const { pillarResults, profile } = await scoreCompanyPillars(
    { name: company.name, website: company.website },
    { name: firm.name, website: firm.website },
  );

  const assessmentDate = todayIso();
  const assessmentValues: Record<string, string | null | number> = {
    companyId: company.id,
    date: assessmentDate,
  };
  PILLARS.forEach((pillar, i) => {
    const n = i + 1;
    const result = pillarResults[pillar.id];
    assessmentValues[`p${n}`] = scoreToText(result.score === "Insufficient Data" ? null : result.score);
    assessmentValues[`p${n}Evidence`] = result.evidence;
  });

  // Postgres is the source of truth — this write must succeed for the
  // company's scoring to count as done, regardless of what happens with Notion.
  await db.insert(assessmentsTable).values(assessmentValues as never);

  // Populate the descriptive companies.meta the tenant-portal engine reads, so
  // this company renders through the exact same components as a hand-authored
  // one. The discovery-time meta (e.g. discoveryRationale) is preserved by
  // merging the new CompanyMeta on top of whatever is already there. On a
  // re-run this refreshes the descriptive fields to match the newest research
  // while the assessment history keeps accumulating (append-only above).
  const companyMeta = buildCompanyMeta(company, pillarResults, profile);
  const existingMeta = (company.meta as Record<string, unknown> | null) ?? {};
  await db
    .update(companiesTable)
    .set({ meta: { ...existingMeta, ...companyMeta } })
    .where(eq(companiesTable.id, company.id));

  const notion = await writeDiagnosticToNotion({
    companyName: company.name,
    companyWebsite: company.website,
    firmName: firm.name,
    assessmentDate,
    pillarResults,
  });

  if (!notion.success) {
    logger.warn(
      { companyId: company.id, companyName: company.name, reason: notion.reason },
      "Notion write did not succeed for this company (Postgres assessment was still written)",
    );
  }

  return { companyId: company.id, companyName: company.name, pillarResults, notion };
}

// Runs a queued/running "build" job end to end: for every active company
// under the job's firm, scores all 8 pillars via Claude, writes the
// assessment row to Postgres (source of truth), best-effort mirrors it to
// Notion, and updates job progress. Marks the job completed + firm "ready"
// only if every active company was scored successfully, and (best-effort)
// emails the firm's creator once it does. Safe to call multiple times for
// the same job id — it no-ops if already finished.
//
// `originHint` is the public origin (e.g. "https://foo.replit.dev") to build
// the completion email's link to the firm's admin review page. It's only
// available when the job is kicked off from an HTTP request (the confirm
// route); startup-resumed jobs have no request to read it from, so
// `sendBuildCompleteEmail` falls back to the REPLIT_DOMAINS env var.
export async function runBuildJob(
  jobId: number,
  originHint?: string,
  opts: { allowReclaimRunning?: boolean } = {}
): Promise<void> {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) {
    logger.error({ jobId }, "runBuildJob: job not found");
    return;
  }
  if (job.type !== "build") {
    logger.error({ jobId, type: job.type }, "runBuildJob: job is not a build job");
    return;
  }
  if (job.status === "completed" || job.status === "failed") {
    logger.info({ jobId, status: job.status }, "runBuildJob: job already finished, skipping");
    return;
  }

  const claimed = await claimJob(jobId, "build", opts);
  if (!claimed) {
    logger.info({ jobId }, "runBuildJob: job already running elsewhere, skipping duplicate run");
    return;
  }

  const firmId = Number(job.targetId);
  if (!Number.isInteger(firmId) || firmId <= 0) {
    await db
      .update(jobsTable)
      .set({ status: "failed", error: `Invalid firm id in job targetId: "${job.targetId}"`, completedAt: new Date() })
      .where(eq(jobsTable.id, jobId));
    return;
  }

  const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.id, firmId)).limit(1);
  if (!firm) {
    await db
      .update(jobsTable)
      .set({ status: "failed", error: `Firm ${firmId} not found`, completedAt: new Date() })
      .where(eq(jobsTable.id, jobId));
    return;
  }

  const activeCompanies = await db
    .select()
    .from(companiesTable)
    .where(and(eq(companiesTable.firmId, firmId), eq(companiesTable.status, "active")));

  if (activeCompanies.length === 0) {
    await db
      .update(jobsTable)
      .set({ status: "failed", error: "No active companies to score for this firm", completedAt: new Date() })
      .where(eq(jobsTable.id, jobId));
    return;
  }

  const totalMs = activeCompanies.length * PER_COMPANY_TARGET_MS;
  const ticker = createJobTicker(jobId, totalMs);
  await db
    .update(jobsTable)
    .set({ status: "running", progressPct: 2, etaSeconds: ticker.etaSeconds(), error: null })
    .where(eq(jobsTable.id, jobId));

  const outcomes: CompanyScoreOutcome[] = [];
  const perCompanySlice = Math.floor(90 / activeCompanies.length);

  try {
    for (let i = 0; i < activeCompanies.length; i++) {
      const company = activeCompanies[i]!;
      const floor = 2 + i * perCompanySlice;
      const cap = i === activeCompanies.length - 1 ? 95 : floor + perCompanySlice;
      const stopProgress = ticker.tick(PER_COMPANY_TARGET_MS, cap, floor);

      try {
        const outcome = await scoreAndPersistCompany(company, firm);
        outcomes.push(outcome);
        logger.info(
          { jobId, companyId: company.id, companyName: company.name, notionSuccess: outcome.notion.success },
          "Build job: company scored and persisted",
        );
      } finally {
        stopProgress();
      }

      await db.update(jobsTable).set({ progressPct: cap, etaSeconds: ticker.etaSeconds() }).where(eq(jobsTable.id, jobId));
    }

    await db
      .update(jobsTable)
      .set({ status: "completed", progressPct: 100, etaSeconds: 0, completedAt: new Date(), error: null })
      .where(eq(jobsTable.id, jobId));

    // Mark the firm ready and, only if it has no portal meta yet, stamp the
    // default "internal preview" meta so the bootstrap loader includes it as a
    // tenant portal. A re-run of an already-ready firm keeps its existing meta
    // (a human may have cleared it for external distribution).
    const existingFirmMeta = firm.meta as FirmMeta | null;
    await db
      .update(firmsTable)
      .set({
        status: "ready",
        ...(existingFirmMeta ? {} : { meta: DEFAULT_PIPELINE_FIRM_META }),
      })
      .where(eq(firmsTable.id, firmId));

    // The bootstrap payload is cached in-process once loaded; without this a
    // running server would keep serving the pre-build payload (missing this
    // firm / its refreshed company meta) until the next restart.
    invalidatePortfolioCache();

    const notionSuccessCount = outcomes.filter((o) => o.notion.success).length;
    logger.info(
      { jobId, firmId, companyCount: outcomes.length, notionSuccessCount },
      "Build job completed — firm marked ready",
    );

    if (firm.createdByEmail) {
      const emailResult = await sendBuildCompleteEmail({
        to: firm.createdByEmail,
        firmName: firm.name,
        firmId,
        companyCount: outcomes.length,
        originHint,
      });
      logger.info({ jobId, firmId, to: firm.createdByEmail, ...emailResult }, "Build-complete email attempted");
    } else {
      logger.info({ jobId, firmId }, "Build job completed — no createdByEmail on firm, skipping notification email");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, jobId, firmId, scoredSoFar: outcomes.map((o) => o.companyName) }, "Build job failed");
    await db
      .update(jobsTable)
      .set({
        status: "failed",
        etaSeconds: null,
        completedAt: new Date(),
        error: `${message.slice(0, 1800)} (scored before failure: ${outcomes.map((o) => o.companyName).join(", ") || "none"})`,
      })
      .where(eq(jobsTable.id, jobId));
  }
}

// Startup safety net: if the server restarted while a build job was queued
// or mid-flight, resume it instead of leaving it stuck forever.
export async function resumeQueuedBuildJobs(): Promise<void> {
  try {
    const pending = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.type, "build"), inArray(jobsTable.status, ["queued", "running"])));

    for (const job of pending) {
      logger.info({ jobId: job.id }, "Resuming build job from startup scan");
      void runBuildJob(job.id, undefined, { allowReclaimRunning: true }).catch((err) =>
        logger.error({ err, jobId: job.id }, "Resumed build job crashed"),
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to scan for queued build jobs at startup");
  }
}
