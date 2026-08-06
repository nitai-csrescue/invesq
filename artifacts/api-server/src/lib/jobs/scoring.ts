import { PILLARS } from "@workspace/portfolio-engine";
import { getAnthropicClient, extractText, extractJsonFence } from "../anthropic.js";

const SCORING_MODEL = "claude-sonnet-4-6";

export interface PillarResult {
  score: 0 | 1 | 2 | "Insufficient Data";
  evidence: string;
  // Structured evidence records backing this pillar's score. Best-effort and
  // guard-parsed (missing/malformed -> []) — signals are evidence metadata
  // only and NEVER affect the score, composite, tier, or confidence math.
  signals?: PillarSignal[];
}

// One structured, queryable evidence record for a pillar — the
// machine-readable complement to the free-text `evidence` string. Persisted
// to the `signals` table by build.ts.
export interface PillarSignal {
  source: string; // normalized to SIGNAL_SOURCES; unknown values -> "other"
  dateObserved: string | null; // ISO YYYY-MM-DD when the artifact is dated
  url: string | null;
  direction: "positive" | "negative" | "neutral";
  confidence: "High" | "Medium" | "Low";
  note: string;
}

const SIGNAL_SOURCES = new Set([
  "linkedin",
  "job_posting",
  "g2_capterra",
  "press",
  "crunchbase",
  "pitchbook",
  "company_site",
  "other",
]);
const SIGNAL_DIRECTIONS = new Set(["positive", "negative", "neutral"]);
const SIGNAL_CONFIDENCES = new Set(["High", "Medium", "Low"]);
const MAX_SIGNALS_PER_PILLAR = 4;

// Descriptive company profile researched alongside the pillar scores, in the
// SAME Claude call. Fields map onto the portfolio engine's CompanyMeta so a
// pipeline company can render on the tenant portal exactly like a
// hand-authored one. Guard-parsed with safe fallbacks — a missing/malformed
// profile never fails scoring (unlike the pillar scores, which throw).
export interface CompanyProfile {
  sector: string; // "Unconfirmed" when not verifiable
  hq: string; // "Unconfirmed" when not verifiable
  employeesDisplay: string; // "Unconfirmed" when not verifiable — never a fabricated precise figure
  arrDisplay: string; // "Undisclosed" when not verifiable
  arrForRollup: [number, number] | null; // dollars [low, high]; null when undisclosed
  // Task #69 / CQ-46: a PUBLICLY DISCLOSED ARR/revenue figure (press release,
  // M&A announcement, funding coverage, trade press) — distinct from the
  // arrDisplay ESTIMATE above. All-or-nothing guard-parsed: either every field
  // is present and valid, or the whole disclosure is null. Maps 1:1 onto the
  // CQ-45 columns companies.arr / arr_as_of / arr_source.
  arrDisclosure: ArrDisclosure | null;
  summary: string; // executive summary; "" when the model returned none
}

export interface ArrDisclosure {
  amount: number; // whole US dollars, > 0
  asOf: string; // ISO YYYY-MM-DD the figure was reported/valid as of
  source: string; // outlet + publication date, e.g. "STG launch press release, Jan 2022"
  basis: "point_in_time" | "run_rate"; // never presented interchangeably in reports
}

export interface CompanyScoring {
  pillarResults: Record<string, PillarResult>;
  profile: CompanyProfile;
}

const DEFAULT_PROFILE: CompanyProfile = {
  sector: "Unconfirmed",
  hq: "Unconfirmed",
  employeesDisplay: "Unconfirmed",
  arrDisplay: "Undisclosed",
  arrForRollup: null,
  arrDisclosure: null,
  summary: "",
};

interface ScoreTarget {
  name: string;
  website: string | null;
}

interface FirmContext {
  name: string;
  website: string | null;
}

// CQ-28: explicit Phase 1 signal checks layered onto specific pillars'
// prompt lines, in ADDITION to the pillar's baseline `signals` string from
// the shared PILLARS rubric. Prompt-layer only: signal storage shape,
// scoring rules, consolidation, and composite math are untouched, and the
// shared rubric copy (which also renders in tenant-facing UI) is not edited.
// "revenue" is the P4 raw pillar that consolidates into Renewal & Expansion
// Forecasting.
const EXTRA_SIGNAL_CHECKS: Partial<Record<string, string[]>> = {
  revenue: [
    "pricing, packaging, or bundling language on the company's product/pricing pages, in case studies, or in press coverage",
    "discount governance or contract terms-and-conditions mentions in job postings, in contracts referenced in press, or in investor materials",
    "any public mention of NRR reporting, NRR dashboards, or a QBR/renewal cadence",
  ],
};

function buildSystemPrompt(): string {
  const pillarBlock = PILLARS.map((p, i) => {
    const extras = EXTRA_SIGNAL_CHECKS[p.id];
    const extraBlock = extras
      ? ` Additionally, explicitly check for each of the following and record any real finding as its own structured signal (skip silently when no public signal exists — never fabricate): ${extras.map((e, j) => `(${String.fromCharCode(97 + j)}) ${e}`).join("; ")}.`
      : "";
    return `${i + 1}. "${p.id}" — ${p.name}: ${p.measures} Look for signals such as: ${p.signals}.${extraBlock}`;
  }).join("\n");

  return [
    "You are conducting an 8-pillar Customer Success operational diagnostic for INVESQ, an operational due-diligence platform for PE/VC firms assessing a real portfolio company.",
    "Use the web_search tool to research the target company's actual, current public signals (careers/job postings, G2/Capterra reviews, LinkedIn headcount and leadership, company blog/press, product pages) relevant to each of the 8 pillars below.",
    "",
    "The 8 pillars, in order:",
    pillarBlock,
    "",
    "For EACH of the 8 pillars, assign exactly one of these scores:",
    '- 2 = Optimized: strong, systematic, well-evidenced signal.',
    '- 1 = Developing: partial or inconsistent signal — present but immature.',
    '- 0 = Infrastructure Gap: little to no signal, or clear evidence of absence.',
    '- "Insufficient Data" = you could not find enough public signal to responsibly judge this pillar either way.',
    "",
    "CRITICAL RULE: never guess on thin signal. If your web search does not turn up enough real, specific evidence for a pillar, you MUST score it \"Insufficient Data\" rather than inferring a 0/1/2 from vibes, industry norms, or company size alone. Every 0/1/2 score must be backed by a specific, citable fact you actually found.",
    "",
    "You must ALSO research the company itself (what it does, where it is based, roughly how large it is, and its revenue scale) for a short descriptive profile. Apply the same never-fabricate rule to the profile: if you cannot verify a field from a real signal, use its documented fallback rather than guessing.",
    "",
    "MANDATORY ARR/REVENUE DISCLOSURE CHECK: dedicate at least one web search specifically to a publicly disclosed ARR or revenue figure for the company (e.g. \"<company> revenue\", \"<company> ARR\", \"<company> acquisition revenue\"). Check press releases (company or acquirer/investor), acquisition/merger/carve-out announcements, funding round coverage, and trade press. A disclosure is a specific figure someone actually published about this company — NOT an estimate you infer. If you find one, report it in the profile's arrDisclosed* fields below with its source, date, and whether it was a point-in-time snapshot (e.g. revenue at time of a merger/acquisition) or a stated current run-rate — those two must never be conflated. If no credible dated public figure exists, set all four arrDisclosed* fields to null — never estimate one.",
    "",
    "Respond with ONLY a single fenced ```json code block (no prose before or after it) containing one JSON object with these keys:",
    "1. The 8 pillar keys (the pillar ids above): \"org\", \"onboarding\", \"health\", \"escalation\", \"revenue\", \"leadership\", \"planning\", \"ai\". Each value must be an object with exactly these three fields:",
    '   - "score": 0, 1, 2, or the literal string "Insufficient Data"',
    '   - "evidence": a 1-3 sentence explanation citing the specific fact(s) you found (or explicitly stating what you searched for and could not find, if "Insufficient Data")',
    '   - "signals": an array of 0-4 structured evidence records, one per distinct fact you actually found for this pillar (empty array if none). Each record is an object with exactly these fields:',
    '       - "source": one of "linkedin", "job_posting", "g2_capterra", "press", "crunchbase", "pitchbook", "company_site", "other"',
    '       - "dateObserved": the ISO date "YYYY-MM-DD" of the underlying artifact (e.g. a press release or job-posting date) if it is dated, otherwise null',
    '       - "url": a direct link to the artifact if you have one, otherwise null',
    '       - "direction": "positive", "negative", or "neutral" — which way this fact points for this pillar',
    '       - "confidence": "High", "Medium", or "Low" — your confidence in this single fact',
    '       - "note": 1-2 plain sentences describing the specific fact. Never name individual people in a note; refer to roles only (e.g. "the current CS leader"). Do not use em-dash characters.',
    "   Signals must describe real facts you found via search — never fabricate a signal, a date, or a URL. A pillar scored \"Insufficient Data\" should usually have an empty signals array.",
    '2. A "profile" key whose value is an object with exactly these fields:',
    '   - "sector": string — the company\'s software sub-sector / vertical (e.g. "Healthcare revenue-cycle SaaS", "DevOps tooling"). Use "Unconfirmed" if you cannot verify it.',
    '   - "hq": string — headquarters as "City, ST" or "City, Country" (e.g. "Austin, TX"). Use "Unconfirmed" if you cannot verify it.',
    '   - "employeesDisplay": string — approximate headcount as a string, e.g. "175" or "150-200". NEVER fabricate a precise figure; use "Unconfirmed" if you have no real signal.',
    '   - "arrDisplay": string — human-readable ARR estimate, e.g. "$10M-$20M". Use "Undisclosed" if you have no real signal.',
    '   - "arrLow": number (US dollars, e.g. 10000000) or null — low end of the ARR range; null if undisclosed.',
    '   - "arrHigh": number (US dollars) or null — high end of the ARR range; null if undisclosed.',
    "   The next four fields report the MANDATORY ARR/REVENUE DISCLOSURE CHECK result (ALL four when found, ALL null when no credible dated public disclosure exists):",
    '   - "arrDisclosedAmount": number (whole US dollars, e.g. 2000000000 for "almost $2 billion") or null.',
    '   - "arrDisclosedAsOf": ISO date "YYYY-MM-DD" the figure was reported/valid as of (use the first of the month if only a month is public) or null.',
    '   - "arrDisclosedSource": string naming the outlet/document plus its publication date, e.g. "STG launch press release, Jan 2022 (corroborated: Dark Reading, VentureBeat)", or null.',
    '   - "arrDisclosedBasis": "point_in_time" (a snapshot tied to an event, e.g. revenue at acquisition/carve-out) or "run_rate" (a stated current run-rate), or null. Never conflate the two.',
    '   - "summary": string — a 2-4 sentence executive summary of the company and its Customer Success operational posture, grounded only in what you found.',
  ].join("\n");
}

function isValidScore(value: unknown): value is PillarResult["score"] {
  return value === 0 || value === 1 || value === 2 || value === "Insufficient Data";
}

function isPillarResult(value: unknown): value is PillarResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isValidScore(record.score) && typeof record.evidence === "string" && record.evidence.trim().length > 0;
}

function parsePillarResults(text: string): Record<string, PillarResult> {
  const raw = extractJsonFence(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Claude scoring response was not valid JSON (${(err as Error).message}). Raw text: ${text.slice(0, 500)}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Claude scoring response JSON was not an object. Raw text: ${text.slice(0, 500)}`);
  }

  const record = parsed as Record<string, unknown>;
  const results: Record<string, PillarResult> = {};
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const pillar of PILLARS) {
    const entry = record[pillar.id];
    if (entry === undefined) {
      missing.push(pillar.id);
      continue;
    }
    if (!isPillarResult(entry)) {
      invalid.push(pillar.id);
      continue;
    }
    results[pillar.id] = {
      score: entry.score,
      evidence: entry.evidence.trim(),
      signals: parsePillarSignals((entry as unknown as Record<string, unknown>).signals),
    };
  }

  if (missing.length > 0 || invalid.length > 0) {
    throw new Error(
      `Claude scoring response was missing or malformed for pillar(s): missing=[${missing.join(", ")}] invalid=[${invalid.join(", ")}]. Raw text: ${text.slice(0, 800)}`,
    );
  }

  return results;
}

// Guard-parses one pillar's "signals" array. NEVER throws and never fails the
// scoring run — a missing/malformed array (or malformed elements within it)
// simply yields fewer signals. Unknown sources normalize to "other"; rows
// missing a valid note/direction/confidence are dropped; notes get the
// deterministic no-em-dash scrub (prompt instruction is layer one, this is
// layer two, static copy is layer three).
function parsePillarSignals(value: unknown): PillarSignal[] {
  if (!Array.isArray(value)) return [];
  const out: PillarSignal[] = [];
  for (const item of value) {
    if (out.length >= MAX_SIGNALS_PER_PILLAR) break;
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;

    const note =
      typeof rec.note === "string" ? rec.note.replace(/\u2014/g, "--").trim() : "";
    const direction = typeof rec.direction === "string" ? rec.direction : "";
    const confidence = typeof rec.confidence === "string" ? rec.confidence : "";
    if (!note || !SIGNAL_DIRECTIONS.has(direction) || !SIGNAL_CONFIDENCES.has(confidence)) {
      continue;
    }

    const source =
      typeof rec.source === "string" && SIGNAL_SOURCES.has(rec.source) ? rec.source : "other";
    const dateObserved =
      typeof rec.dateObserved === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rec.dateObserved)
        ? rec.dateObserved
        : null;
    const url =
      typeof rec.url === "string" && /^https?:\/\//i.test(rec.url.trim()) ? rec.url.trim() : null;

    out.push({
      source,
      dateObserved,
      url,
      direction: direction as PillarSignal["direction"],
      confidence: confidence as PillarSignal["confidence"],
      note,
    });
  }
  return out;
}

// Guard-parses the "profile" block from the same JSON. NEVER throws — any
// missing/malformed field falls back to its documented sentinel so a weak or
// absent profile can't fail an otherwise-valid scoring run. The pillar scores
// remain the strict, throw-on-error part of the response.
function parseCompanyProfile(text: string): CompanyProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonFence(text));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
  if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_PROFILE };

  const profile = (parsed as Record<string, unknown>).profile;
  if (typeof profile !== "object" || profile === null) return { ...DEFAULT_PROFILE };
  const rec = profile as Record<string, unknown>;

  const str = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
  const posNum = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

  const lo = posNum(rec.arrLow);
  const hi = posNum(rec.arrHigh);
  const arrForRollup: [number, number] | null =
    lo !== null && hi !== null && lo <= hi ? [lo, hi] : null;

  return {
    sector: str(rec.sector, DEFAULT_PROFILE.sector),
    hq: str(rec.hq, DEFAULT_PROFILE.hq),
    employeesDisplay: str(rec.employeesDisplay, DEFAULT_PROFILE.employeesDisplay),
    // If the model gave a dollar range but no display string, keep the sentinel
    // rather than fabricating a format — the range still drives rollups.
    arrDisplay: str(rec.arrDisplay, DEFAULT_PROFILE.arrDisplay),
    arrForRollup,
    arrDisclosure: parseArrDisclosure(rec),
    summary: str(rec.summary, DEFAULT_PROFILE.summary),
  };
}

// Task #69: all-or-nothing parse of the disclosed-ARR fields. A disclosure is
// only usable when the figure, its as-of date, its source, and its
// point-in-time/run-rate basis are ALL present and valid — a partial
// disclosure (e.g. a figure with no date) is worse than none, because the
// copy policy requires qualifying every figure with its date. NEVER throws.
function parseArrDisclosure(rec: Record<string, unknown>): ArrDisclosure | null {
  const amount =
    typeof rec.arrDisclosedAmount === "number" &&
    Number.isFinite(rec.arrDisclosedAmount) &&
    rec.arrDisclosedAmount > 0
      ? Math.round(rec.arrDisclosedAmount)
      : null;
  // Accept full ISO dates; tolerate a month-only "YYYY-MM" (normalize to the
  // first of the month, matching the prompt's own instruction to the model).
  const asOfRaw = typeof rec.arrDisclosedAsOf === "string" ? rec.arrDisclosedAsOf.trim() : "";
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(asOfRaw)
    ? asOfRaw
    : /^\d{4}-\d{2}$/.test(asOfRaw)
      ? `${asOfRaw}-01`
      : null;
  // Same deterministic no-em-dash scrub as signal notes — arr_source is
  // report-facing provenance text.
  const source =
    typeof rec.arrDisclosedSource === "string" && rec.arrDisclosedSource.trim().length > 0
      ? rec.arrDisclosedSource.replace(/\u2014/g, "--").trim()
      : null;
  const basis =
    rec.arrDisclosedBasis === "point_in_time" || rec.arrDisclosedBasis === "run_rate"
      ? rec.arrDisclosedBasis
      : null;

  if (amount === null || asOf === null || source === null || basis === null) return null;
  return { amount, asOf, source, basis };
}

// Scores all 8 pillars for a single company via Claude + web search, using
// the same PILLARS rubric (measures/signals) that drives every other part
// of the app (tiers, composite, gap notes). Throws on any failure — callers
// decide how to handle a single company's scoring failure.
export async function scoreCompanyPillars(company: ScoreTarget, firm: FirmContext): Promise<CompanyScoring> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const message = await client.messages.create({
    model: SCORING_MODEL,
    max_tokens: 8192,
    system: buildSystemPrompt(),
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 12 }],
    messages: [
      {
        role: "user",
        content: `Company name: ${company.name}\nCompany website: ${company.website ?? "unknown"}\nParent PE/VC firm: ${firm.name}${firm.website ? ` (${firm.website})` : ""}\n\nResearch this company and score all 8 pillars as instructed.`,
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude response was truncated (hit max_tokens) before completing pillar scoring");
  }

  const text = extractText(message);
  if (!text.trim()) {
    throw new Error("Claude returned no text content");
  }

  // Pillar scores are strict (throw on any problem); the profile is
  // best-effort (never throws), so a weak profile can't sink a good scoring.
  return { pillarResults: parsePillarResults(text), profile: parseCompanyProfile(text) };
}
