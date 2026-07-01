// ---------------------------------------------------------------------------
// Portfolio Rollup Dashboard — data layer (single source of truth)
//
// A client-presentable rollup of a PE firm's portfolio companies, each scored
// against INVESQ's 8-pillar Customer Success operational-diligence framework.
//
// Scores are illustrative for this design-partner preview. Phase 1 uses external
// public signals only (unweighted composite, max 16). Phase 2 layers in
// proprietary data once INVESQ is engaged (weighted composite, max 19.5).
// ---------------------------------------------------------------------------

export const FIRM_NAME = "STG";
export const AS_OF_DATE = "2026-06-15";

// 0 = Infrastructure Gap · 1 = Partial/Developing · 2 = Optimized · null = Insufficient Data
export type PillarScore = 0 | 1 | 2 | null;

export interface Pillar {
  id: string;
  name: string;
  weight: number; // multiplier used in the Phase 2 weighted composite
  measures: string; // what it measures
  signals: string; // primary external signal sources
  peValue: string; // PE value link
  gapNote: string; // shown when this pillar is a company's top gap
}

// Order matters — pillars render in this sequence everywhere.
export const PILLARS: Pillar[] = [
  {
    id: "org",
    name: "CS Org Design",
    weight: 1.0,
    measures:
      "Whether CS is a distinct function with clear role separation across CSM, onboarding, support, and account management.",
    signals: "LinkedIn headcount, JD role titles, org-chart signals",
    peValue: "Retention capacity and scalability",
    gapNote: "CS is not structured as a distinct function — roles are blended, limiting retention capacity.",
  },
  {
    id: "onboarding",
    name: "Onboarding",
    weight: 1.25,
    measures:
      "Whether new customers are activated through a structured, repeatable process that drives early time-to-value.",
    signals: "G2/Capterra reviews, JD language, dedicated onboarding roles",
    peValue: "Months 1–6 churn is highest; onboarding drives early GRR",
    gapNote: "No repeatable onboarding motion — early time-to-value is inconsistent and month-1–6 churn is elevated.",
  },
  {
    id: "health",
    name: "Health Scoring",
    weight: 1.5,
    measures:
      "Whether the company has systematic, data-driven visibility into customer health and risk.",
    signals: "JD tool mentions (Gainsight, ChurnZero), content signals",
    peValue: "#1 predictor of proactive vs. reactive churn management",
    gapNote: "No systematic health scoring — churn is managed reactively rather than predicted.",
  },
  {
    id: "escalation",
    name: "Escalation & Churn Management",
    weight: 1.25,
    measures:
      "Whether at-risk accounts are identified and managed proactively, before they become churn events.",
    signals: "G2/Capterra ratings and review themes, Glassdoor signals",
    peValue: "Directly maps to GRR protection",
    gapNote: "At-risk accounts are surfaced late — escalation is firefighting, not a proactive save motion.",
  },
  {
    id: "revenue",
    name: "Revenue Motion",
    weight: 1.5,
    measures:
      "Whether CS is accountable for expansion revenue (NRR > 100%), not just retention. Presence of NRR ownership, CSQL, or expansion quotas.",
    signals: "JD expansion language, NRR/CSQL/upsell signals, AM/CSM split",
    peValue: "Expansion is the primary multiple lever in PE SaaS holds",
    gapNote: "CS carries no expansion accountability — a renewal-only motion structurally caps NRR.",
  },
  {
    id: "leadership",
    name: "CS Leadership",
    weight: 1.25,
    measures:
      "Whether the CS leader has the experience, tenure, and mandate to drive value creation — not just team management.",
    signals: "LinkedIn tenure, title, background, post-acquisition hire patterns",
    peValue: "Leadership churn post-acquisition is a top-3 value-destruction signal",
    gapNote: "No senior CS leader with a value-creation mandate — a top-3 post-acquisition risk.",
  },
  {
    id: "planning",
    name: "Account Planning",
    weight: 1.0,
    measures:
      "Whether high-value accounts have structured success plans, QBR cadences, and cross-functional ownership.",
    signals: "JD account-plan language, case studies, EBR/QBR references",
    peValue: "Correlates with logo retention and expansion identification",
    gapNote: "No structured success plans or QBR cadence on high-value accounts — expansion signals go unseen.",
  },
  {
    id: "ai",
    name: "AI Adoption Maturity",
    weight: 1.0,
    measures:
      "Whether AI is systematically used to enhance CS workflows, scale coverage, and improve signal quality.",
    signals: "JD AI language, company blog/press, tool-stack signals",
    peValue: "AI-enabled CS scales without proportional headcount — an EBITDA lever",
    gapNote: "No systematic AI in the CS motion — coverage cannot scale without adding headcount.",
  },
];

export const PILLAR_MAX = PILLARS.length * 2; // 16 (Phase 1 unweighted)
export const WEIGHTED_MAX = PILLARS.reduce((s, p) => s + p.weight * 2, 0); // 19.5 (Phase 2 weighted)

export const SCORE_LEVELS: Record<
  string,
  { label: string; short: string; barClass: string; textClass: string; dotClass: string }
> = {
  "2": { label: "Optimized", short: "Optimized", barClass: "bg-emerald-500", textClass: "text-emerald-300", dotClass: "bg-emerald-500" },
  "1": { label: "Developing", short: "Partial", barClass: "bg-amber-500", textClass: "text-amber-300", dotClass: "bg-amber-500" },
  "0": { label: "Infrastructure Gap", short: "Gap", barClass: "bg-rose-500", textClass: "text-rose-300", dotClass: "bg-rose-500" },
  na: { label: "Insufficient Data", short: "N/A", barClass: "bg-slate-600", textClass: "text-slate-400", dotClass: "bg-slate-600" },
};

export function scoreLevel(score: PillarScore) {
  return score === null ? SCORE_LEVELS.na : SCORE_LEVELS[String(score)];
}

// ---------------------------------------------------------------------------
// Engagement tiers (assigned from the Phase 1 unweighted composite, 0–16)
// ---------------------------------------------------------------------------

export interface Tier {
  id: 1 | 2 | 3 | 4;
  label: string;
  range: [number, number];
  color: string; // hex for rings/charts
  badgeClass: string;
  engagement: string;
  invesqSignal: string;
  arrRisk: string;
  riskMidpoint: number; // used to estimate ARR at risk
}

export const TIERS: Tier[] = [
  {
    id: 1,
    label: "Significant Opportunities",
    range: [0, 5],
    color: "#f43f5e",
    badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    engagement: "Full-scale rebuild — all 8 pillars require intervention. 90–180 day engagement.",
    invesqSignal: "High-urgency acquisition risk. NRR likely <90%. Immediate value-creation opportunity post-close.",
    arrRisk: ">20% ARR at risk annually",
    riskMidpoint: 0.25,
  },
  {
    id: 2,
    label: "Targeted Opportunities",
    range: [6, 9],
    color: "#fb923c",
    badgeClass: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    engagement: "Targeted remediation — 2–4 pillar interventions. 60–90 day engagement.",
    invesqSignal: "Meaningful structural gaps. Strong INVESQ fit. 10–15pp NRR improvement is achievable.",
    arrRisk: "10–20% ARR at risk annually",
    riskMidpoint: 0.15,
  },
  {
    id: 3,
    label: "Developing",
    range: [10, 12],
    color: "#facc15",
    badgeClass: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    engagement: "Optimization play — tooling upgrades, revenue-motion activation. 30–60 day engagement.",
    invesqSignal: "Foundation exists. Gaps concentrated in commercial motion or planning. 5–10pp NRR uplift.",
    arrRisk: "5–10% ARR at risk annually",
    riskMidpoint: 0.075,
  },
  {
    id: 4,
    label: "Optimizing",
    range: [13, 16],
    color: "#34d399",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    engagement: "Advisory or specific project — AI acceleration, benchmark comparison.",
    invesqSignal: "Near-mature. Suitable for benchmarking against the INVESQ cohort. Likely a strong CS operator.",
    arrRisk: "<5% preventable ARR at risk",
    riskMidpoint: 0.03,
  },
];

export function getTier(composite: number): Tier {
  return TIERS.find((t) => composite >= t.range[0] && composite <= t.range[1]) ?? TIERS[0];
}

// ---------------------------------------------------------------------------
// Portfolio companies (illustrative)
// ---------------------------------------------------------------------------

export interface RawCompany {
  id: string;
  name: string;
  sector: string;
  hq: string;
  employees: number;
  arr: number;
  lastDiagnostic: string;
  summary: string;
  scores: Record<string, PillarScore>;
  trend: number[]; // illustrative composite history (Phase 1 scale)
}

const RAW_COMPANIES: RawCompany[] = [
  {
    id: "nomis-solutions",
    name: "Nomis Solutions",
    sector: "Pricing & Profitability Analytics",
    hq: "San Bruno, CA",
    employees: 210,
    arr: 48_000_000,
    lastDiagnostic: "2026-06-04",
    summary:
      "Solid retention foundation and tooling, but CS owns no expansion mandate — NRR is capped by a renewal-only motion.",
    scores: { org: 2, onboarding: 2, health: 1, escalation: 2, revenue: 0, leadership: 2, planning: 1, ai: 1 },
    trend: [8, 9, 10, 10, 11],
  },
  {
    id: "meridian-finops",
    name: "Meridian FinOps",
    sector: "Cloud Spend Management",
    hq: "Austin, TX",
    employees: 340,
    arr: 96_000_000,
    lastDiagnostic: "2026-06-09",
    summary:
      "Mature CS operator across the board. Expansion motion is developing and AI leverage is nascent — an optimization play, not a rebuild.",
    scores: { org: 2, onboarding: 2, health: 2, escalation: 2, revenue: 1, leadership: 2, planning: 2, ai: 1 },
    trend: [11, 12, 13, 13, 14],
  },
  {
    id: "continuum-data",
    name: "Continuum Data Platform",
    sector: "Data Infrastructure",
    hq: "Seattle, WA",
    employees: 520,
    arr: 220_000_000,
    lastDiagnostic: "2026-06-11",
    summary:
      "Best-in-class CS structure and commercial motion. The only material gap is systematic AI adoption — a pure EBITDA-leverage opportunity.",
    scores: { org: 2, onboarding: 2, health: 2, escalation: 2, revenue: 2, leadership: 2, planning: 2, ai: 1 },
    trend: [13, 14, 14, 15, 15],
  },
  {
    id: "helios-security",
    name: "Helios Security",
    sector: "Cybersecurity",
    hq: "Boston, MA",
    employees: 410,
    arr: 130_000_000,
    lastDiagnostic: "2026-05-28",
    summary:
      "Strong structure and strong expansion motion, but health visibility and leadership tenure lag — retention is more reactive than it should be.",
    scores: { org: 2, onboarding: 2, health: 1, escalation: 2, revenue: 2, leadership: 1, planning: 1, ai: 1 },
    trend: [9, 10, 11, 11, 12],
  },
  {
    id: "orchard-retail",
    name: "Orchard Retail Cloud",
    sector: "Retail SaaS",
    hq: "Chicago, IL",
    employees: 180,
    arr: 34_000_000,
    lastDiagnostic: "2026-06-02",
    summary:
      "Reasonable foundation, but no expansion accountability and limited health-tooling signal. Health scoring could not be assessed on public data alone.",
    scores: { org: 2, onboarding: 1, health: null, escalation: 1, revenue: 1, leadership: 1, planning: 1, ai: 1 },
    trend: [7, 8, 8, 9, 9],
  },
  {
    id: "cirrus-logistics",
    name: "Cirrus Logistics Cloud",
    sector: "Supply Chain SaaS",
    hq: "Denver, CO",
    employees: 260,
    arr: 62_000_000,
    lastDiagnostic: "2026-05-30",
    summary:
      "Retention basics are in place but the commercial motion is missing — CS has no expansion ownership and account planning is ad hoc.",
    scores: { org: 2, onboarding: 1, health: 1, escalation: 1, revenue: 0, leadership: 1, planning: 1, ai: 1 },
    trend: [6, 7, 7, 8, 8],
  },
  {
    id: "vantage-hr",
    name: "Vantage HR Suite",
    sector: "HR Technology",
    hq: "Atlanta, GA",
    employees: 150,
    arr: 28_000_000,
    lastDiagnostic: "2026-06-06",
    summary:
      "Emerging CS function with real gaps in proactive save motion. At-risk accounts are caught late and there is no structured account planning.",
    scores: { org: 1, onboarding: 1, health: 1, escalation: 0, revenue: 1, leadership: 1, planning: 0, ai: 1 },
    trend: [5, 5, 6, 6, 6],
  },
  {
    id: "brightwave-edtech",
    name: "Brightwave EdTech",
    sector: "Education SaaS",
    hq: "Raleigh, NC",
    employees: 120,
    arr: 21_000_000,
    lastDiagnostic: "2026-05-22",
    summary:
      "Thin CS infrastructure with no expansion motion and weak onboarding. High-urgency opportunity — significant preventable ARR at risk.",
    scores: { org: 1, onboarding: 0, health: 1, escalation: 1, revenue: 0, leadership: 1, planning: 0, ai: 1 },
    trend: [4, 4, 5, 5, 5],
  },
  {
    id: "apex-behavioral",
    name: "Apex Behavioral Health",
    sector: "Healthcare SaaS",
    hq: "Nashville, TN",
    employees: 95,
    arr: 18_000_000,
    lastDiagnostic: "2026-05-19",
    summary:
      "No visible CS infrastructure — reactive-only support, no health scoring, no expansion motion. A full-scale rebuild candidate.",
    scores: { org: 1, onboarding: 0, health: 0, escalation: 1, revenue: 1, leadership: 0, planning: 1, ai: 0 },
    trend: [3, 3, 4, 4, 4],
  },
];

// ---------------------------------------------------------------------------
// Derived, self-consistent company records
// ---------------------------------------------------------------------------

export interface GapItem {
  pillar: Pillar;
  score: PillarScore;
  weakness: number;
  note: string;
}

export interface Company extends RawCompany {
  composite: number; // Phase 1 unweighted, scored pillars only (N/A excluded — never fabricated)
  displayMax: number; // max for the displayed composite given scored pillars (scoredCount × 2)
  tierComposite: number; // composite with N/A substituted as 1 — used for TIER ASSIGNMENT ONLY
  weightedComposite: number; // Phase 2 weighted, scored pillars only
  weightedMax: number; // weighted max given scored pillars
  insufficientCount: number; // pillars marked Insufficient Data (N/A)
  tier: Tier;
  gaps: GapItem[]; // ranked biggest weighted gap first (excludes N/A pillars)
  topGap: GapItem | null;
  arrAtRisk: number; // illustrative: arr × tier risk midpoint
}

// Composite used ONLY for tier assignment: N/A substitutes 1 per the framework rules.
function computeTierComposite(scores: Record<string, PillarScore>): number {
  return PILLARS.reduce((sum, p) => sum + (scores[p.id] ?? 1), 0);
}

// Displayed composites never fabricate a score — N/A pillars are excluded entirely.
function scoredPillars(scores: Record<string, PillarScore>): Pillar[] {
  return PILLARS.filter((p) => scores[p.id] !== null);
}

function computeGaps(scores: Record<string, PillarScore>): GapItem[] {
  return PILLARS.filter((p) => scores[p.id] !== null && (scores[p.id] as number) < 2)
    .map((p) => {
      const score = scores[p.id];
      return { pillar: p, score, weakness: (2 - (score as number)) * p.weight, note: p.gapNote };
    })
    .sort((a, b) => b.weakness - a.weakness);
}

function buildCompany(raw: RawCompany): Company {
  const scored = scoredPillars(raw.scores);
  const composite = scored.reduce((sum, p) => sum + (raw.scores[p.id] as number), 0);
  const weighted = scored.reduce((sum, p) => sum + (raw.scores[p.id] as number) * p.weight, 0);
  const tierComposite = computeTierComposite(raw.scores);
  const tier = getTier(tierComposite);
  const gaps = computeGaps(raw.scores);
  return {
    ...raw,
    composite,
    displayMax: scored.length * 2,
    tierComposite,
    weightedComposite: Math.round(weighted * 10) / 10,
    weightedMax: Math.round(scored.reduce((s, p) => s + p.weight * 2, 0) * 10) / 10,
    insufficientCount: PILLARS.length - scored.length,
    tier,
    gaps,
    topGap: gaps[0] ?? null,
    arrAtRisk: Math.round(raw.arr * tier.riskMidpoint),
  };
}

// Sorted worst-first (by the tier-basis composite) so the biggest value-creation
// opportunities surface at the top.
export const COMPANIES: Company[] = RAW_COMPANIES.map(buildCompany).sort(
  (a, b) => a.tierComposite - b.tierComposite,
);

export function getCompany(id: string): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Portfolio-level rollup
// ---------------------------------------------------------------------------

export const portfolioSummary = {
  companyCount: COMPANIES.length,
  totalArr: COMPANIES.reduce((s, c) => s + c.arr, 0),
  arrAtRisk: COMPANIES.reduce((s, c) => s + c.arrAtRisk, 0),
  // Normalized to the full 0–PILLAR_MAX scale so companies with N/A pillars
  // (a smaller displayMax) are compared fairly, without fabricating a score.
  avgComposite:
    Math.round(
      (COMPANIES.reduce((s, c) => s + (c.composite / c.displayMax) * PILLAR_MAX, 0) / COMPANIES.length) * 10,
    ) / 10,
  tierCounts: TIERS.map((t) => ({
    tier: t,
    count: COMPANIES.filter((c) => c.tier.id === t.id).length,
  })),
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
