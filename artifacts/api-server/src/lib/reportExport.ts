import { and, desc, eq } from "drizzle-orm";
import {
  db,
  assessmentsTable,
  companiesTable,
  firmsTable,
  reportExportsTable,
  reportRevisionsTable,
  reportValidationsTable,
  driveShipmentsTable,
} from "@workspace/db";
import type {
  AdminCompanyReportData,
  AdminReportWorkflow,
  DiagnosticReportData,
  DriveShipmentState,
  ReportRevisionInput,
  ReportRevisionState,
  ReportValidationState,
} from "@workspace/api-zod";
import { PILLARS, getTier, textToScore, type FirmMeta } from "@workspace/portfolio-engine";
import { getAnthropicClient, extractText, extractJsonFence } from "./anthropic.js";
import { fetchScoringRubricText } from "./notion.js";
import { redactNamedIndividuals } from "./nameRedaction.js";
import { getConfiguredValidators } from "./validators.js";
import type { ReportValidationStamp } from "./pdf/types.js";
import { logger } from "./logger.js";

// Bump whenever the generation prompt or the shape of what it's asked to
// produce changes meaningfully enough that previously-generated reports
// should no longer be served as "current" — a bump naturally produces fresh
// report_exports rows instead of mutating/invalidating old ones.
// v3 (2026-07-10): added the hard no-em-dash formatting rule to the tone
// policy below, superseding v2 rows that may contain em-dashes.
// v4 (2026-07-10): fixed a hardcoded em-dash separator in the p6Recommendation
// template string (in both buildBaseReportData and mergeNarrative) that was
// baked into the cached reportData JSON and untouched by the v3 prompt-only
// fix, superseding v3 rows whose p6Recommendation still contains "Label — rationale".
// v5 (2026-07-10): fixed em-dashes in @workspace/portfolio-engine's PILLARS
// gapNote strings, which flow into gaps[].description (line ~138) whenever a
// pillar has no Claude-written evidence narrative and get baked into the
// cached reportData JSON at generation time, superseding v4 rows whose
// fallback gap descriptions still contain the old em-dash gapNote text.
const RUBRIC_VERSION = "v5";
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
  tierId: number;
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
    // Match the portal's "latest assessment" selection exactly: max(date),
    // then max(id) as a deterministic tiebreak. `assessments_company_date_uq`
    // makes a same-date tie impossible today, but the explicit id ordering
    // keeps the PDF's composite in lockstep with the portal engine (which
    // takes the last of asc(date), asc(id)) even if that guard ever changes.
    .orderBy(desc(assessmentsTable.date), desc(assessmentsTable.id))
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
  const p6Recommendation = p6Label ? (p6Evidence ? `${p6Label}: ${p6Evidence}` : p6Label) : "";

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
    tierId: tier.id,
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
    "SCORE ACCURACY (strict, non-negotiable): The composite score and tier given to you in the user message are COMPUTED CONSTANTS derived from the raw pillar data -- they are ground truth. You MUST use them EXACTLY as given. Do NOT recalculate, round, estimate, or paraphrase them. If you reference the composite score anywhere in execSummary or compositeContext, write it as the exact fraction given (e.g. \"12/16\") and use the exact tier label given (e.g. \"Tier 3\"). Any composite number or tier you invent that differs from the given values is an error.",
    "",
    "FORMATTING RULE (strict, non-negotiable): NO EM-DASHES. Ever. Do not use the em-dash character (—) or the en-dash (–) as punctuation anywhere in any field, no matter how natural it feels. Use a period, a comma, or a middot (\u00b7) instead.",
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

  const emSanitized = sanitizeNarrativeEmDashes(parsed);
  return enforceNarrativeScores(emSanitized, base.composite, base.compositeMax, base.tierId);
}

// The prompt's "NO EM-DASHES" formatting rule (see buildNarrativeSystemPrompt)
// is not reliably followed by Claude across generations — verified by
// observing em-dashes reappear in a subsequent generation for the same
// company despite an unchanged, explicit ban. This is a deterministic
// code-level backstop applied to every narrative field so the no-em-dash
// guarantee never depends solely on model compliance. A spaced em/en-dash
// (the common "clause — elaboration" pattern) becomes a comma; any other
// stray occurrence (e.g. an unspaced range like "12–16") becomes a hyphen.
function stripEmDashes(text: string): string {
  return text.replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-");
}

function sanitizeNarrativeEmDashes(narrative: NarrativeResult): NarrativeResult {
  return {
    execSummary: narrative.execSummary.map(stripEmDashes),
    compositeContext: stripEmDashes(narrative.compositeContext),
    existingSystems: stripEmDashes(narrative.existingSystems),
    pathForward: stripEmDashes(narrative.pathForward),
    pillarSignals: Object.fromEntries(
      Object.entries(narrative.pillarSignals).map(([k, v]) => [k, stripEmDashes(v)]),
    ),
    gapDetails: narrative.gapDetails.map((g) => ({
      title: g.title,
      impact: stripEmDashes(g.impact),
      recommendation: stripEmDashes(g.recommendation),
    })),
    nextSteps: narrative.nextSteps.map(stripEmDashes),
    p6RecommendationRationale: stripEmDashes(narrative.p6RecommendationRationale),
  };
}

// Deterministic backstop that ensures composite-score fractions and tier
// numbers in execSummary and compositeContext always match the computed
// values, regardless of what the model generated. This prevents hallucinated
// scores (e.g. "13/16 -- Tier 4") from contradicting the score box (12/16 --
// Tier 3) that is derived from the same raw pillar data.
//
// Strategy:
//   - Any "N/compositeMax" fraction where N != composite is replaced with
//     the correct "composite/compositeMax". The denominator match is exact
//     so unrelated fractions (percentages, ratios) are never touched.
//   - Any "Tier N" where N != tierId is replaced with "Tier {tierId}".
//
// Only execSummary and compositeContext are corrected here because those are
// the only narrative fields where score/tier references are expected. The
// other fields (pathForward, gapDetails, etc.) describe qualitative gaps and
// should not contain composite fractions.
function enforceNarrativeScores(
  narrative: NarrativeResult,
  composite: number,
  compositeMax: number,
  tierId: number,
): NarrativeResult {
  const denomStr = String(compositeMax);
  const correctFraction = `${composite}/${compositeMax}`;
  // Match "N / compositeMax" with optional whitespace around the slash.
  const fractionRe = new RegExp(`\\b\\d+\\s*/\\s*${denomStr}\\b`, "g");

  const fixText = (text: string): string => {
    // Fix composite fractions that share the correct denominator.
    text = text.replace(fractionRe, correctFraction);
    // Fix "Tier N" where N is wrong.
    text = text.replace(/\bTier\s+(\d+)\b/g, (match, n) =>
      parseInt(n, 10) !== tierId ? `Tier ${tierId}` : match,
    );
    return text;
  };

  return {
    ...narrative,
    execSummary: narrative.execSummary.map(fixText),
    compositeContext: fixText(narrative.compositeContext),
  };
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
        ? `${base.p6Label}: ${narrative.p6RecommendationRationale}`
        : base.p6Label
      : "",
  };
}

const LEADERSHIP_PILLAR_NAME = PILLARS.find((p) => p.id === "leadership")?.name ?? "CS Leadership";
const LEADERSHIP_PILLAR_KEY = ((): keyof DiagnosticReportData["pillarEvidence"] => {
  const index = PILLARS.findIndex((p) => p.id === "leadership");
  return `p${index + 1}` as keyof DiagnosticReportData["pillarEvidence"];
})();

// Targeted render-time mitigation (not a data migration): both the
// CS-Leadership gap's `description` AND `pillarEvidence.p6` are verbatim
// passthroughs of that pillar's raw assessment evidence (see
// buildBaseReportData above), which can name a real individual (e.g. "CS is
// led by Kendra Fromm..."). `pillarEvidence.p6` is part of the client-facing
// report schema (renders in the exported PDF's pillar-by-pillar narrative),
// so it carries the same client-facing risk as the gap description. Every
// OTHER field — every other pillar's `pillarEvidence` (p1-p5, p7, p8), every
// other gap's description — is left completely untouched; this only ever
// rewrites these two known fields. The underlying `assessments` row is never
// modified. See replit.md "CS-Leadership gap description redaction" for the
// full rationale.
function sanitizeReportData(reportData: DiagnosticReportData): DiagnosticReportData {
  return {
    ...reportData,
    gaps: reportData.gaps.map((gap) =>
      gap.title === LEADERSHIP_PILLAR_NAME
        ? { ...gap, description: redactNamedIndividuals(gap.description) }
        : gap,
    ),
    pillarEvidence: {
      ...reportData.pillarEvidence,
      [LEADERSHIP_PILLAR_KEY]: redactNamedIndividuals(reportData.pillarEvidence[LEADERSHIP_PILLAR_KEY]),
    },
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
    reportData: sanitizeReportData(reportData),
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

// `companies.website` is not part of the DiagnosticReportData/
// AdminCompanyReportData schema (that schema is the exact report-data.json
// contract), but the branded PDF's Page 7 Sources list needs it. Kept as a
// separate lightweight lookup rather than widening the JSON export contract.
export async function getCompanyWebsite(companyId: number): Promise<string | null> {
  const [company] = await db
    .select({ website: companiesTable.website })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company) throw new CompanyNotFoundError(`Company ${companyId} not found`);
  return company.website;
}

// Distribution posture for a company's owning firm, derived from the firm's
// FirmMeta jsonb. Fail CLOSED: a null/missing meta is treated as internal-only
// (not sendable) so a mis-seeded or pipeline-created firm can never leak a
// client-facing "Prepared by INVESQ" PDF by accident. `requireLogin` firms are
// additionally not exportable via the public tenant route.
export interface FirmDistribution {
  internalOnly: boolean;
  requireLogin: boolean;
  sendable: boolean;
}

function metaToDistribution(meta: FirmMeta | null): FirmDistribution {
  const internalOnly = meta?.internalOnly ?? true;
  const requireLogin = meta?.requireLogin ?? false;
  return { internalOnly, requireLogin, sendable: !internalOnly };
}

export async function getFirmDistribution(companyId: number): Promise<FirmDistribution> {
  const [row] = await db
    .select({ meta: firmsTable.meta })
    .from(companiesTable)
    .innerJoin(firmsTable, eq(companiesTable.firmId, firmsTable.id))
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!row) throw new CompanyNotFoundError(`Company ${companyId} not found`);
  return metaToDistribution(row.meta as FirmMeta | null);
}

// Resolve a tenant portal URL (firms.slug + companies.slug) to a numeric
// company id plus its firm's distribution posture, for the public tenant PDF
// route. Returns null when either slug does not match an ACTIVE company row —
// candidate/excluded companies are never publicly downloadable even under a
// sendable firm.
export async function resolveCompanyBySlug(
  firmSlug: string,
  companySlug: string,
): Promise<{ companyId: number } & FirmDistribution | null> {
  const [row] = await db
    .select({ companyId: companiesTable.id, meta: firmsTable.meta })
    .from(companiesTable)
    .innerJoin(firmsTable, eq(companiesTable.firmId, firmsTable.id))
    .where(
      and(
        eq(firmsTable.slug, firmSlug),
        eq(companiesTable.slug, companySlug),
        eq(companiesTable.status, "active"),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { companyId: row.companyId, ...metaToDistribution(row.meta as FirmMeta | null) };
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

// ---------------------------------------------------------------------------
// Report validation + Drive-delivery workflow
// ---------------------------------------------------------------------------

// Thrown by validateReport when the caller targets a revision that is no longer
// current (a newer Save happened, or none exists). Routes map these to 409/404.
export class NoCurrentRevisionError extends Error {}
export class RevisionMismatchError extends Error {}
// Thrown when a Drive ship is attempted on a report that isn't fully validated.
export class NotValidatedError extends Error {}

// Overlay ONLY the narrative fields from `source` onto `target`, preserving
// every computed field (scores, tier, gap titles/descriptions, pillarEvidence,
// preparedFor*, csHeadcount, companyName, parentFund, reportDate) from target.
// Admin-editable narrative: execSummary, compositeContext, existingSystems,
// pathForward, nextSteps, and per-gap impact/recommendation (matched by gap
// title, since gap ordering is computed). `includeGenerated` additionally
// carries the AI-generated-but-not-admin-editable fields (pillarSignals,
// p6Recommendation) — true when overlaying a generated report_exports row,
// false when overlaying an admin revision (which must never move those).
// Empty overlays fall back to the target so a partial source can't blank a
// section.
function overlayNarrative(
  target: DiagnosticReportData,
  source: DiagnosticReportData,
  opts: { includeGenerated: boolean },
): DiagnosticReportData {
  const merged: DiagnosticReportData = {
    ...target,
    execSummary: source.execSummary.length > 0 ? source.execSummary : target.execSummary,
    compositeContext: source.compositeContext || target.compositeContext,
    existingSystems: source.existingSystems || target.existingSystems,
    pathForward: source.pathForward || target.pathForward,
    nextSteps: source.nextSteps.length > 0 ? source.nextSteps : target.nextSteps,
    gaps: target.gaps.map((gap) => {
      const src = source.gaps.find((s) => s.title === gap.title);
      return {
        ...gap,
        impact: src?.impact || gap.impact,
        recommendation: src?.recommendation || gap.recommendation,
      };
    }),
  };
  if (opts.includeGenerated) {
    merged.pillarSignals = { ...source.pillarSignals };
    merged.p6Recommendation = source.p6Recommendation || target.p6Recommendation;
  }
  return merged;
}

// The fully-assembled state the admin Reports workflow needs for one company:
// the effective (base + generated + current-revision) sanitized report data,
// plus revision / validation / shipment state. This is the single read path
// behind GET report-data, the admin+tenant PDFs, and every mutation's response.
export interface EffectiveReport {
  companyId: number;
  assessmentId: number;
  company: Company;
  firm: Firm;
  // Sanitized effective report (name-redacted); safe to render or return.
  response: AdminCompanyReportData;
  // The current (matching-version, usable) revision id, or null. This is the
  // ONLY revision that can be validated or shipped.
  currentRevisionId: number | null;
  revision: ReportRevisionState;
  validation: ReportValidationState;
  shipment: DriveShipmentState;
}

export async function loadEffectiveReport(companyId: number): Promise<EffectiveReport> {
  const { company, firm, assessment } = await loadCompanyContext(companyId);
  const base = buildBaseReportData(company, firm, assessment);

  const [cached] = await db
    .select()
    .from(reportExportsTable)
    .where(and(eq(reportExportsTable.assessmentId, assessment.id), eq(reportExportsTable.rubricVersion, RUBRIC_VERSION)))
    .orderBy(desc(reportExportsTable.createdAt))
    .limit(1);

  // Latest revision of ANY version; a version mismatch marks it stale (its
  // narrative shape may no longer be valid) and it is NOT used or validatable
  // until the admin re-saves under the current RUBRIC_VERSION.
  const [latestRevision] = await db
    .select()
    .from(reportRevisionsTable)
    .where(eq(reportRevisionsTable.assessmentId, assessment.id))
    .orderBy(desc(reportRevisionsTable.createdAt), desc(reportRevisionsTable.id))
    .limit(1);

  const isStale = latestRevision ? latestRevision.rubricVersion !== RUBRIC_VERSION : false;
  const currentRevision = latestRevision && !isStale ? latestRevision : null;

  let effective = base.reportData;
  let generatedAt: string | null = null;
  let model: string | null = null;
  if (cached) {
    effective = overlayNarrative(effective, cached.reportData as DiagnosticReportData, { includeGenerated: true });
    generatedAt = cached.createdAt.toISOString();
    model = cached.model;
  }
  if (currentRevision) {
    effective = overlayNarrative(effective, currentRevision.reportData as DiagnosticReportData, {
      includeGenerated: false,
    });
  }

  const response = toResponse(companyId, assessment.date, base, effective, generatedAt, model);

  // Validation state, mapped onto the CONFIGURED validators (source of truth).
  const validators = getConfiguredValidators();
  const signatures = currentRevision
    ? await db.select().from(reportValidationsTable).where(eq(reportValidationsTable.revisionId, currentRevision.id))
    : [];
  const validatorEntries = validators.map((v) => {
    const sig = signatures.find((s) => s.validatorEmail.toLowerCase() === v.email);
    return {
      email: v.email,
      name: v.name,
      hasValidated: !!sig,
      validatedAt: sig ? sig.createdAt.toISOString() : null,
      overrideFor: sig?.overrideFor ?? null,
      overrideReason: sig?.overrideReason ?? null,
    };
  });
  const requiredCount = validators.length;
  const validatedCount = validatorEntries.filter((e) => e.hasValidated).length;
  // Unlocked when every validator has signed OR any validation row carries an
  // override (one validator waiving the other's missing sign-off).
  const hasOverride = signatures.some((s) => s.overrideFor !== null && s.overrideReason !== null);
  const isValidated = requiredCount > 0 && currentRevision !== null && (validatedCount === requiredCount || hasOverride);
  const validatorNames = validatorEntries.filter((e) => e.hasValidated).map((e) => e.name);
  const signedAts = validatorEntries
    .map((e) => e.validatedAt)
    .filter((x): x is string => x !== null)
    .sort();
  const validatedAt = isValidated && signedAts.length > 0 ? signedAts[signedAts.length - 1] : null;

  const validation: ReportValidationState = {
    configured: requiredCount > 0,
    requiredCount,
    validatedCount,
    isValidated,
    validators: validatorEntries,
    validatorNames,
    validatedAt,
  };

  // Revision meta: usable current revision when present, else the stale row's
  // meta (so the UI can prompt a re-save). `hasRevision` = a usable revision
  // exists; `revisionId` (the validate/ship target) is null unless usable.
  const metaRevision = currentRevision ?? latestRevision ?? null;
  const revision: ReportRevisionState = {
    hasRevision: currentRevision !== null,
    revisionId: currentRevision?.id ?? null,
    rubricVersion: metaRevision?.rubricVersion ?? null,
    isStale,
    editedByEmail: metaRevision?.editedByEmail ?? null,
    editedByName: metaRevision?.editedByName ?? null,
    createdAt: metaRevision?.createdAt ? metaRevision.createdAt.toISOString() : null,
  };

  const [shipmentRow] = await db
    .select()
    .from(driveShipmentsTable)
    .where(eq(driveShipmentsTable.companyId, companyId))
    .orderBy(desc(driveShipmentsTable.createdAt), desc(driveShipmentsTable.id))
    .limit(1);
  const shipment: DriveShipmentState = {
    shipped: !!shipmentRow,
    isCurrent: !!shipmentRow && currentRevision !== null && shipmentRow.revisionId === currentRevision.id,
    revisionId: shipmentRow?.revisionId ?? null,
    fileId: shipmentRow?.fileId ?? null,
    webViewLink: shipmentRow?.webViewLink ?? null,
    folderPath: shipmentRow?.folderPath ?? null,
    shippedByName: shipmentRow?.shippedByName ?? null,
    shippedAt: shipmentRow?.createdAt ? shipmentRow.createdAt.toISOString() : null,
  };

  return {
    companyId,
    assessmentId: assessment.id,
    company,
    firm,
    response,
    currentRevisionId: currentRevision?.id ?? null,
    revision,
    validation,
    shipment,
  };
}

export function toWorkflow(eff: EffectiveReport): AdminReportWorkflow {
  return {
    report: eff.response,
    revision: eff.revision,
    validation: eff.validation,
    shipment: eff.shipment,
  };
}

// Convert the validation state into the PDF chrome stamp (see pdf/types.ts).
// If one validator overrode the other's missing sign-off the stamp includes an
// "override: {other} - {reason}" note appended after the signer name(s).
export function toValidationStamp(validation: ReportValidationState): ReportValidationStamp {
  let overrideNote: string | null = null;
  const overrider = validation.validators.find((v) => v.overrideFor);
  if (overrider?.overrideFor && overrider?.overrideReason) {
    const overriddenEmail = overrider.overrideFor.toLowerCase();
    const overridden = validation.validators.find((v) => v.email === overriddenEmail);
    const overriddenName = overridden?.name ?? overriddenEmail;
    overrideNote = `override: ${overriddenName} - ${overrider.overrideReason}`;
  }
  return {
    validated: validation.isValidated,
    validatorNames: validation.validatorNames,
    validatedAt: validation.validatedAt,
    overrideNote,
  };
}

// Persist an admin's narrative edits as a new revision. Starts from the current
// EFFECTIVE narrative (base + generated) so unedited generated fields survive,
// overlays the admin's edits (em-dash stripped, exactly like generated copy),
// then name-redacts before storing. Inserting a new row implicitly resets
// validation to 0/N (validations key off revisionId). Returns the fresh
// workflow.
export async function saveReportRevision(
  companyId: number,
  input: ReportRevisionInput,
  editedByEmail: string,
  editedByName: string | null,
): Promise<AdminReportWorkflow> {
  const { company, firm, assessment } = await loadCompanyContext(companyId);
  const base = buildBaseReportData(company, firm, assessment);

  const [cached] = await db
    .select()
    .from(reportExportsTable)
    .where(and(eq(reportExportsTable.assessmentId, assessment.id), eq(reportExportsTable.rubricVersion, RUBRIC_VERSION)))
    .orderBy(desc(reportExportsTable.createdAt))
    .limit(1);

  let effective = base.reportData;
  if (cached) {
    effective = overlayNarrative(effective, cached.reportData as DiagnosticReportData, { includeGenerated: true });
  }

  const edited: DiagnosticReportData = {
    ...effective,
    execSummary: input.execSummary.map(stripEmDashes),
    compositeContext: stripEmDashes(input.compositeContext),
    existingSystems: stripEmDashes(input.existingSystems),
    pathForward: stripEmDashes(input.pathForward),
    nextSteps: input.nextSteps.map(stripEmDashes),
    gaps: effective.gaps.map((gap) => {
      const src = input.gaps.find((g) => g.title === gap.title);
      return {
        ...gap,
        impact: src ? stripEmDashes(src.impact) : gap.impact,
        recommendation: src ? stripEmDashes(src.recommendation) : gap.recommendation,
      };
    }),
  };
  const sanitized = sanitizeReportData(edited);

  await db.insert(reportRevisionsTable).values({
    companyId,
    assessmentId: assessment.id,
    rubricVersion: RUBRIC_VERSION,
    reportData: sanitized,
    editedByEmail,
    editedByName,
  });

  return toWorkflow(await loadEffectiveReport(companyId));
}

// Record one validator's sign-off against the CURRENT revision. Idempotent per
// (revision, validator) via the unique index. Rejects a stale/absent target
// (NoCurrentRevisionError) or a mismatched revisionId (RevisionMismatchError)
// so a client can't sign off a revision that a newer Save has superseded.
//
// Override flow: when overrideFor + overrideReason are supplied the row is
// UPSERTED (not ignored on conflict) so a validator who already has a normal
// sign-off can upgrade it to an override without hitting the unique index.
// The override unlocks the report even when the other validator has no row.
export async function validateReport(
  companyId: number,
  revisionId: number,
  validatorEmail: string,
  validatorName: string,
  overrideFor?: string | null,
  overrideReason?: string | null,
): Promise<AdminReportWorkflow> {
  const eff = await loadEffectiveReport(companyId);
  if (eff.currentRevisionId === null) throw new NoCurrentRevisionError();
  if (eff.currentRevisionId !== revisionId) throw new RevisionMismatchError();

  const email = validatorEmail.toLowerCase();
  if (overrideFor && overrideReason) {
    const normOverrideFor = overrideFor.toLowerCase();
    const cleanReason = stripEmDashes(overrideReason);
    await db
      .insert(reportValidationsTable)
      .values({ revisionId, validatorEmail: email, validatorName, overrideFor: normOverrideFor, overrideReason: cleanReason })
      .onConflictDoUpdate({
        target: [reportValidationsTable.revisionId, reportValidationsTable.validatorEmail],
        set: { overrideFor: normOverrideFor, overrideReason: cleanReason },
      });
  } else {
    await db
      .insert(reportValidationsTable)
      .values({ revisionId, validatorEmail: email, validatorName })
      .onConflictDoNothing({
        target: [reportValidationsTable.revisionId, reportValidationsTable.validatorEmail],
      });
  }

  return toWorkflow(await loadEffectiveReport(companyId));
}

// Persist a Drive-shipment audit row (called by the ship-to-drive route after a
// successful upload).
export async function recordDriveShipment(row: {
  companyId: number;
  revisionId: number;
  fileId: string;
  webViewLink: string | null;
  folderPath: string;
  shippedByEmail: string;
  shippedByName: string | null;
}): Promise<void> {
  await db.insert(driveShipmentsTable).values(row);
}
