import { eq } from "drizzle-orm";
import { db as appDb, companiesTable, notionSyncStateTable } from "@workspace/db";
import { logger } from "./logger.js";
import { PILLARS, RUBRIC_VERSION, notionRubricVersionLabel } from "@workspace/portfolio-engine";
import type { PillarResult } from "./jobs/scoring.js";
import type { CountryHeadcount, FundingHistory } from "./enrichment/index.js";

const NOTION_VERSION = "2022-06-28";
const DIAGNOSTICS_DB_TITLE = "Portfolio Company Diagnostics";
const FUND_PROFILES_DB_TITLE = "fund profiles";
const SCORING_RUBRIC_PAGE_TITLE = "External CS Diagnostic";

// Blocks whose plain text we care about for prompt context. Anything else
// (images, dividers, embeds, ...) is skipped rather than guessed at.
const TEXT_BLOCK_TYPES = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "toggle",
  "callout",
  "quote",
  "to_do",
]);

const RUBRIC_PAGE_CACHE_TTL_MS = 10 * 60 * 1000;
let rubricPageCache: { text: string; fetchedAt: number } | null = null;

export interface NotionWriteResult {
  attempted: boolean;
  success: boolean;
  reason?: string;
}

interface NotionProperty {
  id: string;
  type: string;
  name: string;
}

interface NotionDatabase {
  id: string;
  properties: Record<string, NotionProperty>;
}

function getApiKey(): string | null {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    logger.warn("NOTION_API_KEY not set — skipping Notion write (Postgres write is unaffected)");
    return null;
  }
  return apiKey;
}

async function notionFetch<T = unknown>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Notion API ${init?.method ?? "GET"} ${path} failed: ${res.status} ${body.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

function notionPlainText(richText: Array<{ plain_text: string }> | undefined): string {
  return (richText ?? []).map((t) => t.plain_text).join("");
}

async function findDatabaseByTitle(apiKey: string, titleContains: string): Promise<NotionDatabase | null> {
  const result = await notionFetch<{
    results: Array<{ id: string; title?: Array<{ plain_text: string }>; properties: Record<string, NotionProperty> }>;
  }>(apiKey, "/search", {
    method: "POST",
    body: JSON.stringify({
      query: titleContains,
      filter: { property: "object", value: "database" },
    }),
  });

  const match = result.results.find((db) => notionPlainText(db.title).toLowerCase().includes(titleContains.toLowerCase()));
  if (!match) return null;
  return { id: match.id, properties: match.properties };
}

function findPropertyByType(db: NotionDatabase, type: string): NotionProperty | undefined {
  return Object.values(db.properties).find((p) => p.type === type);
}

// Best-effort name match: exact (case-insensitive) first, then substring.
function findPropertyByName(db: NotionDatabase, ...candidates: string[]): NotionProperty | undefined {
  const props = Object.values(db.properties);
  for (const candidate of candidates) {
    const exact = props.find((p) => p.name.toLowerCase() === candidate.toLowerCase());
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const partial = props.find((p) => p.name.toLowerCase().includes(candidate.toLowerCase()));
    if (partial) return partial;
  }
  return undefined;
}

function scoreLabel(score: PillarResult["score"]): string {
  if (score === "Insufficient Data") return "Insufficient Data";
  return { 0: "0 - Infrastructure Gap", 1: "1 - Developing", 2: "2 - Optimized" }[score];
}

async function findFundProfilePageId(apiKey: string, firmName: string): Promise<string | null> {
  try {
    const fundDb = await findDatabaseByTitle(apiKey, FUND_PROFILES_DB_TITLE);
    if (!fundDb) return null;
    const titleProp = findPropertyByType(fundDb, "title");
    if (!titleProp) return null;

    const result = await notionFetch<{ results: Array<{ id: string; properties: Record<string, unknown> }> }>(
      apiKey,
      `/databases/${fundDb.id}/query`,
      { method: "POST", body: JSON.stringify({}) },
    );

    const match = result.results.find((page) => {
      const prop = page.properties[titleProp.name] as { title?: Array<{ plain_text: string }> } | undefined;
      const text = notionPlainText(prop?.title).trim().toLowerCase();
      return text === firmName.trim().toLowerCase();
    });
    return match?.id ?? null;
  } catch (err) {
    logger.warn({ err, firmName }, "Notion: could not resolve fund profile relation (non-fatal)");
    return null;
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// Live pre-write existence check against the Portfolio Company Diagnostics
// database itself (NOT the local notion_sync_state table, which is keyed by
// assessmentId and therefore misses every earlier assessment's page).
// Dedup key is (Company Name + Parent Fund): the title must match after
// trimming/whitespace-collapsing/case-folding AND the fund relation must
// match, so legitimate multi-owner rows (same company under two funds, e.g.
// Appfire under both TA Associates and Silversmith) are never collapsed.
export async function findExistingDiagnosticPage(
  apiKey: string,
  db: NotionDatabase,
  titleProp: NotionProperty,
  firmProp: NotionProperty | undefined,
  fundPageId: string | null,
  firmName: string,
  companyName: string,
): Promise<string | null> {
  // With a relation-typed fund property but no resolvable fund page id we
  // cannot form the (Company Name + Parent Fund) key at all — never infer a
  // match from an empty relation (that could PATCH an unrelated unlinked
  // row). Fail soft to the create path instead.
  if (firmProp?.type === "relation" && !fundPageId) return null;

  const wanted = normalizeName(companyName);
  let cursor: string | undefined;
  do {
    // No server-side title filter: Notion's text filters are case/whitespace
    // sensitive enough to hide legitimate candidates (an existing row with
    // doubled internal spaces would never come back), so we paginate the
    // whole database and apply the normalized comparison client-side — the
    // only comparison that is authoritative.
    const result = await notionFetch<{
      results: Array<{ id: string; properties: Record<string, unknown> }>;
      has_more: boolean;
      next_cursor: string | null;
    }>(apiKey, `/databases/${db.id}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });

    for (const page of result.results) {
      const title = page.properties[titleProp.name] as { title?: Array<{ plain_text: string }> } | undefined;
      if (normalizeName(notionPlainText(title?.title)) !== wanted) continue;

      if (firmProp?.type === "relation") {
        const rel = page.properties[firmProp.name] as { relation?: Array<{ id: string }> } | undefined;
        const relIds = (rel?.relation ?? []).map((r) => r.id);
        // Same company under a different fund is a legitimate separate row;
        // fundPageId is guaranteed non-null here (guarded above).
        if (!fundPageId || !relIds.includes(fundPageId)) continue;
      } else if (firmProp?.type === "rich_text") {
        const rt = page.properties[firmProp.name] as { rich_text?: Array<{ plain_text: string }> } | undefined;
        if (normalizeName(notionPlainText(rt?.rich_text)) !== normalizeName(firmName)) continue;
      }
      return page.id;
    }

    cursor = result.has_more && result.next_cursor ? result.next_cursor : undefined;
  } while (cursor);
  return null;
}

async function findPageByTitle(apiKey: string, titleContains: string): Promise<string | null> {
  const result = await notionFetch<{
    results: Array<{ id: string; object: string; properties?: Record<string, NotionProperty>; url?: string }>;
  }>(apiKey, "/search", {
    method: "POST",
    body: JSON.stringify({
      query: titleContains,
      filter: { property: "object", value: "page" },
    }),
  });

  // Workspace-level pages don't expose a `title` search-result field the way
  // databases do — the title lives in `properties.title` (or whichever
  // property is typed `title`), so we resolve it the same way as elsewhere.
  const match = result.results.find((page) => {
    const titleProp = Object.values(page.properties ?? {}).find((p) => p.type === "title") as
      | (NotionProperty & { title?: Array<{ plain_text: string }> })
      | undefined;
    const text = notionPlainText((titleProp as unknown as { title?: Array<{ plain_text: string }> })?.title);
    return text.toLowerCase().includes(titleContains.toLowerCase());
  });
  return match?.id ?? null;
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

async function fetchBlockChildrenText(apiKey: string, blockId: string, depth: number): Promise<string[]> {
  if (depth > 4) return []; // guard against pathological nesting

  const lines: string[] = [];
  let cursor: string | undefined;
  do {
    const query = cursor ? `?start_cursor=${cursor}&page_size=100` : "?page_size=100";
    const page = await notionFetch<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }>(
      apiKey,
      `/blocks/${blockId}/children${query}`,
    );

    for (const block of page.results) {
      const body = block[block.type] as { rich_text?: Array<{ plain_text: string }> } | undefined;
      if (TEXT_BLOCK_TYPES.has(block.type) && body?.rich_text) {
        const text = notionPlainText(body.rich_text).trim();
        if (text) lines.push(text);
      }
      if (block.has_children) {
        lines.push(...(await fetchBlockChildrenText(apiKey, block.id, depth + 1)));
      }
    }

    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return lines;
}

// Fetches the plain-text body of the "External CS Diagnostic — Scoring
// Rubric & Cowork Instructions" Notion page, for use as grounding context in
// report-generation prompts. Fails soft (returns null) on any error —
// callers must fall back to the embedded PILLARS rubric data. In-memory
// cached for RUBRIC_PAGE_CACHE_TTL_MS since the page changes rarely and this
// runs on every report generation.
export async function fetchScoringRubricText(): Promise<string | null> {
  if (rubricPageCache && Date.now() - rubricPageCache.fetchedAt < RUBRIC_PAGE_CACHE_TTL_MS) {
    return rubricPageCache.text;
  }

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const pageId = await findPageByTitle(apiKey, SCORING_RUBRIC_PAGE_TITLE);
    if (!pageId) {
      logger.warn(`Notion page "${SCORING_RUBRIC_PAGE_TITLE}" not found or not shared with this integration`);
      return null;
    }

    const lines = await fetchBlockChildrenText(apiKey, pageId, 0);
    const text = lines.join("\n");
    if (!text.trim()) {
      logger.warn({ pageId }, "Notion scoring rubric page had no extractable text");
      return null;
    }

    rubricPageCache = { text, fetchedAt: Date.now() };
    logger.info({ pageId, chars: text.length }, "Fetched Notion scoring rubric page");
    return text;
  } catch (err) {
    logger.warn({ err }, "Failed to fetch Notion scoring rubric page (falling back to embedded rubric)");
    return null;
  }
}

// Best-effort write of one company's diagnostic scores into the shared
// "Portfolio Company Diagnostics" Notion database. Property names/types in
// the target database are discovered at runtime (not hardcoded) since this
// integration doesn't own that schema. Never throws — Postgres is the
// source of truth and must never be blocked by a Notion failure.
export async function writeDiagnosticToNotion(params: {
  assessmentId: number;
  companyName: string;
  companyWebsite: string | null;
  firmName: string;
  assessmentDate: string;
  pillarResults: Record<string, PillarResult>;
  /** CQ-15 supplemental-only fields; never produced by the legacy scrape. */
  fundingHistory?: FundingHistory | null;
  countryHeadcount?: CountryHeadcount | null;
}): Promise<NotionWriteResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { attempted: false, success: false, reason: "NOTION_API_KEY not configured" };
  }

  try {
    const db = await findDatabaseByTitle(apiKey, DIAGNOSTICS_DB_TITLE);
    if (!db) {
      const reason = `Notion database "${DIAGNOSTICS_DB_TITLE}" not found or not shared with this integration`;
      logger.warn({ companyName: params.companyName }, reason);
      return { attempted: true, success: false, reason };
    }

    const titleProp = findPropertyByType(db, "title");
    if (!titleProp) {
      const reason = `Notion database "${DIAGNOSTICS_DB_TITLE}" has no title property — cannot create a page`;
      logger.warn({ companyName: params.companyName }, reason);
      return { attempted: true, success: false, reason };
    }

    const properties: Record<string, unknown> = {
      [titleProp.name]: { title: [{ text: { content: params.companyName } }] },
    };

    const websiteProp = findPropertyByName(db, "Website", "URL");
    if (websiteProp && params.companyWebsite) {
      if (websiteProp.type === "url") {
        properties[websiteProp.name] = { url: params.companyWebsite };
      } else if (websiteProp.type === "rich_text") {
        properties[websiteProp.name] = { rich_text: [{ text: { content: params.companyWebsite } }] };
      }
    }

    const dateProp = findPropertyByName(db, "Assessment Date", "Date");
    if (dateProp && dateProp.type === "date") {
      properties[dateProp.name] = { date: { start: params.assessmentDate } };
    }

    const firmProp = findPropertyByName(db, "Fund", "Firm", "Parent Fund");
    let fundPageId: string | null = null;
    if (firmProp?.type === "relation") {
      fundPageId = await findFundProfilePageId(apiKey, params.firmName);
      if (fundPageId) {
        properties[firmProp.name] = { relation: [{ id: fundPageId }] };
      }
    } else if (firmProp?.type === "rich_text") {
      properties[firmProp.name] = { rich_text: [{ text: { content: params.firmName } }] };
    }

    // Stamp the methodology generation automatically on every diagnostic
    // write — never manual. The canonical RUBRIC_VERSION maps onto the
    // select's two fixed generation options via notionRubricVersionLabel().
    // CQ-15: supplemental-only fields (populated exclusively by third-party
    // enrichment adapters — the legacy scrape never writes them). Only set
    // when data exists so pages for un-enriched companies are untouched.
    setSupplementalProperties(db, properties, params.fundingHistory ?? null, params.countryHeadcount ?? null);

    const rubricVersionProp = findPropertyByName(db, "Rubric Version");
    if (rubricVersionProp?.type === "select") {
      properties[rubricVersionProp.name] = { select: { name: notionRubricVersionLabel(RUBRIC_VERSION) } };
    } else if (rubricVersionProp?.type === "rich_text") {
      properties[rubricVersionProp.name] = { rich_text: [{ text: { content: notionRubricVersionLabel(RUBRIC_VERSION) } }] };
    }

    const missingPillarProps: string[] = [];
    for (const pillar of PILLARS) {
      const result = params.pillarResults[pillar.id];
      if (!result) continue;

      const scoreProp = findPropertyByName(db, pillar.name, `${pillar.name} Score`, pillar.id);
      if (scoreProp) {
        const label = scoreLabel(result.score);
        if (scoreProp.type === "select") {
          properties[scoreProp.name] = { select: { name: label } };
        } else if (scoreProp.type === "rich_text") {
          properties[scoreProp.name] = { rich_text: [{ text: { content: label } }] };
        } else if (scoreProp.type === "number" && result.score !== "Insufficient Data") {
          properties[scoreProp.name] = { number: result.score };
        }
      } else {
        missingPillarProps.push(pillar.name);
      }

      const evidenceProp = findPropertyByName(db, `${pillar.name} Evidence`, `${pillar.id} Evidence`);
      if (evidenceProp?.type === "rich_text") {
        properties[evidenceProp.name] = { rich_text: [{ text: { content: result.evidence.slice(0, 2000) } }] };
      }
    }

    if (missingPillarProps.length === PILLARS.length) {
      const reason = `Notion database "${DIAGNOSTICS_DB_TITLE}" has no recognizable pillar-score properties (tried matching by pillar name) — page would carry no diagnostic data`;
      logger.warn({ companyName: params.companyName }, reason);
      return { attempted: true, success: false, reason };
    }
    if (missingPillarProps.length > 0) {
      logger.warn(
        { companyName: params.companyName, missingPillarProps },
        "Notion: some pillar properties were not found in the target database and were skipped",
      );
    }

    // Upsert: PATCH the existing Notion page if we have a sync-state row for
    // this assessment; otherwise POST a new page and record the sync-state row.
    // The sync-state row is deleted as part of the same-day re-score transaction
    // in build.ts, so a re-score always lands here in the POST branch and gets
    // a fresh page ID recorded.
    const [existingSyncState] = await appDb
      .select({ notionPageId: notionSyncStateTable.notionPageId })
      .from(notionSyncStateTable)
      .where(eq(notionSyncStateTable.assessmentId, params.assessmentId))
      .limit(1);

    if (existingSyncState) {
      await notionFetch(apiKey, `/pages/${existingSyncState.notionPageId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties }),
      });
      await appDb
        .update(notionSyncStateTable)
        .set({ lastSyncedAt: new Date(), lastSyncStatus: "success", lastError: null })
        .where(eq(notionSyncStateTable.assessmentId, params.assessmentId));
      logger.info(
        { companyName: params.companyName, notionPageId: existingSyncState.notionPageId },
        "Notion diagnostic page updated (PATCH) successfully",
      );
    } else {
      // No local sync-state row for this assessment (fresh assessment id, or
      // the row was removed by a same-day re-score). Before creating a page,
      // query Notion live for an existing row with the same (Company Name +
      // Parent Fund) — this is what stops repeated onboarding/add-company
      // runs from stacking duplicate diagnostics rows.
      const existingPageId = await findExistingDiagnosticPage(
        apiKey,
        db,
        titleProp,
        firmProp,
        fundPageId,
        params.firmName,
        params.companyName,
      );

      if (existingPageId) {
        await notionFetch(apiKey, `/pages/${existingPageId}`, {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        });
        await appDb
          .insert(notionSyncStateTable)
          .values({
            assessmentId: params.assessmentId,
            notionPageId: existingPageId,
            lastSyncedAt: new Date(),
            lastSyncStatus: "success",
          })
          .onConflictDoUpdate({
            target: notionSyncStateTable.assessmentId,
            set: { notionPageId: existingPageId, lastSyncedAt: new Date(), lastSyncStatus: "success", lastError: null },
          });
        logger.info(
          { companyName: params.companyName, notionPageId: existingPageId },
          "Notion diagnostic page matched by live (Company Name + Parent Fund) lookup — updated in place (PATCH), no duplicate created",
        );
      } else {
        const created = await notionFetch<{ id: string }>(apiKey, "/pages", {
          method: "POST",
          body: JSON.stringify({ parent: { database_id: db.id }, properties }),
        });
        await appDb
          .insert(notionSyncStateTable)
          .values({
            assessmentId: params.assessmentId,
            notionPageId: created.id,
            lastSyncedAt: new Date(),
            lastSyncStatus: "success",
          })
          .onConflictDoUpdate({
            target: notionSyncStateTable.assessmentId,
            set: { notionPageId: created.id, lastSyncedAt: new Date(), lastSyncStatus: "success", lastError: null },
          });
        logger.info(
          { companyName: params.companyName, notionPageId: created.id },
          "Notion diagnostic page created (POST) successfully",
        );
      }
    }

    return { attempted: true, success: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ err, companyName: params.companyName }, "Notion write failed (Postgres write is unaffected)");
    return { attempted: true, success: false, reason: reason.slice(0, 1000) };
  }
}

// ---------------------------------------------------------------------------
// CQ-15: supplemental-only Notion fields (funding history + country headcount)

const FUNDING_HISTORY_PROP = "Funding History";
const COUNTRY_HEADCOUNT_PROP = "Country-Level Headcount Distribution";
const NOTION_RICH_TEXT_LIMIT = 2000;

function formatUsd(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount)) return "undisclosed";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function formatFundingHistoryText(fh: FundingHistory): string {
  const parts: string[] = [];
  parts.push(`Total raised ${formatUsd(fh.totalRaisedUsd)}`);
  if (fh.roundCount !== null) parts.push(`${fh.roundCount} round${fh.roundCount === 1 ? "" : "s"}`);
  if (fh.latestStage) parts.push(`latest stage ${fh.latestStage}`);
  const rounds = fh.rounds
    .filter((r) => r.round || r.stage || r.amountUsd !== null || r.date)
    .map((r) => {
      const label = r.round || r.stage || "round";
      const amt = r.amountUsd !== null ? ` ${formatUsd(r.amountUsd)}` : "";
      const when = r.date ? ` (${r.date})` : "";
      return `${label}${amt}${when}`;
    });
  const head = parts.join(" · ");
  const detail = rounds.length > 0 ? ` — ${rounds.join("; ")}` : "";
  const tail = ` [source: ${fh.source}, pulled ${fh.pulledAt.slice(0, 10)}]`;
  return `${head}${detail}${tail}`.slice(0, NOTION_RICH_TEXT_LIMIT);
}

export function formatCountryHeadcountText(ch: CountryHeadcount): string {
  const entries = Object.entries(ch.byCountry)
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, 15).map(([c, n]) => `${c} ${n}`);
  const rest = entries.length > 15 ? ` · +${entries.length - 15} more` : "";
  const tail = ` [source: ${ch.source}, pulled ${ch.pulledAt.slice(0, 10)}]`;
  return `${shown.join(" · ")}${rest}${tail}`.slice(0, NOTION_RICH_TEXT_LIMIT);
}

// Runtime guards for the jsonb companies columns — historic or manually
// edited rows must never crash a Notion write or produce garbage text.
// Invalid shapes are treated as absent (with a bounded warning).
export function asFundingHistory(value: unknown): FundingHistory | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.rounds) || typeof v.source !== "string" || typeof v.pulledAt !== "string") {
    logger.warn({ keys: Object.keys(v).slice(0, 10) }, "companies.funding_history has an unexpected shape; treating as absent");
    return null;
  }
  return value as FundingHistory;
}

export function asCountryHeadcount(value: unknown): CountryHeadcount | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!v.byCountry || typeof v.byCountry !== "object" || typeof v.source !== "string" || typeof v.pulledAt !== "string") {
    logger.warn({ keys: Object.keys(v).slice(0, 10) }, "companies.country_headcount has an unexpected shape; treating as absent");
    return null;
  }
  return value as CountryHeadcount;
}

function setSupplementalProperties(
  db: NotionDatabase,
  properties: Record<string, unknown>,
  fundingHistory: FundingHistory | null,
  countryHeadcount: CountryHeadcount | null,
): void {
  if (fundingHistory) {
    const prop = findPropertyByName(db, FUNDING_HISTORY_PROP);
    if (prop?.type === "rich_text") {
      properties[prop.name] = { rich_text: [{ text: { content: formatFundingHistoryText(fundingHistory) } }] };
    }
  }
  if (countryHeadcount) {
    const prop = findPropertyByName(db, COUNTRY_HEADCOUNT_PROP);
    if (prop?.type === "rich_text") {
      properties[prop.name] = { rich_text: [{ text: { content: formatCountryHeadcountText(countryHeadcount) } }] };
    }
  }
}

/**
 * Best-effort PATCH of ONLY the two supplemental fields onto an already
 * synced diagnostics page. Called after the background enrichment step
 * finishes (which runs concurrently with — usually after — the main
 * writeDiagnosticToNotion call), so first-run enrichment data reaches the
 * Notion page in the same build instead of waiting for the next re-score.
 * Reads the freshly persisted companies columns; never throws.
 */
export async function patchDiagnosticSupplementalFields(assessmentId: number, companyId: number): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) return;
  try {
    const [company] = await appDb
      .select({ fundingHistory: companiesTable.fundingHistory, countryHeadcount: companiesTable.countryHeadcount })
      .from(companiesTable)
      .where(eq(companiesTable.id, companyId))
      .limit(1);
    const fundingHistory = asFundingHistory(company?.fundingHistory ?? null);
    const countryHeadcount = asCountryHeadcount(company?.countryHeadcount ?? null);
    if (!fundingHistory && !countryHeadcount) return;

    const [syncState] = await appDb
      .select({ notionPageId: notionSyncStateTable.notionPageId })
      .from(notionSyncStateTable)
      .where(eq(notionSyncStateTable.assessmentId, assessmentId))
      .limit(1);
    if (!syncState) return; // page not synced (Notion disabled or write failed) — next re-score carries the fields

    const db = await findDatabaseByTitle(apiKey, DIAGNOSTICS_DB_TITLE);
    if (!db) return;
    const properties: Record<string, unknown> = {};
    setSupplementalProperties(db, properties, fundingHistory, countryHeadcount);
    if (Object.keys(properties).length === 0) return; // target props missing in the Notion DB

    await notionFetch(apiKey, `/pages/${syncState.notionPageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
    logger.info({ companyId, notionPageId: syncState.notionPageId }, "Notion supplemental fields patched (funding history / country headcount)");
  } catch (err) {
    logger.warn({ err, companyId }, "Notion supplemental-field patch failed (Postgres data unaffected; next re-score will carry the fields)");
  }
}
