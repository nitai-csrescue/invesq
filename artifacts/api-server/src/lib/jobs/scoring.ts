import { PILLARS } from "@workspace/portfolio-engine";
import { getAnthropicClient, extractText, extractJsonFence } from "../anthropic.js";

const SCORING_MODEL = "claude-sonnet-4-6";

export interface PillarResult {
  score: 0 | 1 | 2 | "Insufficient Data";
  evidence: string;
}

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
  summary: string; // executive summary; "" when the model returned none
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

function buildSystemPrompt(): string {
  const pillarBlock = PILLARS.map(
    (p, i) =>
      `${i + 1}. "${p.id}" — ${p.name}: ${p.measures} Look for signals such as: ${p.signals}.`,
  ).join("\n");

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
    "Respond with ONLY a single fenced ```json code block (no prose before or after it) containing one JSON object with these keys:",
    "1. The 8 pillar keys (the pillar ids above): \"org\", \"onboarding\", \"health\", \"escalation\", \"revenue\", \"leadership\", \"planning\", \"ai\". Each value must be an object with exactly these two fields:",
    '   - "score": 0, 1, 2, or the literal string "Insufficient Data"',
    '   - "evidence": a 1-3 sentence explanation citing the specific fact(s) you found (or explicitly stating what you searched for and could not find, if "Insufficient Data")',
    '2. A "profile" key whose value is an object with exactly these fields:',
    '   - "sector": string — the company\'s software sub-sector / vertical (e.g. "Healthcare revenue-cycle SaaS", "DevOps tooling"). Use "Unconfirmed" if you cannot verify it.',
    '   - "hq": string — headquarters as "City, ST" or "City, Country" (e.g. "Austin, TX"). Use "Unconfirmed" if you cannot verify it.',
    '   - "employeesDisplay": string — approximate headcount as a string, e.g. "175" or "150-200". NEVER fabricate a precise figure; use "Unconfirmed" if you have no real signal.',
    '   - "arrDisplay": string — human-readable ARR estimate, e.g. "$10M-$20M". Use "Undisclosed" if you have no real signal.',
    '   - "arrLow": number (US dollars, e.g. 10000000) or null — low end of the ARR range; null if undisclosed.',
    '   - "arrHigh": number (US dollars) or null — high end of the ARR range; null if undisclosed.',
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
    };
  }

  if (missing.length > 0 || invalid.length > 0) {
    throw new Error(
      `Claude scoring response was missing or malformed for pillar(s): missing=[${missing.join(", ")}] invalid=[${invalid.join(", ")}]. Raw text: ${text.slice(0, 800)}`,
    );
  }

  return results;
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
    summary: str(rec.summary, DEFAULT_PROFILE.summary),
  };
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
