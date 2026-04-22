import { archInsights, type ArchInsight } from "@/data/architectureInsights";
import type { Persona } from "@/lib/persona";

/**
 * Lightweight, deterministic "AI search" over the canned insight catalog.
 * No model call — keyword + topic matching keeps the demo fast and stable.
 * Returns 2–4 insights most relevant to the query, biased toward the active
 * persona but not strictly filtered by it.
 */

const TOPIC_KEYWORDS: { topic: string; words: string[]; kinds?: ArchInsight["kind"][] }[] = [
  { topic: "risk", words: ["risk", "churn", "at risk", "losing", "danger", "warning"], kinds: ["risk", "pain"] },
  { topic: "friction", words: ["friction", "stuck", "stall", "stalled", "slow", "block", "frustrat", "experience", "experiencing"], kinds: ["pain", "risk"] },
  { topic: "ttv", words: ["ttv", "time to value", "onboard", "implementation", "launch"] },
  { topic: "expansion", words: ["expansion", "expand", "upsell", "growth", "grow", "opportunity", "revenue", "arr"], kinds: ["opportunity"] },
  { topic: "support", words: ["support", "ticket", "case", "escalation", "backlog"] },
  { topic: "data", words: ["data", "quality", "crm", "salesforce", "integration", "pipeline"] },
  { topic: "model", words: ["model", "ai", "decision", "accuracy", "drift"] },
  { topic: "partner", words: ["partner", "channel"] },
  { topic: "attention", words: ["attention", "priorit", "focus", "today", "now"] },
];

export interface InsightSearchResult {
  query: string;
  insights: ArchInsight[];
  /** Short natural-language summary suitable for a one-line answer. */
  summary: string;
}

function scoreInsight(insight: ArchInsight, q: string, persona: Persona): number {
  const text = `${insight.title} ${insight.body} ${(insight.sources ?? []).join(" ")} ${insight.kind}`.toLowerCase();
  let score = 0;

  const matchedTopics = new Set<string>();
  for (const { topic, words, kinds } of TOPIC_KEYWORDS) {
    const hit = words.some((w) => q.includes(w));
    if (!hit) continue;
    matchedTopics.add(topic);
    for (const w of words) if (text.includes(w)) score += 2;
    if (kinds && kinds.includes(insight.kind)) score += 3;
  }

  // Direct token matches in title/body.
  const tokens = q.split(/\s+/).filter((t) => t.length > 3);
  for (const t of tokens) if (text.includes(t)) score += 1;

  // Severity bias.
  score += insight.severity === "high" ? 2 : insight.severity === "medium" ? 1 : 0;

  // Persona bias (soft, not strict).
  if (insight.personas.includes(persona)) score += 1;

  return score;
}

export function searchInsights(query: string, persona: Persona): InsightSearchResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { query, insights: [], summary: "" };
  }

  const scored = archInsights
    .map((ins) => ({ ins, score: scoreInsight(ins, q, persona) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Always return at least 2 insights (fall back to highest-severity defaults)
  // and cap at 4.
  let insights = scored.slice(0, 4).map((x) => x.ins);
  if (insights.length < 2) {
    const fallback = archInsights
      .filter((i) => !insights.some((x) => x.id === i.id))
      .sort((a, b) => {
        const sev = { high: 0, medium: 1, low: 2 };
        return sev[a.severity] - sev[b.severity];
      })
      .slice(0, 2 - insights.length);
    insights = [...insights, ...fallback];
  }

  const high = insights.filter((i) => i.severity === "high").length;
  const summary = high > 0
    ? `Found ${insights.length} relevant insights — ${high} high severity. Top ones below.`
    : `Found ${insights.length} relevant insights based on your question.`;

  return { query, insights, summary };
}

export const SEARCH_SUGGESTIONS = [
  "Where are customers experiencing friction?",
  "What is the biggest risk right now?",
  "Which accounts need attention?",
] as const;
