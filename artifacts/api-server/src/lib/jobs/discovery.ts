import { and, eq, inArray } from "drizzle-orm";
import { db, companiesTable, firmsTable, jobsTable, type Firm } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
import { getAnthropicClient, extractText, extractJsonFence } from "../anthropic.js";
import { logger } from "../logger.js";
import { claimJob, createJobTicker } from "./common.js";

const DISCOVERY_MODEL = "claude-sonnet-4-6";

interface Candidate {
  name: string;
  website: string | null;
  rationale: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "company";
}

function buildSystemPrompt(): string {
  return [
    "You are conducting portfolio company discovery for INVESQ, an operational due-diligence platform for PE/VC firms.",
    "Given a firm's name and website, use the web_search tool to research its CURRENT, ACTUAL portfolio companies.",
    "Identify 2 to 3 candidate portfolio companies that are the strongest fit for an 8-pillar Customer Success operational diagnostic.",
    "A strong candidate is a B2B SaaS or software company with a recurring-revenue (subscription) model, large enough to plausibly have (or need) a dedicated Customer Success function.",
    "Exclude non-software holdings (retail, industrials, real estate, consumer products, services-only, hardware-only businesses) and pre-revenue or too-early companies.",
    "Only include companies you can verify via web search as real, current holdings of this specific firm. Never invent, assume, or guess a company name — if you are not confident a company is an actual current portfolio holding, leave it out entirely.",
    "If fewer than 2 verified qualifying companies exist, return only the ones you actually verified — it is acceptable to return 1, or even 0 if truly none qualify. Do not pad the list with unverified guesses.",
    "",
    "Respond with ONLY a single fenced ```json code block containing a JSON array (no prose before or after it, no other text). Each array element must be an object with exactly these keys:",
    '- "name": string, the company\'s name',
    '- "website": string (the company\'s website URL) or null if you could not find one',
    '- "rationale": string, 1-2 sentences on why this is a strong ICP fit, citing what you found via search',
  ].join("\n");
}

function isCandidate(value: unknown): value is Candidate {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const nameOk = typeof record.name === "string" && record.name.trim().length > 0;
  const websiteOk =
    record.website === null || record.website === undefined || (typeof record.website === "string" && record.website.trim().length > 0);
  const rationaleOk = typeof record.rationale === "string" && record.rationale.trim().length > 0;
  return nameOk && websiteOk && rationaleOk;
}

function extractCandidates(text: string): Candidate[] {
  const raw = extractJsonFence(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Claude response was not valid JSON (${(err as Error).message}). Raw text: ${text.slice(0, 500)}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Claude response JSON was not an array. Raw text: ${text.slice(0, 500)}`);
  }

  const candidates = parsed.filter(isCandidate).map((c) => ({
    name: c.name.trim(),
    website: c.website ? c.website.trim() : null,
    rationale: c.rationale.trim(),
  }));

  if (candidates.length !== parsed.length) {
    logger.warn(
      { total: parsed.length, valid: candidates.length },
      "Discovery job: some Claude candidate entries were malformed and were dropped",
    );
  }

  return candidates.slice(0, 5);
}

async function discoverCandidates(firm: Pick<Firm, "name" | "website">): Promise<Candidate[]> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const message = await client.messages.create({
    model: DISCOVERY_MODEL,
    max_tokens: 8192,
    system: buildSystemPrompt(),
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    messages: [
      {
        role: "user",
        content: `Firm name: ${firm.name}\nFirm website: ${firm.website ?? "unknown"}\n\nResearch this firm's current portfolio and identify the best 2-3 candidate companies as instructed.`,
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude response was truncated (hit max_tokens) before completing candidate discovery");
  }

  const text = extractText(message);
  if (!text.trim()) {
    throw new Error("Claude returned no text content");
  }

  return extractCandidates(text);
}

// Runs a queued/running "discovery" job end to end: calls Claude (with web
// search) to find real candidate portfolio companies for the job's firm,
// writes them as `companies` rows with status "candidate", and marks the job
// completed/failed. Safe to call multiple times for the same job id — it
// no-ops if the job is already finished.
export async function runDiscoveryJob(jobId: number, opts: { allowReclaimRunning?: boolean } = {}): Promise<void> {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) {
    logger.error({ jobId }, "runDiscoveryJob: job not found");
    return;
  }
  if (job.type !== "discovery") {
    logger.error({ jobId, type: job.type }, "runDiscoveryJob: job is not a discovery job");
    return;
  }
  if (job.status === "completed" || job.status === "failed") {
    logger.info({ jobId, status: job.status }, "runDiscoveryJob: job already finished, skipping");
    return;
  }

  const claimed = await claimJob(jobId, "discovery", opts);
  if (!claimed) {
    logger.info({ jobId }, "runDiscoveryJob: job already running elsewhere, skipping duplicate run");
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

  const DISCOVERY_TARGET_MS = 45_000;
  const ticker = createJobTicker(jobId, DISCOVERY_TARGET_MS);
  await db
    .update(jobsTable)
    .set({ status: "running", progressPct: 5, etaSeconds: ticker.etaSeconds(), error: null })
    .where(eq(jobsTable.id, jobId));
  const stopProgress = ticker.tick(DISCOVERY_TARGET_MS, 90, 5);

  try {
    const candidates = await discoverCandidates(firm);
    stopProgress();

    // Dedup guard against companies_firm_normalized_name_active_uq — a partial
    // unique index over NON-excluded rows (WHERE status <> 'excluded', i.e.
    // active + candidate). A candidate whose normalizedName already belongs to
    // a non-excluded company in this firm would hard-fail the batch insert, so
    // skip it (and any intra-batch duplicate) instead. Every inserted row now
    // stamps normalizedName so the index actually protects future inserts.
    const existingCompanies = await db
      .select({ status: companiesTable.status, normalizedName: companiesTable.normalizedName })
      .from(companiesTable)
      .where(eq(companiesTable.firmId, firmId));
    const takenNormalized = new Set(
      existingCompanies
        .filter((c) => c.status !== "excluded" && c.normalizedName != null)
        .map((c) => c.normalizedName as string),
    );

    const toInsert: (typeof companiesTable.$inferInsert)[] = [];
    for (const c of candidates) {
      const normalizedName = normalizeCompanyName(c.name);
      if (takenNormalized.has(normalizedName)) {
        logger.info(
          { firmId, candidate: c.name, normalizedName },
          "Discovery job: skipping candidate — a non-excluded company with the same normalized name already exists in this firm",
        );
        continue;
      }
      takenNormalized.add(normalizedName);
      toInsert.push({
        firmId,
        name: c.name,
        website: c.website,
        status: "candidate",
        slug: slugify(c.name),
        normalizedName,
        meta: { discoveryRationale: c.rationale },
      });
    }

    if (toInsert.length > 0) {
      await db.insert(companiesTable).values(toInsert);
    }

    await db
      .update(jobsTable)
      .set({ status: "completed", progressPct: 100, etaSeconds: 0, completedAt: new Date(), error: null })
      .where(eq(jobsTable.id, jobId));

    logger.info({ jobId, firmId, candidateCount: candidates.length }, "Discovery job completed");
  } catch (err) {
    stopProgress();
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, jobId, firmId }, "Discovery job failed");
    await db
      .update(jobsTable)
      .set({ status: "failed", etaSeconds: null, completedAt: new Date(), error: message.slice(0, 2000) })
      .where(eq(jobsTable.id, jobId));
  }
}

// Startup safety net: if the server restarted while a discovery job was
// queued or mid-flight, resume it instead of leaving it stuck forever.
export async function resumeQueuedDiscoveryJobs(): Promise<void> {
  try {
    const pending = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.type, "discovery"), inArray(jobsTable.status, ["queued", "running"])));

    for (const job of pending) {
      logger.info({ jobId: job.id }, "Resuming discovery job from startup scan");
      void runDiscoveryJob(job.id, { allowReclaimRunning: true }).catch((err) =>
        logger.error({ err, jobId: job.id }, "Resumed discovery job crashed"),
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to scan for queued discovery jobs at startup");
  }
}
