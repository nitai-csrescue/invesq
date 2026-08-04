// ---------------------------------------------------------------------------
// Pillar definitions, tier bands, and scoring helpers
// ---------------------------------------------------------------------------
import type { Pillar, Tier, PillarScore } from "./types";

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
    gapNote:
      "CS is not structured as a distinct function — roles are blended, limiting retention capacity.",
  },
  {
    id: "onboarding",
    name: "Onboarding",
    weight: 1.25,
    measures:
      "Whether new customers are activated through a structured, repeatable process that drives early time-to-value.",
    signals: "G2/Capterra reviews, JD language, dedicated onboarding roles",
    peValue: "Months 1–6 churn is highest; onboarding drives early GRR",
    gapNote:
      "No repeatable onboarding motion — early time-to-value is inconsistent and month-1–6 churn is elevated.",
  },
  {
    id: "health",
    name: "Health Scoring",
    weight: 1.5,
    measures:
      "Whether the company has systematic, data-driven visibility into customer health and risk.",
    signals: "JD tool mentions (Gainsight, ChurnZero, Planhat), content signals",
    peValue: "#1 predictor of proactive vs. reactive churn management",
    gapNote:
      "No systematic health scoring — churn is managed reactively rather than predicted.",
  },
  {
    id: "escalation",
    name: "Escalation & Churn Management",
    weight: 1.25,
    measures:
      "Whether at-risk accounts are identified and managed proactively, before they become churn events.",
    signals: "G2/Capterra ratings and review themes, support-sentiment signals",
    peValue: "Directly maps to GRR protection",
    gapNote:
      "At-risk accounts are surfaced late — escalation is firefighting, not a proactive save motion.",
  },
  {
    id: "revenue",
    name: "Revenue Motion",
    weight: 1.5,
    measures:
      "Whether CS is accountable for expansion revenue (NRR > 100%), not just retention. Presence of NRR ownership, CSQL, or expansion quotas.",
    signals: "JD expansion language, NRR/CSQL/upsell signals, AM/CSM split",
    peValue: "Expansion is the primary multiple lever in PE SaaS holds",
    gapNote:
      "CS carries no expansion accountability — a renewal-only motion structurally caps NRR.",
  },
  {
    id: "leadership",
    name: "CS Leadership",
    weight: 1.25,
    measures:
      "Whether the CS leader has the experience, tenure, and mandate to drive value creation — not just team management.",
    signals: "LinkedIn tenure, title, background, post-acquisition hire patterns",
    peValue: "Leadership churn post-acquisition is a top-3 value-destruction signal",
    gapNote:
      "No senior CS leader with a value-creation mandate — a top-3 post-acquisition risk.",
  },
  {
    id: "planning",
    name: "Account Planning",
    weight: 1.0,
    measures:
      "Whether high-value accounts have structured success plans, QBR cadences, and cross-functional ownership.",
    signals: "JD account-plan language, case studies, EBR/QBR references",
    peValue: "Correlates with logo retention and expansion identification",
    gapNote:
      "No structured success plans or QBR cadence on high-value accounts — expansion signals go unseen.",
  },
  {
    id: "ai",
    name: "AI Adoption Maturity",
    weight: 1.0,
    measures:
      "Whether AI is systematically used to enhance CS workflows, scale coverage, and improve signal quality.",
    signals: "JD AI language, company blog/press, tool-stack signals",
    peValue: "AI-enabled CS scales without proportional headcount — an EBITDA lever",
    gapNote:
      "No systematic AI in the CS motion — coverage cannot scale without adding headcount.",
  },
];

export const PILLAR_MAX = PILLARS.length * 2; // 16 (Phase 1 unweighted)
export const WEIGHTED_MAX = PILLARS.reduce((s, p) => s + p.weight * 2, 0); // 19.5 (Phase 2 weighted)

export const SCORE_LEVELS: Record<
  string,
  { label: string; short: string; barClass: string; textClass: string; dotClass: string }
> = {
  "2": {
    label: "Optimized",
    short: "Optimized",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  "1": {
    label: "Developing",
    short: "Partial",
    barClass: "bg-amber-500",
    textClass: "text-amber-300",
    dotClass: "bg-amber-500",
  },
  "0": {
    label: "Infrastructure Gap",
    short: "Gap",
    barClass: "bg-rose-500",
    textClass: "text-rose-300",
    dotClass: "bg-rose-500",
  },
  na: {
    label: "Insufficient Data",
    short: "N/A",
    barClass: "bg-slate-600",
    textClass: "text-slate-400",
    dotClass: "bg-slate-600",
  },
};

export function scoreLevel(score: PillarScore) {
  return score === null ? SCORE_LEVELS.na : SCORE_LEVELS[String(score)];
}

// Engagement tiers (assigned from the Phase 1 unweighted TIER composite, 0–16).
// Tier assignment always uses the substitution rule: NA pillars count as 1.
export const TIERS: Tier[] = [
  {
    id: 1,
    label: "Significant Opportunities",
    range: [0, 5],
    color: "#f43f5e",
    badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    engagement: "Full-scale rebuild: all 4 pillars require intervention. 90–180 day engagement.",
    invesqSignal:
      "High-urgency acquisition risk. NRR likely <90%. Immediate value-creation opportunity post-close.",
    arrRisk: ">20% ARR at risk annually",
    riskMidpoint: 0.25,
    riskBandLow: 0.2,
    riskBandHigh: null,
  },
  {
    id: 2,
    label: "Targeted Opportunities",
    range: [6, 9],
    color: "#fb923c",
    badgeClass: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    engagement: "Targeted remediation: 1–2 pillar interventions. 60–90 day engagement.",
    invesqSignal:
      "Meaningful structural gaps. Strong INVESQ fit. 10–15pp NRR improvement is achievable.",
    arrRisk: "10–20% ARR at risk annually",
    riskMidpoint: 0.15,
    riskBandLow: 0.1,
    riskBandHigh: 0.2,
  },
  {
    id: 3,
    label: "Developing",
    range: [10, 12],
    color: "#facc15",
    badgeClass: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    engagement: "Optimization play: tooling upgrades, revenue-motion activation. 30–60 day engagement.",
    invesqSignal:
      "Foundation exists. Gaps concentrated in commercial motion or planning. 5–10pp NRR uplift.",
    arrRisk: "5–10% ARR at risk annually",
    riskMidpoint: 0.075,
    riskBandLow: 0.05,
    riskBandHigh: 0.1,
  },
  {
    id: 4,
    label: "Optimizing",
    range: [13, 16],
    color: "#34d399",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    engagement: "Advisory or specific project: AI acceleration, benchmark comparison.",
    invesqSignal:
      "Near-mature. Suitable for benchmarking against the INVESQ cohort. Likely a strong CS operator.",
    arrRisk: "<5% preventable ARR at risk",
    riskMidpoint: 0.03,
    riskBandLow: null,
    riskBandHigh: 0.05,
  },
];

export function getTier(tierComposite: number): Tier {
  return TIERS.find((t) => tierComposite >= t.range[0] && tierComposite <= t.range[1]) ?? TIERS[0];
}
