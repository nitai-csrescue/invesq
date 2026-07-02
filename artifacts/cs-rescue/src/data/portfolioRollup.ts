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
  employeesDisplay: string; // "77", "102", or "Unconfirmed" — never a fabricated point figure
  arrDisplay: string; // human-readable ARR ("$20M–$30M", "Undisclosed")
  // ARR range in dollars used for portfolio rollups. null = undisclosed —
  // excluded from Total ARR and Est. ARR at Risk. Ranges are summed as
  // ranges; a point figure is never fabricated.
  arrForRollup: [number, number] | null;
  confidence: "High" | "Medium"; // assessment confidence from external signals
  engagement: string; // per-company engagement recommendation (overrides tier default)
  invesqSignal: string; // per-company INVESQ signal (overrides tier default)
  // TaxCalc special case: no CS leader exists yet, so leadership copy is
  // framed as "establish" rather than anything implying replacement.
  leadershipFraming?: "establish";
  lastDiagnostic: string;
  summary: string;
  scores: Record<string, PillarScore>;
  // Company-specific gap findings, keyed by pillar id. Falls back to the
  // pillar's generic gapNote when a pillar isn't covered here.
  gapNotes?: Record<string, string>;
  trend: number[]; // illustrative composite history (Phase 1 scale)
}

const RAW_COMPANIES: RawCompany[] = [
  {
    id: "nomis-solutions",
    name: "Nomis Solutions",
    sector: "AI-native pricing optimization, Financial Services SaaS",
    hq: "San Bruno, CA",
    employeesDisplay: "77",
    arrDisplay: "$20M–$30M",
    arrForRollup: [20_000_000, 30_000_000],
    confidence: "High",
    engagement:
      "Full CS function build — commercial motion, health scoring, and account planning all need to be established. 90–180 day engagement.",
    invesqSignal:
      "High-value, early-stage opportunity — the recent CCO hire (Jan 2026) and VP Strategic Account Management creation (Mar 2026) show STG is already investing here. A structured build now compounds that momentum.",
    lastDiagnostic: "2026-06-04",
    summary:
      "Strong pricing-science IP and a sticky enterprise install base — the CS infrastructure to protect and grow that ARR is still being built. A structured CS function build now compounds the momentum already started with the CCO hire in January 2026.",
    scores: { org: 1, onboarding: 0, health: 0, escalation: null, revenue: 0, leadership: 1, planning: 0, ai: 1 },
    gapNotes: {
      revenue:
        "CS carries no expansion accountability — the commercial motion runs entirely through the pricing-science relationship, with no NRR ownership or CSQL motion.",
      health:
        "No systematic health scoring — risk is surfaced through reactive account conversations, not data-driven signals.",
      planning:
        "No structured success plans or QBR cadence — high-value accounts aren't getting the attention needed to drive expansion.",
      onboarding:
        "No repeatable onboarding motion — early time-to-value is inconsistent and activation is relationship-dependent.",
      leadership:
        "Amy Chase (CCO, Jan 2026) brings a strong operations and professional-services background — layering in SaaS-native CS frameworks is the near-term opportunity.",
      ai: "No systematic AI in the CS motion — signal triage and coverage scaling are fully manual.",
    },
    trend: [3, 3, 4, 4, 4],
  },
  {
    id: "cadmium",
    name: "Cadmium",
    sector: "Events / LMS / Content Management SaaS",
    hq: "Hunt Valley, MD",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "$10M–$20M",
    arrForRollup: [10_000_000, 20_000_000],
    confidence: "High",
    engagement:
      "Structured build — formalize account planning and revenue motion, clarify CS reporting line. 90-day engagement.",
    invesqSignal:
      "Strong support sentiment to build on — the opportunity here is structural (reporting lines, planning cadence), not a trust or satisfaction problem.",
    lastDiagnostic: "2026-06-10",
    summary:
      "Strong customer support and escalation management underpin genuine customer loyalty — the opportunity is structural rather than a satisfaction problem. Formalizing account planning, clarifying the CS reporting line, and activating an expansion motion are the highest-leverage moves.",
    scores: { org: 1, onboarding: 1, health: null, escalation: 2, revenue: 1, leadership: 1, planning: 0, ai: 0 },
    gapNotes: {
      planning:
        "No account-planning cadence — no QBR structure or success plans on high-value accounts, despite a clearly engaged CS team.",
      ai: "No systematic AI in the CS motion — coverage cannot scale without adding headcount.",
      org: "CS reports into operations rather than as a standalone GTM function — the reporting line limits mandate and commercial accountability.",
      revenue:
        "CS has no formal expansion ownership — upsell is relationship-driven with no structured CSQL or NRR accountability.",
      onboarding:
        "Onboarding is consistent but not yet systematized — time-to-value depends on individual CSM familiarity.",
      leadership:
        "Christina Rice (VP CS & Ops) brings strong operational depth — the opportunity is to add a SaaS-native commercial layer to the existing CS foundation.",
      escalation:
        "Escalation management is a clear strength — customer sentiment and review data show responsive, effective support.",
    },
    trend: [5, 6, 6, 7, 7],
  },
  {
    id: "confience",
    name: "Confience",
    sector: "Laboratory Information Management (LIMS) SaaS",
    hq: "Austin, TX",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Structured build — formalize account planning and a unified commercial motion across the three merged entities. 90-day engagement.",
    invesqSignal:
      "Rapid M&A growth (3 acquisitions in under 2 years) has outpaced CS integration — a natural moment to unify retention practices across the combined customer base.",
    lastDiagnostic: "2026-06-08",
    summary:
      "Rapid M&A growth across three acquisitions in under two years has built strong sector coverage but outpaced CS integration — retention practices, reporting structures, and commercial motions vary across the combined entity. Unifying those practices now is the highest-leverage move ahead of the next growth phase.",
    scores: { org: 2, onboarding: 1, health: null, escalation: 1, revenue: null, leadership: 1, planning: 0, ai: 0 },
    gapNotes: {
      planning:
        "No unified account-planning cadence across the three merged entities — success plans and QBR structures vary by legacy company.",
      ai: "No systematic AI in the CS motion across any of the three entities — a clear opportunity to establish a consistent capability.",
      revenue:
        "Revenue motion couldn't be fully assessed from public data — likely varies significantly across the three legacy businesses.",
      escalation:
        "Escalation practices vary across legacy entities — a unified playbook hasn't been established post-merger.",
      onboarding:
        "Onboarding processes differ by legacy entity — a unified activation path would reduce time-to-value variance.",
      leadership:
        "Camila Leal (Sr. Director CS) and Alex Andrade (EVP Global Customer Operations) bring complementary depth — aligning their scope across the merged entity is the key next step.",
      org: "CS org design is a clear strength — the most unified element across the merged entities.",
    },
    trend: [5, 6, 6, 7, 7],
  },
  {
    id: "mediavalet",
    name: "MediaValet",
    sector: "Digital Asset Management SaaS",
    hq: "Vancouver, BC",
    employeesDisplay: "102",
    arrDisplay: "$10M–$20M",
    arrForRollup: [10_000_000, 20_000_000],
    confidence: "High",
    engagement:
      "Targeted build — formalize account planning cadence, layer SaaS-native CS frameworks onto existing relationship strength. 60–90 day engagement.",
    invesqSignal:
      "Strong satisfaction and onboarding foundation already in place — this is optimization, not rebuild.",
    lastDiagnostic: "2026-06-12",
    summary:
      "Strong foundation — high customer satisfaction, structured onboarding, clear role separation across the CS team. The opportunity: no formal account-planning cadence (QBRs, success plans) exists yet, and CS leadership brings deep client-relationship experience from outside core SaaS. Pairing that relationship strength with SaaS-native CS frameworks is the fastest path to the >100% NRR target set at acquisition.",
    scores: { org: 2, onboarding: 2, health: null, escalation: 2, revenue: 1, leadership: 1, planning: 0, ai: 0 },
    gapNotes: {
      planning:
        "Account Planning: No structured QBR or success-plan cadence yet, despite an active, well-reviewed CS team — a clear near-term build, not a rebuild.",
      ai: "No systematic AI in the CS motion — coverage at current ARR is manageable, but scaling without it will require proportional headcount adds.",
      leadership:
        "CS leadership has strong client-relationship experience from an agency/marketing background. Layering in SaaS-specific CS infrastructure — health scoring, structured QBRs — would help convert that relationship strength into measurable retention gains.",
      revenue:
        "Expansion motion is developing — CS sources some upsell informally but there is no structured CSQL process or NRR accountability.",
      onboarding:
        "Onboarding is a clear strength — review data consistently highlights fast time-to-value and responsive implementation support.",
      org: "CS org design is well-structured — clear role separation and a distinct CS team.",
      escalation:
        "Escalation management is a clear strength — review data highlights responsive support and effective issue resolution.",
    },
    trend: [7, 8, 8, 9, 9],
  },
  {
    id: "taxcalc",
    name: "TaxCalc",
    sector: "Tax Compliance / Practice Management SaaS (UK)",
    hq: "Aylesbury, UK",
    employeesDisplay: "100",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "High",
    engagement:
      "Establish a unified CS function — first CS leadership hire, connecting existing Account Management and Support teams. 90–180 day engagement.",
    invesqSignal:
      "Minority growth investment where CS infrastructure doesn't exist yet — directly aligned with STG's stated 'invest in customer success' thesis at close. High-clarity, high-leverage starting point.",
    leadershipFraming: "establish",
    lastDiagnostic: "2026-06-06",
    summary:
      "A minority growth investment where customer success hasn't yet been stood up as a unified function — retention is currently split between a commercial account-management team and a separate reactive support team, with no single owner connecting the two. Standing up a dedicated CS function is the single highest-leverage move available, and aligns directly with the investment thesis STG announced at close.",
    scores: { org: 0, onboarding: 1, health: null, escalation: 1, revenue: 0, leadership: 0, planning: 0, ai: 0 },
    gapNotes: {
      org: "CS Org Design: Retention responsibility is currently split across two teams with no unifying function — a first CS hire would close this gap directly.",
      leadership:
        "No dedicated CS leader is in place today. The opportunity isn't fixing an underperforming leader — it's that the role doesn't exist yet. A first CS leadership hire, unifying account management and support under one retention-accountable owner, is the clearest starting point.",
      revenue:
        "No expansion motion — the commercial team focuses on renewals and new logo; CS has no NRR ownership.",
      planning:
        "No account-planning cadence of any kind — renewals are calendar-driven, not success-plan-driven.",
      onboarding:
        "Onboarding runs through the commercial account-management team — no dedicated activation motion.",
      escalation: "Escalation routes through support SLAs — no CS-owned save motion.",
      ai: "No AI in any customer-facing or CS-adjacent workflow.",
    },
    trend: [2, 2, 3, 3, 3],
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
  // Illustrative: ARR range × tier risk midpoint. null when ARR is
  // undisclosed — no point estimate is ever fabricated.
  arrAtRiskRange: [number, number] | null;
  arrAtRiskDisplay: string; // formatted range, or "N/A" when ARR is undisclosed
}

// Composite used ONLY for tier assignment: N/A substitutes 1 per the framework rules.
function computeTierComposite(scores: Record<string, PillarScore>): number {
  return PILLARS.reduce((sum, p) => sum + (scores[p.id] ?? 1), 0);
}

// Displayed composites never fabricate a score — N/A pillars are excluded entirely.
function scoredPillars(scores: Record<string, PillarScore>): Pillar[] {
  return PILLARS.filter((p) => scores[p.id] !== null);
}

function computeGaps(raw: RawCompany): GapItem[] {
  const { scores } = raw;
  return PILLARS.filter((p) => scores[p.id] !== null && (scores[p.id] as number) < 2)
    .map((p) => {
      const score = scores[p.id];
      return {
        pillar: p,
        score,
        weakness: (2 - (score as number)) * p.weight,
        note: raw.gapNotes?.[p.id] ?? p.gapNote,
      };
    })
    .sort((a, b) => b.weakness - a.weakness);
}

function buildCompany(raw: RawCompany): Company {
  const scored = scoredPillars(raw.scores);
  const composite = scored.reduce((sum, p) => sum + (raw.scores[p.id] as number), 0);
  const weighted = scored.reduce((sum, p) => sum + (raw.scores[p.id] as number) * p.weight, 0);
  const tierComposite = computeTierComposite(raw.scores);
  const tier = getTier(tierComposite);
  const gaps = computeGaps(raw);
  const arrAtRiskRange: [number, number] | null = raw.arrForRollup
    ? [Math.round(raw.arrForRollup[0] * tier.riskMidpoint), Math.round(raw.arrForRollup[1] * tier.riskMidpoint)]
    : null;
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
    arrAtRiskRange,
    arrAtRiskDisplay: arrAtRiskRange ? formatCurrencyRange(arrAtRiskRange) : "N/A",
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

// Gap display title. When a company has no CS leader at all (leadershipFraming
// "establish"), the leadership gap is framed as establishing the function —
// never as replacing an incumbent.
export function gapTitle(company: Company, gap: GapItem): string {
  if (gap.pillar.id === "leadership" && company.leadershipFraming === "establish") {
    return "Establish CS Leadership";
  }
  return gap.pillar.name;
}

// ---------------------------------------------------------------------------
// Portfolio-level rollup
// ---------------------------------------------------------------------------

// ARR rollups only include companies with a disclosed ARR range. Ranges are
// summed as ranges — a point figure is never fabricated.
const DISCLOSED = COMPANIES.filter((c) => c.arrForRollup !== null);

function sumRanges(ranges: [number, number][]): [number, number] {
  return ranges.reduce<[number, number]>((acc, [lo, hi]) => [acc[0] + lo, acc[1] + hi], [0, 0]);
}

export const portfolioSummary = {
  companyCount: COMPANIES.length,
  totalArrDisplay: formatCurrencyRange(sumRanges(DISCLOSED.map((c) => c.arrForRollup as [number, number]))),
  arrAtRiskDisplay: formatCurrencyRange(sumRanges(DISCLOSED.map((c) => c.arrAtRiskRange as [number, number]))),
  arrDisclosedCount: DISCLOSED.length,
  arrUndisclosedCount: COMPANIES.length - DISCLOSED.length,
  arrUndisclosedNames: COMPANIES.filter((c) => c.arrForRollup === null).map((c) => c.name),
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

// Like formatCurrency but trims a trailing ".0" ("$5.0M" → "$5M") for tidy ranges.
export function formatCurrencyCompact(value: number): string {
  return formatCurrency(value).replace(/\.0(?=[KMB]$)/, "");
}

export function formatCurrencyRange([lo, hi]: [number, number]): string {
  return `${formatCurrencyCompact(lo)}–${formatCurrencyCompact(hi)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
