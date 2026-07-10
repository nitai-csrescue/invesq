import { PILLARS } from "@workspace/portfolio-engine";
import { getAnthropicClient, extractText, extractJsonFence } from "../anthropic.js";

const SCORING_MODEL = "claude-sonnet-4-6";

export interface PillarResult {
  score: 0 | 1 | 2 | "Insufficient Data";
  evidence: string;
}

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
    "Respond with ONLY a single fenced ```json code block (no prose before or after it) containing one JSON object with exactly these 8 keys (the pillar ids above): \"org\", \"onboarding\", \"health\", \"escalation\", \"revenue\", \"leadership\", \"planning\", \"ai\".",
    "Each key's value must be an object with exactly these two fields:",
    '- "score": 0, 1, 2, or the literal string "Insufficient Data"',
    '- "evidence": a 1-3 sentence explanation citing the specific fact(s) you found (or explicitly stating what you searched for and could not find, if "Insufficient Data")',
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

// Scores all 8 pillars for a single company via Claude + web search, using
// the same PILLARS rubric (measures/signals) that drives every other part
// of the app (tiers, composite, gap notes). Throws on any failure — callers
// decide how to handle a single company's scoring failure.
export async function scoreCompanyPillars(company: ScoreTarget, firm: FirmContext): Promise<Record<string, PillarResult>> {
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

  return parsePillarResults(text);
}
