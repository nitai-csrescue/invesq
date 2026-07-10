import { logger } from "./logger.js";
import { PILLARS } from "@workspace/portfolio-engine";
import type { PillarResult } from "./jobs/scoring.js";

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
  companyName: string;
  companyWebsite: string | null;
  firmName: string;
  assessmentDate: string;
  pillarResults: Record<string, PillarResult>;
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
    if (firmProp?.type === "relation") {
      const fundPageId = await findFundProfilePageId(apiKey, params.firmName);
      if (fundPageId) {
        properties[firmProp.name] = { relation: [{ id: fundPageId }] };
      }
    } else if (firmProp?.type === "rich_text") {
      properties[firmProp.name] = { rich_text: [{ text: { content: params.firmName } }] };
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

    await notionFetch(apiKey, "/pages", {
      method: "POST",
      body: JSON.stringify({ parent: { database_id: db.id }, properties }),
    });

    logger.info({ companyName: params.companyName }, "Notion diagnostic page written successfully");
    return { attempted: true, success: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ err, companyName: params.companyName }, "Notion write failed (Postgres write is unaffected)");
    return { attempted: true, success: false, reason: reason.slice(0, 1000) };
  }
}
