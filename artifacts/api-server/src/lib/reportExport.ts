import { and, desc, eq } from "drizzle-orm";
import { db, assessmentsTable, companiesTable, firmsTable, reportExportsTable } from "@workspace/db";
import type { AdminCompanyReportData, DiagnosticReportData } from "@workspace/api-zod";
import { PILLARS, getTier, textToScore } from "@workspace/portfolio-engine";
import { getAnthropicClient, extractText, extractJsonFence } from "./anthropic.js";
import { fetchScoringRubricText } from "./notion.js";
import { logger } from "./logger.js";

// Bump whenever the generation prompt or the shape of what it's asked to
// produce changes meaningfully enough that previously-generated reports
// should no longer be served as "current" — a bump naturally produces fresh
// report_exports rows instead of mutating/invalidating old ones.
const RUBRIC_VERSION = "v2";
const NARRATIVE_MODEL = "claude-sonnet-4-6";

type Company = typeof companiesTable.$inferSelect;
type Firm = typeof firmsTable.$inferSelect;
type Assessment = typeof assessmentsTable.$inferSelect;

export class CompanyNotFoundError extends Error {}
export class NoAssessmentError extends Error {}

interface BaseReportData {
  reportData: DiagnosticReportData;
  composite: number;
  compositeMax: number;
  tier: string;
  pillarScores: Record<string, number | null>;
  pillarEvidence: Record<string, string | null>;
  p6Label: string;
  p6RawEvidence: string | null;
}

async function loadCompanyContext(
  companyId: number,
): Promise<{ company: Company; firm: Firm; assessment: Assessment }> {
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  if (!company) throw new CompanyNotFoundError(`Company ${companyId} not found`);

  const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.id, company.firmId)).limit(1);
  if (!firm) throw new Error(`Company ${companyId} references missing firm ${company.firmId}`);

  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.companyId, companyId))
    .orderBy(desc(assessmentsTable.date))
    .limit(1);
  if (!assessment) throw new NoAssessmentError(`Company ${companyId} has no assessments yet`);

  return { company, firm, assessment };
}

// Assembles the parts of report-data.json that are fully derivable from the
// DB with no AI call: raw scores, composite/tier, and the P6 recommendation
// (mechanically derived from the p6 score). Fields that need synthesis
// (execSummary, compositeContext, existingSystems, pathForward,
// pillarSignals, gap impact/recommendation, nextSteps) are left at their
// schema-designed blank fallback ("" / []) here — callers either serve that
// as-is (no assessment data source exists) or hand it to
// `generateNarrative` to fill in.
function buildBaseReportData(company: Company, firm: Firm, assessment: Assessment): BaseReportData {
  const scores = {
    p1: assessment.p1,
    p2: assessment.p2,
    p3: assessment.p3,
    p4: assessment.p4,
    p5: assessment.p5,
    p6: assessment.p6,
    p7: assessment.p7,
    p8: assessment.p8,
  };
  const evidence = {
    p1: assessment.p1Evidence,
    p2: assessment.p2Evidence,
    p3: assessment.p3Evidence,
    p4: assessment.p4Evidence,
    p5: assessment.p5Evidence,
    p6: assessment.p6Evidence,
    p7: assessment.p7Evidence,
    p8: assessment.p8Evidence,
  };

  const pillarKeys = PILLARS.map((_, index) => `p${index + 1}` as keyof typeof scores);
  const pillarScores = Object.fromEntries(
    PILLARS.map((pillar, index) => [pillar.id, textToScore(scores[pillarKeys[index]])]),
  );
  const pillarEvidenceById = Object.fromEntries(
    PILLARS.map((pillar, index) => [pillar.id, evidence[pillarKeys[index]]]),
  );

  const scoredPillars = PILLARS.filter((p) => pillarScores[p.id] !== null);
  const composite = scoredPillars.reduce((sum, p) => sum + (pillarScores[p.id] as number), 0);
  const compositeMax = scoredPillars.length * 2;
  const tierComposite = PILLARS.reduce((sum, p) => {
    const s = pillarScores[p.id];
    return sum + (s === null ? 1 : s);
  }, 0);
  const tier = getTier(tierComposite);

  const reportScores = Object.fromEntries(
    PILLARS.map((pillar, index) => {
      const score = pillarScores[pillar.id];
      return [pillarKeys[index], score === null ? "NA" : score];
    }),
  ) as DiagnosticReportData["scores"];

  const reportEvidence = Object.fromEntries(
    PILLARS.map((pillar, index) => [pillarKeys[index], evidence[pillarKeys[index]] ?? ""]),
  ) as DiagnosticReportData["pillarEvidence"];

  const reportSignals = Object.fromEntries(PILLARS.map((_, index) => [pillarKeys[index], ""])) as DiagnosticReportData["pillarSignals"];

  const leadershipIndex = PILLARS.findIndex((p) => p.id === "leadership");
  const p6Score = leadershipIndex >= 0 ? pillarScores[PILLARS[leadershipIndex].id] : null;
  const p6Evidence = leadershipIndex >= 0 ? evidence[pillarKeys[leadershipIndex]] : null;
  const p6Label = p6Score === 2 ? "Retain and Develop" : p6Score === 1 ? "Augment" : p6Score === 0 ? "Replace" : "";
  const p6Recommendation = p6Label ? (p6Evidence ? `${p6Label} — ${p6Evidence}` : p6Label) : "";

  const gaps = [...PILLARS]
    .map((pillar, index) => ({
      pillar,
      index,
      effectiveScore: pillarScores[pillar.id] === null ? 1 : (pillarScores[pillar.id] as number),
      evidenceText: evidence[pillarKeys[index]],
    }))
    .sort((a, b) => a.effectiveScore - b.effectiveScore || a.index - b.index)
    .slice(0, 3)
    .map(({ pillar, evidenceText }) => ({
      title: pillar.name,
      description: evidenceText ?? pillar.gapNote,
      impact: "",
      recommendation: "",
    }));

  const reportData: DiagnosticReportData = {
    companyName: company.name,
    parentFund: firm.name,
    preparedForName: "",
    preparedForTitle: "",
    reportDate: new Date().toISOString().slice(0, 10),
    csHeadcount: "",
    execSummary: [],
    compositeContext: "",
    existingSystems: "",
    pathForward: "",
    scores: reportScores,
    pillarSignals: reportSignals,
    pillarEvidence: reportEvidence,
    p6Recommendation,
    gaps,
    nextSteps: [],
  };

  return {
    reportData,
    composite,
    compositeMax,
    tier: `Tier ${tier.id} · ${tier.label}`,
    pillarScores,
    pillarEvidence: pillarEvidenceById,
    p6Label,
    p6RawEvidence: p6Evidence,
  };
}

function fallbackRubricText(): string {
  return PILLARS.map(
    (p, i) =>
      `${i + 1}. ${p.name} (${p.id}) — measures: ${p.measures} PE value: ${p.peValue}. Unaddressed-gap framing: ${p.gapNote}`,
  ).join("\n");
}

interface NarrativeResult {
  execSummary: string[];
  compositeContext: string;
  existingSystems: string;
  pathForward: string;
  pillarSignals: Record<string, string>;
  gapDetails: Array<{ title: string; impact: string; recommendation: string }>;
  nextSteps: string[];
  p6RecommendationRationale: string;
}

function buildNarrativeSystemPrompt(rubricText: string): string {
  return [
    "You are a senior operational due-diligence analyst at INVESQ, writing the narrative sections of a Diagnostic Report for a PE/VC firm about one of its portfolio companies.",
    "You are given that company's already-scored 8-pillar CS diagnostic (scores + evidence) — you are NOT scoring anything and must NOT invent new facts, scores, or evidence beyond what is provided.",
    "",
    "Ground your writing in the scoring rubric and cowork instructions below (paraphrase and apply its intent — do not just copy sentences from it):",
    "---",
    rubricText.slice(0, 12000),
    "---",
    "",
    "TONE POLICY (strict, non-negotiable):",
    "- Forward-looking and structural: describe systems, processes, and organizational design — never the competence, character, or performance of named individuals.",
    "- Never issue personal judgments (no \"the CS leader is weak/ineffective\", no blame). Reframe any such observation as a structural/organizational gap instead.",
    "- NEVER include a named individual's name anywhere in your output, even if a name appears in the evidence given to you. Refer to roles only (e.g. \"the CS leader\", \"the current Director-level CS role\"), never a person's name, prior employer, or personal career background.",
    "- Written for a PE/VC investment committee audience: precise, evidence-grounded, no hype, no filler adjectives.",
    "- Every claim must trace back to the provided scores/evidence — do not fabricate specifics (numbers, tools) that were not given to you, beyond stripping personal names as instructed above.",
    "",
    "Respond with ONLY a single fenced ```json code block (no prose before or after) containing one JSON object with exactly these keys:",
    '- "execSummary": array of 2-4 short paragraph strings (overall diagnostic summary and investment-relevant framing)',
    '- "compositeContext": one paragraph contextualizing the composite score/tier for an investment committee',
    '- "existingSystems": one paragraph describing the CS tooling/process stack that IS evidenced (or explicitly noting its absence) — structural, not personal',
    '- "pathForward": one paragraph on the overall remediation path across pillars',
    '- "pillarSignals": object with exactly 8 keys "p1".."p8" (in pillar order given), each a single short sentence naming what the signals show for that pillar (blank string "" only if truly no evidence was provided for that pillar)',
    '- "gapDetails": array of exactly 3 objects, one per gap given to you IN THE SAME ORDER, each with "title" (echo the given title exactly), "impact" (1-2 sentences on investment/value impact), "recommendation" (1-2 sentences, structural/process-level remediation, never targeting a named individual)',
    '- "nextSteps": array of 3-5 short, concrete, structural action strings for the first 90 days',
    '- "p6RecommendationRationale": 1-2 sentences justifying the CS-leadership recommendation label you were given, describing ONLY the structural gap (title level, reporting line, mandate scope, board visibility) — never the named individual\'s personal background, prior employers, or career pedigree',
  ].join("\n");
}

function buildNarrativeUserPrompt(base: BaseReportData, gaps: DiagnosticReportData["gaps"]): string {
  const pillarLines = PILLARS.map((pillar, index) => {
    const score = base.pillarScores[pillar.id];
    const scoreLabel = score === null ? "Insufficient Data" : score;
    const evidence = base.pillarEvidence[pillar.id] || "(no evidence on file)";
    return `p${index + 1} — ${pillar.name}: score=${scoreLabel}. Evidence: ${evidence}`;
  }).join("\n");

  const gapLines = gaps.map((g, i) => `${i + 1}. "${g.title}" — ${g.description}`).join("\n");

  return [
    `Company: ${base.reportData.companyName}`,
    `Parent fund: ${base.reportData.parentFund}`,
    `Composite score: ${base.composite}/${base.compositeMax}`,
    `Tier: ${base.tier}`,
    "",
    "Pillar scores and evidence:",
    pillarLines,
    "",
    "The 3 lowest-scoring pillars (already selected — do not change the titles or add/remove gaps):",
    gapLines,
    "",
    `CS-leadership recommendation label (already decided from the p6 score — do not change it, just justify it): "${base.p6Label || "(no label — insufficient data)"}"`,
    `Raw p6 (CS Leadership) evidence on file (may contain a named individual — you MUST NOT repeat any name from this in your output, per the tone policy): ${base.p6RawEvidence ?? "(no evidence on file)"}`,
    "",
    "Write the narrative sections now, per the system instructions.",
  ].join("\n");
}

function isNarrativeResult(value: unknown, expectedGapTitles: string[]): value is NarrativeResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  if (!Array.isArray(r.execSummary) || !r.execSummary.every((s) => typeof s === "string")) return false;
  if (typeof r.compositeContext !== "string") return false;
  if (typeof r.existingSystems !== "string") return false;
  if (typeof r.pathForward !== "string") return false;
  if (typeof r.pillarSignals !== "object" || r.pillarSignals === null) return false;
  const signals = r.pillarSignals as Record<string, unknown>;
  for (let i = 1; i <= 8; i++) {
    if (typeof signals[`p${i}`] !== "string") return false;
  }
  if (!Array.isArray(r.gapDetails) || r.gapDetails.length !== expectedGapTitles.length) return false;
  for (const g of r.gapDetails) {
    if (typeof g !== "object" || g === null) return false;
    const gr = g as Record<string, unknown>;
    if (typeof gr.title !== "string" || typeof gr.impact !== "string" || typeof gr.recommendation !== "string") {
      return false;
    }
  }
  if (!Array.isArray(r.nextSteps) || !r.nextSteps.every((s) => typeof s === "string")) return false;
  if (typeof r.p6RecommendationRationale !== "string") return false;
  return true;
}

async function generateNarrative(base: BaseReportData): Promise<NarrativeResult> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const rubricText = (await fetchScoringRubricText()) ?? fallbackRubricText();
  const expectedGapTitles = base.reportData.gaps.map((g) => g.title);

  const message = await client.messages.create({
    model: NARRATIVE_MODEL,
    max_tokens: 4096,
    system: buildNarrativeSystemPrompt(rubricText),
    messages: [{ role: "user", content: buildNarrativeUserPrompt(base, base.reportData.gaps) }],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude narrative response was truncated (hit max_tokens)");
  }

  const text = extractText(message);
  if (!text.trim()) {
    throw new Error("Claude returned no text content for report narrative");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonFence(text));
  } catch (err) {
    throw new Error(
      `Claude narrative response was not valid JSON (${(err as Error).message}). Raw text: ${text.slice(0, 500)}`,
    );
  }

  if (!isNarrativeResult(parsed, expectedGapTitles)) {
    throw new Error(`Claude narrative response was malformed. Raw text: ${text.slice(0, 800)}`);
  }

  return parsed;
}

function mergeNarrative(base: BaseReportData, narrative: NarrativeResult): DiagnosticReportData {
  return {
    ...base.reportData,
    execSummary: narrative.execSummary,
    compositeContext: narrative.compositeContext,
    existingSystems: narrative.existingSystems,
    pathForward: narrative.pathForward,
    pillarSignals: {
      p1: narrative.pillarSignals.p1,
      p2: narrative.pillarSignals.p2,
      p3: narrative.pillarSignals.p3,
      p4: narrative.pillarSignals.p4,
      p5: narrative.pillarSignals.p5,
      p6: narrative.pillarSignals.p6,
      p7: narrative.pillarSignals.p7,
      p8: narrative.pillarSignals.p8,
    },
    gaps: base.reportData.gaps.map((gap, i) => ({
      ...gap,
      impact: narrative.gapDetails[i]?.impact ?? "",
      recommendation: narrative.gapDetails[i]?.recommendation ?? "",
    })),
    nextSteps: narrative.nextSteps,
    p6Recommendation: base.p6Label
      ? narrative.p6RecommendationRationale
        ? `${base.p6Label} — ${narrative.p6RecommendationRationale}`
        : base.p6Label
      : "",
  };
}

function toResponse(
  companyId: number,
  assessmentDate: string,
  base: Pick<BaseReportData, "composite" | "compositeMax" | "tier">,
  reportData: DiagnosticReportData,
  generatedAt: string | null,
  model: string | null,
): AdminCompanyReportData {
  return {
    reportData,
    meta: {
      companyId,
      assessmentDate,
      composite: base.composite,
      compositeMax: base.compositeMax,
      tier: base.tier,
      generatedAt,
      model,
    },
  };
}

// Read-only: serves a previously-generated report_exports row for the
// company's current (latest assessment, current RUBRIC_VERSION) if one
// exists, or the fully-derivable-with-no-AI base assembly otherwise. Never
// calls Claude — safe to call from a GET route that may be refetched
// (React Query, page reloads, etc.) without risking duplicate paid calls.
export async function getReportData(companyId: number): Promise<AdminCompanyReportData> {
  const { company, firm, assessment } = await loadCompanyContext(companyId);
  const base = buildBaseReportData(company, firm, assessment);

  const [cached] = await db
    .select()
    .from(reportExportsTable)
    .where(and(eq(reportExportsTable.assessmentId, assessment.id), eq(reportExportsTable.rubricVersion, RUBRIC_VERSION)))
    .orderBy(desc(reportExportsTable.createdAt))
    .limit(1);

  if (cached) {
    return toResponse(
      companyId,
      assessment.date,
      base,
      cached.reportData as DiagnosticReportData,
      cached.createdAt.toISOString(),
      cached.model,
    );
  }

  return toResponse(companyId, assessment.date, base, base.reportData, null, null);
}

// Generates (via Claude) and persists the narrative sections of the report,
// or returns the existing cached row for this (assessment, rubric version)
// pair unchanged if one already exists — so calling this repeatedly (e.g. a
// user clicking "Generate" twice) never re-triggers a paid Claude call
// unless the underlying assessment or rubric version actually changed.
export async function getOrGenerateReportExport(companyId: number): Promise<AdminCompanyReportData> {
  const { company, firm, assessment } = await loadCompanyContext(companyId);
  const base = buildBaseReportData(company, firm, assessment);

  const [cached] = await db
    .select()
    .from(reportExportsTable)
    .where(and(eq(reportExportsTable.assessmentId, assessment.id), eq(reportExportsTable.rubricVersion, RUBRIC_VERSION)))
    .orderBy(desc(reportExportsTable.createdAt))
    .limit(1);

  if (cached) {
    logger.info({ companyId, assessmentId: assessment.id }, "Serving cached report export (no Claude call)");
    return toResponse(
      companyId,
      assessment.date,
      base,
      cached.reportData as DiagnosticReportData,
      cached.createdAt.toISOString(),
      cached.model,
    );
  }

  logger.info({ companyId, assessmentId: assessment.id }, "Generating report export narrative via Claude");
  const narrative = await generateNarrative(base);
  const reportData = mergeNarrative(base, narrative);

  const [inserted] = await db
    .insert(reportExportsTable)
    .values({
      companyId,
      assessmentId: assessment.id,
      rubricVersion: RUBRIC_VERSION,
      reportData,
      model: NARRATIVE_MODEL,
    })
    .returning();

  return toResponse(companyId, assessment.date, base, reportData, inserted.createdAt.toISOString(), inserted.model);
}
