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

// ---------------------------------------------------------------------------
// First-pass system prompt — multi-source, explicitly handles image portfolios
// ---------------------------------------------------------------------------
function buildSystemPrompt(): string {
  return [
    "You are conducting portfolio company discovery for INVESQ, an operational due-diligence platform for PE/VC firms.",
    "Given a firm's name and website, identify its CURRENT, ACTUAL portfolio companies.",
    "",
    "CRITICAL: Many PE/VC firms display their portfolio as logo images — the company names are visible on screen but completely unreadable as text. Do NOT rely on the firm's own website text alone. You MUST cross-reference multiple independent sources using all of these strategies:",
    "  1. Search '[firm name] portfolio companies' and '[firm name] current investments'",
    "  2. Search '[firm name] portfolio site:crunchbase.com' and '[firm name] investments site:pitchbook.com'",
    "  3. Search recent news: '[firm name] invests in', '[firm name] acquires', '[firm name] leads round', '[firm name] backs [year]'",
    "  4. Search '[firm name] press release' or '[firm name] news' for deal announcements",
    "  5. Search LinkedIn: '[firm name] portfolio company' or look for companies that list the firm as an investor on their own websites",
    "If the firm's own website only shows logos or images with no readable company names, pivot immediately to the news and database searches above.",
    "",
    "Identify 2 to 3 candidate portfolio companies that are the strongest fit for an 8-pillar Customer Success operational diagnostic.",
    "A strong candidate is a B2B SaaS or software company with a recurring-revenue (subscription) model, large enough to plausibly have (or need) a dedicated Customer Success function.",
    "Exclude non-software holdings (retail, industrials, real estate, consumer products, services-only, hardware-only businesses) and pre-revenue or too-early companies.",
    "Only include companies you can verify via web search as real, current holdings of this specific firm. Never invent, assume, or guess a company name.",
    "If fewer than 2 verified qualifying companies exist, return only the ones you actually verified — it is acceptable to return 1, or even 0 if truly none qualify. Do not pad the list with unverified guesses.",
    "",
    "Respond with ONLY a single fenced ```json code block containing a JSON array (no prose before or after it, no other text). Each array element must be an object with exactly these keys:",
    '- "name": string, the company\'s name',
    '- "website": string (the company\'s website URL) or null if you could not find one',
    '- "rationale": string, 1-2 sentences on why this is a strong ICP fit, citing what you found via search',
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Second-pass prompt — broader net, human-review-flagged, recall over precision
// ---------------------------------------------------------------------------
function buildSecondPassSystemPrompt(): string {
  return [
    "You are conducting a SECOND-PASS portfolio company discovery for INVESQ.",
    "A first automated search found no qualifying portfolio companies for this firm. This is often because the firm's website is entirely image-based (logos with no text), the firm focuses on non-SaaS sectors but may have some software holdings, or recent investments haven't been widely indexed yet.",
    "",
    "Cast a WIDER NET using alternative search strategies. Try ALL of the following:",
    "  1. '[firm name] portfolio site:crunchbase.com OR site:pitchbook.com OR site:cb-insights.com'",
    "  2. '[firm name] invested in software 2022 2023 2024'",
    "  3. '[firm name] SaaS investment OR technology investment OR software acquisition'",
    "  4. '[firm name] new investment announcement' — look at recent press releases and deal databases",
    "  5. '[firm name] backed company' OR '[firm name] investee' OR '[firm name] portfolio company announcement'",
    "  6. Search for the firm's website news/press section directly for recent deal announcements",
    "  7. Search for companies that mention '[firm name]' as their investor on their own websites or LinkedIn pages",
    "",
    "In this pass, PREFER RECALL OVER PRECISION: if a company is likely a current or recent portfolio holding based on credible signals (mentioned together in a press release, listed on a deal database, describes the firm as its investor), include it — a human will review the list before scoring begins. Still exclude obvious non-tech businesses (pure retail, real estate, consumer packaged goods, industrial manufacturing) unless they have substantial software components.",
    "",
    "Respond with ONLY a single fenced ```json code block containing a JSON array. Each element must have:",
    '- "name": string',
    '- "website": string or null',
    '- "rationale": string (1-2 sentences, include the specific source/signal you found)',
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

// ---------------------------------------------------------------------------
// Single discovery pass — one Claude call with a given system prompt
// ---------------------------------------------------------------------------
async function runDiscoveryPass(
  firm: Pick<Firm, "name" | "website">,
  systemPrompt: string,
  maxSearchUses: number,
): Promise<Candidate[]> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const message = await client.messages.create({
    model: DISCOVERY_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearchUses }],
    messages: [
      {
        role: "user",
        content: `Firm name: ${firm.name}\nFirm website: ${firm.website ?? "unknown"}\n\nResearch this firm's current portfolio using all available search strategies and identify the best candidate companies as instructed.`,
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

// ---------------------------------------------------------------------------
// Two-pass discovery: standard multi-source first, broader second if empty
// ---------------------------------------------------------------------------
async function discoverCandidates(firm: Pick<Firm, "name" | "website">): Promise<Candidate[]> {
  const firstPass = await runDiscoveryPass(firm, buildSystemPrompt(), 8);

  if (firstPass.length > 0) {
    return firstPass;
  }

  logger.warn(
    { firmName: firm.name },
    "First-pass discovery found 0 candidates; running broader second-pass search",
  );

  const secondPass = await runDiscoveryPass(firm, buildSecondPassSystemPrompt(), 12);

  if (secondPass.length === 0) {
    logger.warn(
      { firmName: firm.name },
      "Second-pass discovery also found 0 candidates; human review recommended",
    );
  }

  return secondPass;
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

  // Two-pass search takes longer — budget for both passes.
  const DISCOVERY_TARGET_MS = 90_000;
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

    // Surface empty discovery as a soft flag via the error field so the admin
    // UI can show an actionable state rather than a silent "completed" with
    // nothing to show.
    const emptyNote =
      candidates.length === 0
        ? "Discovery completed but found no qualifying portfolio companies after a multi-source search. Use the admin recovery panel to add companies manually or run a deeper review."
        : null;

    await db
      .update(jobsTable)
      .set({ status: "completed", progressPct: 100, etaSeconds: 0, completedAt: new Date(), error: emptyNote })
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
