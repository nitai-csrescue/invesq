// ---------------------------------------------------------------------------
// Portfolio data layer — shared TypeScript types
// ---------------------------------------------------------------------------

// 0 = Infrastructure Gap · 1 = Partial/Developing · 2 = Optimized · null = Insufficient Data (NA)
export type PillarScore = 0 | 1 | 2 | null;

export interface Pillar {
  id: string;
  name: string;
  weight: number;    // multiplier used in the Phase 2 weighted composite
  measures: string;  // what it measures
  signals: string;   // primary external signal sources
  peValue: string;   // PE value link
  gapNote: string;   // shown when this pillar is a company's top gap (generic fallback)
}

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
}

export interface Firm {
  slug: string;
  displayName: string;
  statusLabel: string;   // e.g. "Design-partner preview" or "Internal preview — not cleared for external distribution"
  internalOnly: boolean; // when true, the rose "internal" pill is shown on the dashboard
}

// ---------------------------------------------------------------------------
// Raw company record — ONLY raw inputs, never derived values.
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
  // Ranges are summed as ranges; a point figure is never fabricated.
  arrForRollup: [number, number] | null;
  confidence: "High" | "Medium"; // assessment confidence from external signals
  engagement: string;           // per-company engagement recommendation
  invesqSignal: string;         // per-company INVESQ signal
  // When a company has no CS leader at all, leadership copy is framed as
  // "establish" (never anything implying replacement of an incumbent).
  leadershipFraming?: "establish";
  lastDiagnostic: string;       // ISO date string, e.g. "2026-06-04"
  summary: string;              // executive summary paragraph
  scores: Record<string, PillarScore>; // keyed by pillar id
  // Company-specific gap findings, keyed by pillar id.
  // Falls back to the pillar's generic gapNote when not present here.
  gapNotes?: Record<string, string>;
  trend: number[];              // illustrative composite history (Phase 1 scale)
}

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
  composite: number;         // Phase 1 unweighted — scored pillars only (NA excluded)
  displayMax: number;        // max for the displayed composite (scoredCount × 2)
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
}
