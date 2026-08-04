// ---------------------------------------------------------------------------
// Portfolio data layer — shared TypeScript types
// ---------------------------------------------------------------------------

// 0 = Infrastructure Gap · 1 = Partial/Developing · 2 = Optimized · null = Insufficient Data (NA)
export type PillarScore = 0 | 1 | 2 | null;

// ---------------------------------------------------------------------------
// Assessment — a single diagnostic run for a company.
// The company's current state always derives from the LATEST assessment.
// Appending a new assessment = performing a re-run.
// ---------------------------------------------------------------------------
// Rubric v2 (Phase 2) — stored 4-pillar Low/Medium/High fields riding on the
// assessment. Optional while v1 rows may still exist; when present, clients
// display these stored values instead of re-deriving them.
// Type-only import from ./rubricV2 (which imports PillarScore from here) —
// safe: the cycle is erased at compile time.
import type { RubricBand, RubricValue } from "./rubricV2";

export interface AssessmentRubric {
  orgDesignScore: RubricValue;
  onboardingScore: RubricValue;
  healthScoringScore: RubricValue;
  renewalExpansionScore: RubricValue;
  portcoScore: RubricBand;
  // Optional so client-side RubricV2Scores (which omits it) stays mutually
  // assignable; every DB row carries it (NOT NULL, default "v1").
  rubricVersion?: string;
}

export interface Assessment {
  date: string;                              // ISO date string e.g. "2026-06-04"
  pillarScores: Record<string, PillarScore>; // all 8 pillars must be present
  rubric?: AssessmentRubric;                 // rubric v2 stored fields (Phase 2)
  note?: string;                             // optional narrative for this diagnostic run
}

// A single data point on the company's composite trend — one per assessment,
// normalized to the 0–16 scale so denominators are comparable across runs
// (NA pillar counts may change between diagnostics).
export interface AssessmentPoint {
  date: string;
  composite: number;           // raw composite for this assessment (scored pillars only)
  displayMax: number;          // denominator for this assessment (16 − 2 × naCount)
  normalizedComposite: number; // (composite / displayMax) × PILLAR_MAX — cross-run comparable
}

// ---------------------------------------------------------------------------
// Actions log — events annotated on the trend / forecast chart
// ---------------------------------------------------------------------------
export interface ActionLogEntry {
  date: string;   // ISO date e.g. "2025-10-15"
  label: string;  // short description shown as chart annotation
}

// ---------------------------------------------------------------------------
// Pillar definition
// ---------------------------------------------------------------------------
export interface Pillar {
  id: string;
  name: string;
  weight: number;    // multiplier used in the Phase 2 weighted composite
  measures: string;  // what it measures
  signals: string;   // primary external signal sources
  peValue: string;   // PE value link
  gapNote: string;   // shown when this pillar is a company's top gap (generic fallback)
}

// ---------------------------------------------------------------------------
// Engagement tier
// ---------------------------------------------------------------------------
export interface Tier {
  id: 1 | 2 | 3 | 4;
  label: string;
  range: [number, number];
  color: string;        // hex for rings/charts
  badgeClass: string;
  engagement: string;
  invesqSignal: string;
  arrRisk: string;
  riskMidpoint: number; // used to estimate ARR at risk
  // CQ-45: the tier's published risk-% band as numeric bounds, used to turn a
  // first-class ARR point value into an ARR-at-risk dollar range. null low =
  // open-ended downward ("<5%"); null high = open-ended upward (">20%").
  riskBandLow: number | null;
  riskBandHigh: number | null;
}

// ---------------------------------------------------------------------------
// Firm (tenant)
// ---------------------------------------------------------------------------
export interface Firm {
  slug: string;
  displayName: string;
  statusLabel: string;   // e.g. "Design-partner preview"
  internalOnly: boolean; // when true, the rose "internal" pill is shown on the dashboard
  // When true, the tenant portal requires an authenticated admin session to
  // view. Absent/false = public (the default; no behavior change).
  requireLogin?: boolean;
  // Stored, human-assigned firm-level ICP fit rating shown as the rollup badge
  // on the tenant dashboard. Optional: firms without it show no badge. This is
  // deliberately NOT derived from portfolio mix (see suggestedIcpFit on
  // PortfolioSummary, which remains for per-company analytics only).
  icpFit?: IcpFitLabel;
}

// Portal display metadata stored in the firms.meta jsonb column.
export interface FirmMeta {
  statusLabel: string;
  internalOnly: boolean;
  // See Firm.requireLogin. Persisted here so an admin can lock a tenant later
  // without a rebuild; rides the (public) bootstrap so PortfolioGate can gate.
  requireLogin?: boolean;
}

// ---------------------------------------------------------------------------
// ICP eligibility inputs — optional raw fields. Guardrails only activate for
// firms that carry them (see validateFirmData); legacy/DB tenants without any
// ICP fields are entirely unaffected. Derived fit values live on Company.
// ---------------------------------------------------------------------------
export type PortfolioStatus = "Active" | "Exited" | "Pre-investment";
export type SectorCategory =
  | "Fintech"
  | "Healthtech"
  | "Martech"
  | "HRtech"
  | "Security"
  | "Other B2B SaaS"
  | "Non-SaaS";
export type IcpFitLabel = "Strong" | "Moderate" | "Weak" | "Unknown";

// ---------------------------------------------------------------------------
// Raw company record — ONLY raw inputs, never derived values.
// scores, lastDiagnostic, and trend are now DERIVED from assessments.
// ---------------------------------------------------------------------------
export interface RawCompany {
  id: string;
  name: string;
  sector: string;
  hq: string;
  employeesDisplay: string;    // "77", "175", or "Unconfirmed" — never a fabricated point figure
  arrDisplay: string;          // human-readable ARR ("$10M–$20M", "Undisclosed")
  // ARR range in dollars used for portfolio rollups.
  // null = undisclosed — excluded from Total ARR and Est. ARR at Risk.
  arrForRollup: [number, number] | null;
  // CQ-45: first-class ARR point value (whole dollars) from the companies.arr
  // column, with provenance. All optional/null = Undisclosed (excluded from
  // rollups, never zero-filled). When set, the engine derives arrAtRiskRange
  // from the tier's published risk-% band instead of the legacy
  // arrForRollup × riskMidpoint path, and arrDisplay carries the mandatory
  // "as of <date>" qualifier (set at the DB mapping layer).
  arr?: number | null;
  arrAsOf?: string | null;
  arrSource?: string | null;
  confidence: "High" | "Medium" | "Low"; // assessment confidence from external signals
  engagement: string;           // per-company engagement recommendation
  invesqSignal: string;         // per-company INVESQ signal
  // When a company has no CS leader at all, leadership copy is framed as
  // "establish" (never anything implying replacement of an incumbent).
  leadershipFraming?: "establish";
  summary: string;              // executive summary paragraph
  // Optional callout shown as an amber flag on portfolio cards (e.g. expansion mismatch).
  calloutNote?: string;
  // Assessment history — must contain at least one entry, sorted ascending by date.
  // The LATEST entry determines current scores, tier, composite, and rollups.
  // Append a new entry to perform a re-run (no UI changes required).
  assessments: Assessment[];
  // Company-level gap-note overrides, keyed by pillar id.
  // Falls back to the pillar's generic gapNote when not present here.
  gapNotes?: Record<string, string>;
  // Dated events annotated as markers on the trend / forecast chart.
  actionsLog?: ActionLogEntry[];
  // ICP eligibility inputs. A firm opts into ICP guardrails by carrying ANY
  // of these on ANY company; all three are then required on every company.
  portfolioStatus?: PortfolioStatus; // only "Active" holdings are eligible
  sectorCategory?: SectorCategory;   // normalized sub-sector bucket
  investmentDate?: string;           // ISO date the firm invested
}

// Rich descriptive fields stored in the companies.meta jsonb column —
// everything on RawCompany except the identity fields and the assessment
// history (which live in their own columns/tables).
export type CompanyMeta = Omit<RawCompany, "id" | "name" | "assessments">;

// ---------------------------------------------------------------------------
// Derived company record — all computed from RawCompany + PILLARS + TIERS
// ---------------------------------------------------------------------------
export interface GapItem {
  pillar: Pillar;
  score: PillarScore;
  weakness: number;
  note: string;
}

export interface Company extends RawCompany {
  // Derived from the latest assessment:
  scores: Record<string, PillarScore>; // convenience alias for latest assessment pillarScores
  lastDiagnostic: string;              // date of the latest assessment
  assessmentPoints: AssessmentPoint[]; // one point per assessment, normalized to 0–16

  // Derived from latest scores:
  composite: number;         // Phase 1 unweighted — scored pillars only (NA excluded)
  displayMax: number;        // max for the displayed composite (scoredCount × 2)
  // Composite as display text — "—" when ZERO pillars are scored (all NA).
  // A company with no external signal must never display "0", which would
  // imply a scored failure rather than an absence of data.
  compositeDisplay: string;
  tierComposite: number;     // composite with NA substituted as 1 — for TIER ASSIGNMENT ONLY
  weightedComposite: number; // Phase 2 weighted — scored pillars only
  weightedMax: number;       // weighted max given scored pillars
  insufficientCount: number; // pillars marked Insufficient Data (NA)
  tier: Tier;
  gaps: GapItem[];           // ranked biggest weighted gap first (excludes NA pillars)
  topGap: GapItem | null;
  // ARR range × tier risk midpoint. null when ARR is undisclosed.
  arrAtRiskRange: [number, number] | null;
  arrAtRiskDisplay: string;  // formatted range, or "N/A" when ARR is undisclosed

  // ICP eligibility — derived via computeIcpFit; never stored.
  eligible: boolean;            // portfolioStatus === "Active" (true when status is absent)
  fitScore: number;             // 0-4: sector points + recency points
  fitLabel: IcpFitLabel;        // Strong (4) / Moderate (2-3) / Weak (0-1) / Unknown (missing inputs)
  eligibilityReasons: string[]; // human-readable inputs behind the label (chip tooltip)
}

// ---------------------------------------------------------------------------
// Portfolio-level rollup (per firm)
// ---------------------------------------------------------------------------
export interface TierCount {
  tier: Tier;
  count: number;
}

export interface PortfolioSummary {
  companyCount: number;
  totalArrDisplay: string;
  arrAtRiskDisplay: string;
  arrDisclosedCount: number;
  arrUndisclosedCount: number;
  arrUndisclosedNames: string[];
  avgComposite: number;      // normalized to PILLAR_MAX scale
  tierCounts: TierCount[];
  // Firm-level suggested ICP fit across eligible companies. "Unknown" when
  // any company lacks ICP inputs; the UI hides the badge in that case.
  suggestedIcpFit: IcpFitLabel;
}

// Portfolio-level trend — average normalized composite across companies,
// aggregated by assessment period (month granularity).
export interface PortfolioTrendPoint {
  period: string;          // e.g. "Jun '26"
  sortKey: string;         // ISO date for sort ordering (earliest date in period)
  avgNormalized: number;   // average normalized composite (0–16 scale)
  companyCount: number;    // how many companies contributed to this period
}

// ---------------------------------------------------------------------------
// Bootstrap payload — served by GET /api/portfolio/bootstrap.
// RAW data only; clients derive Company/PortfolioSummary via the engine.
// ---------------------------------------------------------------------------
export interface PortfolioBootstrapFirm {
  slug: string;
  displayName: string;
  statusLabel: string;
  internalOnly: boolean;
  requireLogin?: boolean;
  companies: RawCompany[];
}

export interface PortfolioBootstrap {
  asOfDate: string;
  firms: PortfolioBootstrapFirm[];
}
