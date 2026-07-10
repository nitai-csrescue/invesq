import { Router, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger.js";

const router = Router();

// ---------------------------------------------------------------------------
// Copy-policy overrides
//
// Raviga is the only tenant wired to the live-data demo pipeline (connectors,
// weighted /19.5 scoring, Live Signals, private-call/Glassdoor sourcing). All
// other tenants only ever have Phase 1 external-signal diagnostics, so the AI
// draft must never claim NRR/GRR figures or private-source evidence it
// doesn't actually have for them.
//
// Separately, some portfolio companies use "member" rather than "customer"
// (e.g. CEATI International, an association) — matched by name since the
// client only sends a lightweight company payload, not the full firm/company
// record.
// ---------------------------------------------------------------------------
const COMPANY_COPY_OVERRIDES: Array<{ match: RegExp; note: string }> = [
  {
    match: /\bceati\b/i,
    note: 'This company is a membership-based association — refer to its customers as "members", never "customers".',
  },
];

function companyCopyNotes(company: Record<string, unknown> | null | undefined): string {
  const name = String(company?.name ?? "");
  const notes = COMPANY_COPY_OVERRIDES.filter((o) => o.match.test(name)).map((o) => o.note);
  return notes.length > 0 ? `\n\nCopy policy: ${notes.join(" ")}` : "";
}

const NON_RAVIGA_COPY_POLICY =
  "\n\nData-source policy: this firm's diagnostic is Phase 1 external-signal only — there is no live NRR/GRR revenue-retention data, connector telemetry, or private-source evidence (e.g. Glassdoor reviews, private call transcripts) for this tenant. " +
  "Never cite NRR, GRR, or any specific retention percentage, and never reference Glassdoor or call/transcript sourcing. Frame findings only in terms of the pillar scores and evidence actually provided.";

// ---------------------------------------------------------------------------
// System prompts by audience mode
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  mode: string,
  company: Record<string, unknown> | null | undefined,
  isRaviga: boolean,
): string {
  const gaps = company?.gaps as Array<{ pillarName: string; score: number; note: string }> | undefined;
  // A company with zero scored pillars (displayMax 0) has no composite —
  // never present "0/0", which would read as a scored failure.
  const compositeText =
    Number(company?.displayMax ?? 0) > 0
      ? `${company?.composite}/${company?.displayMax}`
      : "N/A — all pillars Insufficient Data; never describe the composite as 0 or 0/0";
  const companyCtx = company
    ? `\n\nCompany context:\n- Name: ${company.name}\n- Tier ${company.tier} (${company.tierLabel})\n- Phase 1 composite: ${compositeText}\n- ARR: ${company.arrDisplay}\n- Summary: ${String(company.summary ?? "").slice(0, 300)}\n- Engagement recommendation: ${company.engagement}\n- Open gaps (priority order): ${(gaps ?? []).map((g) => `[${g.score === 0 ? "High" : "Medium"}] ${g.pillarName}: ${g.note}`).join("; ")}`
    : "";
  const policySuffix = (isRaviga ? "" : NON_RAVIGA_COPY_POLICY) + companyCopyNotes(company);

  if (mode === "portco") {
    return (
      "You are INVESQ, an AI assistant helping portfolio company CS leaders improve their customer success operations. " +
      "Frame all insights as forward-looking structural opportunities, not personal critiques. " +
      "Use collaborative, constructive language. Ground all recommendations in the diagnostic data provided. " +
      "Do not fabricate metrics not provided. Avoid jargon that implies blame. " +
      "Keep responses concise and actionable (under 350 words)." +
      companyCtx +
      policySuffix
    );
  }

  return (
    "You are INVESQ, an AI assistant supporting PE operators conducting operational due diligence on portfolio companies. " +
    "Be direct, data-driven, and use PE operational vocabulary. " +
    (isRaviga ? "Focus on value creation opportunities, NRR impact, and actionable next steps. " : "Focus on value creation opportunities and actionable next steps. ") +
    "Do not fabricate metrics not provided in the context. " +
    "Keep responses concise and boardroom-ready (under 350 words)." +
    companyCtx +
    policySuffix
  );
}

// ---------------------------------------------------------------------------
// Canned response — deterministic from real company data
// ---------------------------------------------------------------------------
function buildCannedResponse(
  mode: string,
  prompt: string,
  company: Record<string, unknown> | null | undefined,
  isRaviga: boolean,
): string {
  const name = String(company?.name ?? "this company");
  const tierLabel = String(company?.tierLabel ?? "assessed");
  const arr = String(company?.arrDisplay ?? "undisclosed");
  const gaps =
    (company?.gaps as Array<{ pillarName: string; score: number; note: string }> | undefined) ?? [];
  const topGap = gaps[0];
  const lp = (prompt ?? "").toLowerCase();

  if (lp.includes("risk") || lp.includes("memo") || lp.includes("ic")) {
    const top3 = gaps.slice(0, 3);
    if (top3.length === 0) {
      return `**Top operational risks — ${name}**\n\nNo critical gaps identified at the current assessment tier. Run a Phase 2 diagnostic to surface deeper findings.`;
    }
    return (
      `**Top ${top3.length} operational risks — ${name}**\n\n` +
      top3
        .map(
          (g, i) =>
            `${i + 1}. **${g.pillarName}** (${g.score === 0 ? "High severity" : "Medium severity"}) — ${g.note}`,
        )
        .join("\n\n") +
      "\n\n*Source: Phase 1 external-signal diagnostic. Phase 2 validates with CRM, Gainsight, and product telemetry.*"
    );
  }

  if (
    lp.includes("gameplan") ||
    lp.includes("100-day") ||
    lp.includes("roadmap") ||
    lp.includes("plan")
  ) {
    if (!topGap)
      return `**100-day gameplan — ${name}**\n\nNo open gaps identified. ${name} appears operationally strong across assessed pillars.`;
    return (
      `**100-day operational gameplan — ${name}**\n\n` +
      `**Day 1–20:** Align leadership on the ${topGap.pillarName.toLowerCase()} gap. Define success metrics and confirm ownership.\n\n` +
      `**Day 21–40:** Design the intervention. Map current-state workflows and identify resource requirements.\n\n` +
      `**Day 41–60:** Execute initial changes. Track early indicators weekly.\n\n` +
      `**Day 61–90:** Measure, adjust, and stabilize. Confirm process adoption.\n\n` +
      `**Day 91–100:** Document for scale. Brief stakeholders on progress.\n\n` +
      `*Primary finding: ${topGap.note}*`
    );
  }

  if (
    lp.includes("board") ||
    lp.includes("one-pager") ||
    lp.includes("brief") ||
    lp.includes("summary")
  ) {
    return (
      `**Board-ready summary — ${name}**\n\n` +
      `${name} is a Tier ${company?.tier ?? "–"} (${tierLabel}) company with ${arr} ARR. ` +
      `Phase 1 external diagnostics identify ${gaps.length} operational gap${gaps.length !== 1 ? "s" : ""} in customer success infrastructure.\n\n` +
      `**Top finding:** ${topGap ? `${topGap.pillarName} — ${topGap.note}` : "No critical gaps at current assessment."}\n\n` +
      `**INVESQ recommendation:** ${String(company?.engagement ?? "Full diagnostic engagement recommended to scope the value-creation opportunity.")}\n\n` +
      `*Phase 1 external-signal data. Phase 2 engagement confirms and extends findings.*`
    );
  }

  if (lp.includes("benchmark") || lp.includes("compare") || lp.includes("portfolio")) {
    return (
      `**Benchmark context — ${name}**\n\n` +
      `${name} is positioned at Tier ${company?.tier ?? "–"} with a Phase 1 composite of ${
        Number(company?.displayMax ?? 0) > 0
          ? `${company?.composite ?? "–"}/${company?.displayMax ?? 16}`
          : "N/A (all pillars Insufficient Data)"
      }.\n\n` +
      `For a full cross-portfolio comparison, navigate to the Benchmarks page to see ${name}'s delta vs. portfolio median on composite score, ARR, and 6-month forecast trajectory.\n\n` +
      (isRaviga
        ? `*Phase 1 benchmark comparisons are directional. Phase 2 data unlocks cohort-level NRR comparisons.*`
        : `*Phase 1 benchmark comparisons are directional. Phase 2 data unlocks deeper cross-portfolio comparisons.*`)
    );
  }

  const modeNote = mode === "portco" ? "PortCo-Facing" : "PE Ops";
  return (
    `**INVESQ Draft (${modeNote} mode)**\n\n` +
    `${name} — Tier ${company?.tier ?? "–"} · ${arr} ARR · ${gaps.length} open finding${gaps.length !== 1 ? "s" : ""}.\n\n` +
    (topGap ? `Primary gap: ${topGap.pillarName} — ${topGap.note}\n\n` : "") +
    `To enable live AI drafting, add an ANTHROPIC_API_KEY to Replit Secrets.`
  );
}

// ---------------------------------------------------------------------------
// POST /invesq/draft
// ---------------------------------------------------------------------------
router.post("/draft", async (req: Request, res: Response) => {
  const { mode, prompt, company, firmSlug } = req.body as {
    mode: string;
    prompt: string;
    company: Record<string, unknown> | null | undefined;
    firmSlug?: string;
  };

  const isRaviga = firmSlug === "raviga";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    logger.info("ANTHROPIC_API_KEY not set — returning canned response");
    return res.json({
      draft: buildCannedResponse(mode, prompt, company, isRaviga),
      source: "canned",
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(mode, company, isRaviga),
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return res.json({ draft: text, source: "ai" });
  } catch (err) {
    logger.error({ err }, "Anthropic API error — returning canned fallback");
    return res.json({
      draft: buildCannedResponse(mode, prompt, company, isRaviga),
      source: "canned",
    });
  }
});

export default router;
