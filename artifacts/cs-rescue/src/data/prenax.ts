// Prenax Customer Health Intelligence — fictional but realistic demo dataset.
// One coherent universe powering four executive screens: Executive Overview,
// Portfolio Health Table, Account Drilldown, and the Methodology / Scoring Model.
// No backend; all values are deterministic so the prototype is stable for
// screenshots. Modeled as a Phase 1 diagnostic built on Salesforce Service Cloud.

export type HealthBand = "green" | "amber" | "red";

export type DimensionKey =
  | "platformAdoption"
  | "renewalReadiness"
  | "customerEngagement"
  | "financialHealth"
  | "operationalFriction"
  | "expansionPotential"
  | "customerSentiment";

export type ScoreKey = "overall" | DimensionKey;

export interface ScoreDriver {
  label: string;
  detail: string;
  impact: number; // signed contribution, negative = drag, positive = lift
}

export interface ScoreDetail {
  key: ScoreKey;
  label: string;
  description: string;
  score: number; // 0-100
  band: HealthBand;
  delta: number; // change vs. prior period
  weight: number; // contribution to the composite, as a percentage (dimensions only)
  trend: number[]; // trailing periods, ending at `score`
  drivers: ScoreDriver[];
  actions: string[];
}

export interface PrenaxCustomer {
  id: string;
  name: string;
  initials: string;
  industry: string;
  segment: "Strategic" | "Enterprise" | "Growth" | "Commercial";
  region: "North America" | "EMEA" | "APAC" | "LATAM";
  arr: number;
  seats: number;
  csm: string;
  executiveSponsor: string;
  tenureMonths: number;
  renewalDate: string;
  renewalRiskPct: number;
  expansionOpportunity: number;
  nps: number;
  npsTrend: number[];
  adoptionPct: number;
  selfServiceRate: number;
  overallScore: number;
  overallBand: HealthBand;
  overallDelta: number;
  overallTrend: number[];
  summary: string;
  topRiskDriver: string;
  recommendedNextAction: string;
  nextActionOwner: string;
  nextActionDue: string;
  scores: ScoreDetail[]; // overall + 7 dimensions
}

export const PERIOD_LABELS = [
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
];

export const bandOf = (score: number): HealthBand =>
  score >= 75 ? "green" : score >= 55 ? "amber" : "red";

export const bandLabel: Record<HealthBand, string> = {
  green: "Healthy",
  amber: "Watch",
  red: "At Risk",
};

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

function seeded(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function makeTrend(seed: string, end: number, points = PERIOD_LABELS.length, vol = 5): number[] {
  const r = seeded(seed);
  const out: number[] = [];
  let v = clamp(end - (r() * 16 - 5));
  for (let i = 0; i < points - 1; i++) {
    out.push(Math.round(v));
    v = clamp(v + (r() * 2 - 1) * vol + (end - v) * 0.28);
  }
  out.push(Math.round(end));
  return out;
}

// ---------------------------------------------------------------------------
// Scoring model — seven weighted dimensions (weights sum to 100)
// ---------------------------------------------------------------------------

interface DimContent {
  label: string;
  description: string;
  weight: number; // integer percentage
  strong: { drivers: Omit<ScoreDriver, "impact">[]; actions: string[] };
  weak: { drivers: Omit<ScoreDriver, "impact">[]; actions: string[] };
}

const DIMENSIONS: Record<DimensionKey, DimContent> = {
  platformAdoption: {
    label: "Platform Adoption",
    description: "Depth and breadth of active usage across teams and modules.",
    weight: 20,
    strong: {
      drivers: [
        { label: "Weekly active usage above benchmark", detail: "WAU per seat at top-quartile for the segment." },
        { label: "Breadth across core modules", detail: "Five of six core modules in regular production use." },
        { label: "Internal champion community", detail: "Power users running their own enablement sessions." },
      ],
      actions: [
        "Expand enablement to adjacent teams to deepen breadth.",
        "Feature usage wins at the next business review.",
      ],
    },
    weak: {
      drivers: [
        { label: "Active-seat decay", detail: "Active seats down sharply quarter-over-quarter." },
        { label: "Single-workflow dependency", detail: "Usage concentrated in one module, limiting stickiness." },
        { label: "Onboarding never completed", detail: "Core admin team did not finish platform certification." },
      ],
      actions: [
        "Launch a 30-day re-onboarding plan targeting dormant seats.",
        "Assign an adoption specialist with a usage-recovery target.",
      ],
    },
  },
  renewalReadiness: {
    label: "Renewal Readiness",
    description: "Likelihood and momentum toward an on-time, full-value renewal.",
    weight: 20,
    strong: {
      drivers: [
        { label: "Multi-year commitment in place", detail: "Three-year term signed with auto-renew and a 6% annual uplift." },
        { label: "Budget reconfirmed by economic buyer", detail: "Sponsor reconfirmed the platform line in the current fiscal plan." },
        { label: "Procurement engaged early", detail: "Renewal motion opened 120+ days ahead of term end." },
      ],
      actions: [
        "Lock multi-year terms with finance before quarter close.",
        "Record champion sign-off in the renewal file as a proof point.",
      ],
    },
    weak: {
      drivers: [
        { label: "Renewal inside 90 days, uncommitted", detail: "Term ends soon with no written or verbal commitment on file." },
        { label: "Budget under cost review", detail: "Finance flagged the line in the latest vendor-rationalization cycle." },
        { label: "Pricing pushback at last review", detail: "Buyer signaled resistance to the planned list uplift." },
      ],
      actions: [
        "Escalate to the executive sponsor and schedule a value-realization review.",
        "Build an ROI case quantifying realized savings to date.",
        "Offer phased ramp pricing to de-risk the commitment.",
      ],
    },
  },
  customerEngagement: {
    label: "Customer Engagement",
    description: "Strength and frequency of stakeholder and end-user engagement.",
    weight: 15,
    strong: {
      drivers: [
        { label: "Active executive sponsor", detail: "Senior sponsor attends every business review." },
        { label: "Multi-threaded relationships", detail: "Engaged across four or more stakeholders." },
        { label: "Consistent review cadence", detail: "Quarterly business reviews held on schedule." },
      ],
      actions: [
        "Schedule an executive value review to reinforce strategic fit.",
      ],
    },
    weak: {
      drivers: [
        { label: "Sponsor has gone dark", detail: "No executive engagement in 60+ days." },
        { label: "Single-threaded relationship", detail: "Account depends on one mid-level contact." },
        { label: "Leadership change", detail: "Newly appointed leader not yet introduced to the platform." },
      ],
      actions: [
        "Re-establish executive sponsorship through a mutual action plan.",
        "Multi-thread into new leadership within 30 days.",
      ],
    },
  },
  financialHealth: {
    label: "Financial Health",
    description: "Payment behavior, spend trajectory, and commercial margin.",
    weight: 15,
    strong: {
      drivers: [
        { label: "Invoices paid on time", detail: "Zero days past due across the last four invoices." },
        { label: "Spend trending up", detail: "Net account spend up double digits year-over-year." },
        { label: "Clean commercial terms", detail: "Discounting within policy; healthy margin profile." },
      ],
      actions: [
        "Position a multi-year prepay incentive to extend runway.",
        "Keep executives aligned on realized financial value.",
      ],
    },
    weak: {
      drivers: [
        { label: "Aging receivables", detail: "Multiple invoices more than 45 days past due." },
        { label: "Vendor consolidation exposure", detail: "Account named in the customer's cost-cutting program." },
        { label: "Discount above guardrail", detail: "Effective discount is pressuring account margin." },
      ],
      actions: [
        "Engage AR and the customer's finance team to clear aging balances.",
        "Reframe pricing around outcomes to protect margin at renewal.",
      ],
    },
  },
  operationalFriction: {
    label: "Operational Friction",
    description:
      "Support load, incident stability, and time-to-resolution. Scored inversely — a higher score means less friction.",
    weight: 10,
    strong: {
      drivers: [
        { label: "Fast resolution, low volume", detail: "Median time-to-resolve comfortably inside SLA." },
        { label: "High satisfaction", detail: "Trailing CSAT at 4.7 of 5 across interactions." },
        { label: "No critical escalations", detail: "Zero Sev-1 incidents over the last two quarters." },
      ],
      actions: [
        "Capture support wins as renewal and reference proof points.",
      ],
    },
    weak: {
      drivers: [
        { label: "SLA breaches this quarter", detail: "Several misses on high-priority tickets." },
        { label: "Recurring incident pattern", detail: "The same integration is failing repeatedly." },
        { label: "Satisfaction slipping", detail: "CSAT fell below 3.5 of 5 after recent incidents." },
      ],
      actions: [
        "Open a reliability review with engineering on the recurring incident.",
        "Assign a named support lead with weekly status until stabilized.",
      ],
    },
  },
  expansionPotential: {
    label: "Expansion Potential",
    description: "Whitespace, capacity signals, and appetite for growth.",
    weight: 10,
    strong: {
      drivers: [
        { label: "Whitespace identified", detail: "Several adjacent business units not yet on the platform." },
        { label: "Usage at capacity", detail: "Seat utilization above 90%, meeting the upsell trigger." },
        { label: "ROI documented", detail: "Customer has quantified savings that support expansion." },
      ],
      actions: [
        "Build an expansion proposal for the highest-fit business unit.",
        "Run a value-mapping workshop to size the opportunity.",
      ],
    },
    weak: {
      drivers: [
        { label: "No expansion signals", detail: "Flat usage with no new use cases surfacing." },
        { label: "Budget constrained", detail: "No incremental budget available this fiscal year." },
        { label: "No growth sponsor", detail: "No internal champion to drive an expansion motion." },
      ],
      actions: [
        "Nurture a future expansion thesis and revisit next quarter.",
      ],
    },
  },
  customerSentiment: {
    label: "Customer Sentiment",
    description: "Voice-of-customer signals: NPS, CSAT, and advocacy.",
    weight: 10,
    strong: {
      drivers: [
        { label: "Promoter-level NPS", detail: "Survey responses in the promoter range and trending up." },
        { label: "Acts as a reference", detail: "Willing to speak to prospects and join case studies." },
        { label: "Positive review feedback", detail: "Constructive, forward-looking tone in the latest review." },
      ],
      actions: [
        "Activate as a reference and capture an advocacy quote.",
      ],
    },
    weak: {
      drivers: [
        { label: "Detractor-level NPS", detail: "Recent survey scores in the detractor range." },
        { label: "Negative escalation tone", detail: "Frustration surfaced in recent support escalations." },
        { label: "Declined to reference", detail: "Passed on a reference request, citing unmet expectations." },
      ],
      actions: [
        "Run a closed-loop follow-up on the latest detractor feedback.",
      ],
    },
  },
};

const DIMENSION_ORDER: DimensionKey[] = [
  "platformAdoption",
  "renewalReadiness",
  "customerEngagement",
  "financialHealth",
  "operationalFriction",
  "expansionPotential",
  "customerSentiment",
];

// Public scoring model for the Methodology screen.
export const SCORING_MODEL: { key: DimensionKey; label: string; weight: number; description: string }[] =
  DIMENSION_ORDER.map((key) => ({
    key,
    label: DIMENSIONS[key].label,
    weight: DIMENSIONS[key].weight,
    description: DIMENSIONS[key].description,
  }));

export const METHODOLOGY = {
  source: "Salesforce Service Cloud",
  cadence: "Refreshed weekly",
  phase: "Phase 1 diagnostic — deliverable in 60–90 days",
  scale: "Each dimension is scored 0–100, then weighted into a single composite Customer Health Score.",
  bands: [
    { band: "green" as HealthBand, label: "Healthy", range: "75–100", meaning: "On track. Protect the relationship and pursue expansion." },
    { band: "amber" as HealthBand, label: "Watch", range: "55–74", meaning: "Emerging risk. Intervene proactively before renewal." },
    { band: "red" as HealthBand, label: "At Risk", range: "0–54", meaning: "Active risk. Immediate, owner-assigned action required." },
  ],
  notes: [
    "Built on existing Salesforce Service Cloud data — no new system of record required.",
    "Scores are diagnostic signals to focus human attention — they inform decisions, they don't replace judgment.",
    "Every at-risk account carries a named owner and a due date for the next action.",
  ],
};

function buildDimension(
  key: DimensionKey,
  score: number,
  customerId: string,
): ScoreDetail {
  const meta = DIMENSIONS[key];
  const trend = makeTrend(`${customerId}-${key}`, score);
  const delta = score - trend[trend.length - 2];
  let drivers: ScoreDriver[];
  let actions: string[];

  if (score >= 72) {
    drivers = meta.strong.drivers.map((d, i) => ({ ...d, impact: [9, 6, 4][i] }));
    actions = meta.strong.actions;
  } else if (score < 58) {
    drivers = meta.weak.drivers.map((d, i) => ({ ...d, impact: [-13, -9, -6][i] }));
    actions = meta.weak.actions;
  } else {
    drivers = [
      { ...meta.strong.drivers[0], impact: 5 },
      { ...meta.weak.drivers[0], impact: -8 },
      { ...meta.weak.drivers[1], impact: -5 },
    ];
    actions = meta.weak.actions;
  }

  return {
    key,
    label: meta.label,
    description: meta.description,
    score,
    band: bandOf(score),
    delta,
    weight: meta.weight,
    trend,
    drivers,
    actions,
  };
}

// ---------------------------------------------------------------------------
// Customer roster (fictional)
// ---------------------------------------------------------------------------

interface RawDims {
  adoption: number;
  renewal: number;
  engagement: number;
  financial: number;
  operational: number;
  expansion: number;
}

interface RawCustomer {
  id: string;
  name: string;
  initials: string;
  industry: string;
  segment: PrenaxCustomer["segment"];
  region: PrenaxCustomer["region"];
  arr: number;
  seats: number;
  csm: string;
  executiveSponsor: string;
  tenureMonths: number;
  renewalDate: string;
  nps: number;
  summary: string;
  topRiskDriver: string;
  recommendedNextAction: string;
  dims: RawDims;
}

const RAW: RawCustomer[] = [
  {
    id: "northwind",
    name: "Northwind Logistics",
    initials: "NL",
    industry: "Logistics & Supply Chain",
    segment: "Strategic",
    region: "North America",
    arr: 2_400_000,
    seats: 1850,
    csm: "Dana Whitfield",
    executiveSponsor: "COO — Marcus Bell",
    tenureMonths: 41,
    renewalDate: "2026-11-30",
    nps: 62,
    summary:
      "Anchor strategic account with deep, multi-team adoption and an engaged COO sponsor. Strong renewal posture and clear expansion whitespace in two regions.",
    topRiskDriver: "No material risk — expansion whitespace open",
    recommendedNextAction: "Build a two-region expansion proposal for the COO review.",
    dims: { adoption: 84, renewal: 88, engagement: 86, financial: 90, operational: 82, expansion: 80 },
  },
  {
    id: "helios",
    name: "Helios Financial Group",
    initials: "HF",
    industry: "Financial Services",
    segment: "Strategic",
    region: "North America",
    arr: 2_950_000,
    seats: 2200,
    csm: "Priya Raman",
    executiveSponsor: "CIO — Susan Albright",
    tenureMonths: 28,
    renewalDate: "2026-09-15",
    nps: 28,
    summary:
      "High-value account drifting into watch territory. Adoption softening and support friction are weighing on an otherwise solid commercial relationship ahead of a Q3 renewal.",
    topRiskDriver: "Adoption softening ahead of Q3 renewal",
    recommendedNextAction: "Run a value-realization review and re-onboard dormant teams before renewal.",
    dims: { adoption: 58, renewal: 64, engagement: 60, financial: 72, operational: 55, expansion: 52 },
  },
  {
    id: "aperture",
    name: "Aperture Robotics",
    initials: "AR",
    industry: "Industrial Manufacturing",
    segment: "Enterprise",
    region: "EMEA",
    arr: 1_150_000,
    seats: 720,
    csm: "Liam Doyle",
    executiveSponsor: "VP Ops — Elena Fischer",
    tenureMonths: 22,
    renewalDate: "2027-02-28",
    nps: 55,
    summary:
      "Healthy enterprise account with best-in-class adoption breadth and a strong expansion signal as new production lines come online.",
    topRiskDriver: "No material risk — capacity at the upsell trigger",
    recommendedNextAction: "Size the expansion as new production lines come online.",
    dims: { adoption: 88, renewal: 82, engagement: 80, financial: 78, operational: 85, expansion: 86 },
  },
  {
    id: "cascade",
    name: "Cascade Health Systems",
    initials: "CH",
    industry: "Healthcare",
    segment: "Enterprise",
    region: "North America",
    arr: 980_000,
    seats: 540,
    csm: "Dana Whitfield",
    executiveSponsor: "VP IT — (vacant)",
    tenureMonths: 31,
    renewalDate: "2026-08-01",
    nps: -10,
    summary:
      "Critical at-risk account. Sponsor departed, support incidents are recurring, and a near-term renewal is unprotected. Requires immediate executive intervention.",
    topRiskDriver: "Sponsor vacant with recurring support incidents",
    recommendedNextAction: "Escalate to an executive sponsor and open a reliability review this week.",
    dims: { adoption: 48, renewal: 42, engagement: 40, financial: 55, operational: 38, expansion: 35 },
  },
  {
    id: "veridian",
    name: "Veridian Energy",
    initials: "VE",
    industry: "Energy & Utilities",
    segment: "Strategic",
    region: "EMEA",
    arr: 1_800_000,
    seats: 1300,
    csm: "Priya Raman",
    executiveSponsor: "CDO — Henrik Olsen",
    tenureMonths: 19,
    renewalDate: "2026-12-20",
    nps: 34,
    summary:
      "Stable but plateauing strategic account. Executive engagement has thinned and expansion has stalled; needs a renewed value narrative to climb back to green.",
    topRiskDriver: "Executive engagement thinning, expansion stalled",
    recommendedNextAction: "Re-establish executive sponsorship with a mutual action plan.",
    dims: { adoption: 62, renewal: 66, engagement: 58, financial: 70, operational: 60, expansion: 64 },
  },
  {
    id: "lumen",
    name: "Lumen Retail Group",
    initials: "LR",
    industry: "Retail",
    segment: "Enterprise",
    region: "North America",
    arr: 1_350_000,
    seats: 940,
    csm: "Liam Doyle",
    executiveSponsor: "SVP Digital — Tara Nguyen",
    tenureMonths: 26,
    renewalDate: "2027-01-31",
    nps: 58,
    summary:
      "Strong, well-adopted account with healthy financials and an enthusiastic digital sponsor. A reliable reference and a solid candidate for measured expansion.",
    topRiskDriver: "No material risk — reference-ready",
    recommendedNextAction: "Activate as a reference and scope measured expansion.",
    dims: { adoption: 86, renewal: 80, engagement: 78, financial: 82, operational: 84, expansion: 82 },
  },
  {
    id: "atlas",
    name: "Atlas Freight",
    initials: "AF",
    industry: "Logistics & Supply Chain",
    segment: "Growth",
    region: "LATAM",
    arr: 420_000,
    seats: 240,
    csm: "Carlos Mendes",
    executiveSponsor: "Dir Ops — (single-threaded)",
    tenureMonths: 14,
    renewalDate: "2026-07-15",
    nps: -5,
    summary:
      "At-risk growth account with imminent renewal and no executive cover. Adoption never reached escape velocity after a rushed onboarding.",
    topRiskDriver: "Imminent renewal with no executive cover",
    recommendedNextAction: "Assign an executive sponsor and launch a 30-day adoption recovery.",
    dims: { adoption: 44, renewal: 40, engagement: 38, financial: 50, operational: 46, expansion: 42 },
  },
  {
    id: "solstice",
    name: "Solstice Media",
    initials: "SM",
    industry: "Media & Entertainment",
    segment: "Growth",
    region: "North America",
    arr: 360_000,
    seats: 180,
    csm: "Carlos Mendes",
    executiveSponsor: "VP Content — Jordan Pike",
    tenureMonths: 17,
    renewalDate: "2026-10-31",
    nps: 30,
    summary:
      "Watch-list growth account trending in the right direction. Adoption and expansion signals are improving but financial discipline needs attention.",
    topRiskDriver: "Financial discipline lagging improving usage",
    recommendedNextAction: "Engage finance to clear aging balances and lock terms.",
    dims: { adoption: 66, renewal: 60, engagement: 62, financial: 58, operational: 64, expansion: 68 },
  },
  {
    id: "quantel",
    name: "Quantel Semiconductors",
    initials: "QS",
    industry: "Technology Hardware",
    segment: "Enterprise",
    region: "APAC",
    arr: 1_500_000,
    seats: 1100,
    csm: "Mei Tan",
    executiveSponsor: "CTO — Akira Sato",
    tenureMonths: 24,
    renewalDate: "2027-03-31",
    nps: 64,
    summary:
      "Flagship healthy account: exceptional adoption, an engaged CTO, and the strongest expansion readiness in the portfolio as fab capacity grows.",
    topRiskDriver: "No material risk — strongest expansion fit",
    recommendedNextAction: "Advance the expansion proposal as fab capacity grows.",
    dims: { adoption: 90, renewal: 86, engagement: 88, financial: 84, operational: 80, expansion: 90 },
  },
  {
    id: "beacon",
    name: "Beacon Insurance",
    initials: "BI",
    industry: "Insurance",
    segment: "Enterprise",
    region: "North America",
    arr: 760_000,
    seats: 460,
    csm: "Mei Tan",
    executiveSponsor: "VP Claims — Robert Hale",
    tenureMonths: 20,
    renewalDate: "2026-11-10",
    nps: 26,
    summary:
      "Middle-of-the-road account holding steady in amber. Solid sponsor relationship offset by lagging adoption and limited near-term expansion appetite.",
    topRiskDriver: "Lagging adoption limits near-term growth",
    recommendedNextAction: "Expand enablement to adjacent claims teams.",
    dims: { adoption: 58, renewal: 62, engagement: 64, financial: 66, operational: 60, expansion: 56 },
  },
  {
    id: "riverstone",
    name: "Riverstone Education",
    initials: "RE",
    industry: "Education",
    segment: "Commercial",
    region: "North America",
    arr: 140_000,
    seats: 95,
    csm: "Carlos Mendes",
    executiveSponsor: "Dir IT — (low engagement)",
    tenureMonths: 11,
    renewalDate: "2026-07-31",
    nps: -8,
    summary:
      "Small at-risk commercial account. Low adoption, thin engagement, and a near-term renewal make this a likely churn unless usage is revived quickly.",
    topRiskDriver: "Low adoption and thin engagement near renewal",
    recommendedNextAction: "Launch usage recovery and multi-thread beyond the single contact.",
    dims: { adoption: 40, renewal: 45, engagement: 42, financial: 48, operational: 52, expansion: 38 },
  },
  {
    id: "meridian",
    name: "Meridian Pharma",
    initials: "MP",
    industry: "Pharmaceuticals",
    segment: "Strategic",
    region: "EMEA",
    arr: 2_100_000,
    seats: 1600,
    csm: "Liam Doyle",
    executiveSponsor: "CIO — Dr. Anita Verma",
    tenureMonths: 35,
    renewalDate: "2027-04-30",
    nps: 60,
    summary:
      "Mature strategic account with excellent financial health and a long-tenured CIO sponsor. Steady adoption and a credible expansion path across R&D units.",
    topRiskDriver: "No material risk — steady expansion path",
    recommendedNextAction: "Map an R&D-unit expansion for the CIO sponsor.",
    dims: { adoption: 80, renewal: 84, engagement: 84, financial: 88, operational: 82, expansion: 78 },
  },
];

// ---------------------------------------------------------------------------
// Build full customer objects
// ---------------------------------------------------------------------------

const ACTION_BASE = new Date("2026-06-20");
const DUE_OFFSET_DAYS: Record<HealthBand, number> = { red: 12, amber: 28, green: 49 };

function dueDateFor(band: HealthBand): string {
  const d = new Date(ACTION_BASE);
  d.setDate(d.getDate() + DUE_OFFSET_DAYS[band]);
  return d.toISOString().slice(0, 10);
}

function dimValuesFor(raw: RawCustomer): Record<DimensionKey, number> {
  return {
    platformAdoption: raw.dims.adoption,
    renewalReadiness: raw.dims.renewal,
    customerEngagement: raw.dims.engagement,
    financialHealth: raw.dims.financial,
    operationalFriction: raw.dims.operational,
    expansionPotential: raw.dims.expansion,
    customerSentiment: clamp(Math.round(40 + raw.nps * 0.85)),
  };
}

function buildCustomer(raw: RawCustomer): PrenaxCustomer {
  const dimValues = dimValuesFor(raw);
  const dimensionScores = DIMENSION_ORDER.map((key) =>
    buildDimension(key, dimValues[key], raw.id),
  );

  const overallRaw = DIMENSION_ORDER.reduce(
    (sum, key) => sum + dimValues[key] * (DIMENSIONS[key].weight / 100),
    0,
  );
  const overallScore = Math.round(overallRaw);
  const overallBand = bandOf(overallScore);
  const overallTrend = makeTrend(`${raw.id}-overall`, overallScore, PERIOD_LABELS.length, 4);
  const overallDelta = overallScore - overallTrend[overallTrend.length - 2];

  // Composite drivers = dimensions sorted by their contribution vs. a 70 baseline.
  const overallDrivers: ScoreDriver[] = DIMENSION_ORDER.map((key) => {
    const meta = DIMENSIONS[key];
    const s = dimValues[key];
    return {
      label: meta.label,
      detail: `${s}/100 — ${bandLabel[bandOf(s)]}. ${meta.description}`,
      impact: Math.round((s - 70) * (meta.weight / 100) * 1.4),
    };
  })
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 4);

  // Composite actions = pull from the two weakest dimensions.
  const weakest = [...DIMENSION_ORDER]
    .sort((a, b) => dimValues[a] - dimValues[b])
    .slice(0, 2);
  const overallActions = Array.from(
    new Set(
      weakest.flatMap((key) => {
        const d = dimensionScores.find((x) => x.key === key)!;
        return d.actions.slice(0, 1);
      }),
    ),
  );

  const overall: ScoreDetail = {
    key: "overall",
    label: "Customer Health Score",
    description: "Weighted composite across all seven health dimensions.",
    score: overallScore,
    band: overallBand,
    delta: overallDelta,
    weight: 100,
    trend: overallTrend,
    drivers: overallDrivers,
    actions: overallActions,
  };

  const renewalScore = dimValues.renewalReadiness;
  const renewalRiskPct = clamp(Math.round((100 - renewalScore) * 0.95));
  const expansionOpportunity =
    Math.round((raw.arr * (dimValues.expansionPotential / 100) * 0.6) / 1000) * 1000;
  const selfServiceRate = clamp(Math.round(dimValues.platformAdoption * 0.7 + 12));

  return {
    id: raw.id,
    name: raw.name,
    initials: raw.initials,
    industry: raw.industry,
    segment: raw.segment,
    region: raw.region,
    arr: raw.arr,
    seats: raw.seats,
    csm: raw.csm,
    executiveSponsor: raw.executiveSponsor,
    tenureMonths: raw.tenureMonths,
    renewalDate: raw.renewalDate,
    renewalRiskPct,
    expansionOpportunity,
    nps: raw.nps,
    npsTrend: makeTrend(`${raw.id}-nps`, raw.nps + 50, PERIOD_LABELS.length, 6).map((v) => v - 50),
    adoptionPct: dimValues.platformAdoption,
    selfServiceRate,
    overallScore,
    overallBand,
    overallDelta,
    overallTrend,
    summary: raw.summary,
    topRiskDriver: raw.topRiskDriver,
    recommendedNextAction: raw.recommendedNextAction,
    nextActionOwner: raw.csm,
    nextActionDue: dueDateFor(overallBand),
    scores: [overall, ...dimensionScores],
  };
}

export const prenaxCustomers: PrenaxCustomer[] = RAW.map(buildCustomer);

export const getCustomer = (id: string): PrenaxCustomer | undefined =>
  prenaxCustomers.find((c) => c.id === id);

// The representative at-risk account featured on the Account Drilldown screen.
export const FEATURED_AT_RISK_ID = "cascade";

// ---------------------------------------------------------------------------
// Portfolio-level aggregates
// ---------------------------------------------------------------------------

const avg = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

function seriesAverage(series: number[][]): number[] {
  const len = series[0]?.length ?? 0;
  return Array.from({ length: len }, (_, i) =>
    Math.round(avg(series.map((s) => s[i]))),
  );
}

const overallHealthTrend = seriesAverage(prenaxCustomers.map((c) => c.overallTrend));
const adoptionTrend = seriesAverage(
  prenaxCustomers.map((c) => c.scores.find((s) => s.key === "platformAdoption")!.trend),
);

export const portfolioMetrics = {
  customerCount: prenaxCustomers.length,
  overallHealth: Math.round(avg(prenaxCustomers.map((c) => c.overallScore))),
  overallHealthTrend,
  overallHealthDelta:
    overallHealthTrend[overallHealthTrend.length - 1] -
    overallHealthTrend[overallHealthTrend.length - 2],
  green: prenaxCustomers.filter((c) => c.overallBand === "green").length,
  amber: prenaxCustomers.filter((c) => c.overallBand === "amber").length,
  red: prenaxCustomers.filter((c) => c.overallBand === "red").length,
  accountsAtRisk: prenaxCustomers.filter((c) => c.overallBand === "red").length,
  adoptionPct: Math.round(avg(prenaxCustomers.map((c) => c.adoptionPct))),
  adoptionTrend,
  selfServiceRate: Math.round(avg(prenaxCustomers.map((c) => c.selfServiceRate))),
  selfServiceTrend: adoptionTrend.map((v) => clamp(Math.round(v * 0.7 + 12))),
  nps: Math.round(avg(prenaxCustomers.map((c) => c.nps))),
  npsTrend: seriesAverage(prenaxCustomers.map((c) => c.npsTrend)),
  renewalRiskPct: Math.round(avg(prenaxCustomers.map((c) => c.renewalRiskPct))),
  renewalRiskTrend: overallHealthTrend.map((v) => clamp(Math.round((100 - v) * 0.9))),
  renewalRiskArr: prenaxCustomers.reduce(
    (s, c) => s + c.arr * (c.renewalRiskPct / 100),
    0,
  ),
  expansionOpportunity: prenaxCustomers.reduce((s, c) => s + c.expansionOpportunity, 0),
  totalArr: prenaxCustomers.reduce((s, c) => s + c.arr, 0),
};

export const healthDistribution: { band: HealthBand; label: string; count: number; arr: number }[] = [
  { band: "green", label: "Healthy" },
  { band: "amber", label: "Watch" },
  { band: "red", label: "At Risk" },
].map(({ band, label }) => ({
  band: band as HealthBand,
  label,
  count: prenaxCustomers.filter((c) => c.overallBand === band).length,
  arr: prenaxCustomers
    .filter((c) => c.overallBand === band)
    .reduce((s, c) => s + c.arr, 0),
}));

function groupBy<K extends string>(keyFn: (c: PrenaxCustomer) => K) {
  const map = new Map<K, PrenaxCustomer[]>();
  for (const c of prenaxCustomers) {
    const k = keyFn(c);
    map.set(k, [...(map.get(k) ?? []), c]);
  }
  return Array.from(map.entries()).map(([key, members]) => ({
    key,
    count: members.length,
    arr: members.reduce((s, c) => s + c.arr, 0),
    avgHealth: Math.round(avg(members.map((c) => c.overallScore))),
    green: members.filter((c) => c.overallBand === "green").length,
    amber: members.filter((c) => c.overallBand === "amber").length,
    red: members.filter((c) => c.overallBand === "red").length,
  }));
}

export const segmentation = {
  bySegment: groupBy((c) => c.segment),
  byIndustry: groupBy((c) => c.industry),
  byRegion: groupBy((c) => c.region),
};

export const riskTrends = {
  periods: PERIOD_LABELS,
  health: portfolioMetrics.overallHealthTrend,
  renewalRisk: portfolioMetrics.renewalRiskTrend,
  adoption: portfolioMetrics.adoptionTrend,
  nps: portfolioMetrics.npsTrend,
};

export const formatCurrency = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
