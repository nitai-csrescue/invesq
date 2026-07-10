// ---------------------------------------------------------------------------
// Portfolio data module — public API
// Import from "@/data/portfolio" throughout the portfolio pages.
// ---------------------------------------------------------------------------

// Types
export type {
  PillarScore,
  Assessment,
  AssessmentPoint,
  PortfolioTrendPoint,
  Pillar,
  Tier,
  Firm,
  RawCompany,
  GapItem,
  Company,
  PortfolioSummary,
  TierCount,
  ActionLogEntry,
} from "./types";

// Pillar / tier definitions + helpers
export {
  PILLARS,
  PILLAR_MAX,
  WEIGHTED_MAX,
  TIERS,
  SCORE_LEVELS,
  scoreLevel,
  getTier,
} from "./pillars";

// Firms registry
export {
  FIRMS,
  FIRMS_BY_SLUG,
  getFirm,
  getAllFirms,
  registerDynamicFirms,
  AS_OF_DATE,
} from "./firms";

// Engine — query API (pre-computed, validated at startup)
export {
  getFirmCompanies,
  getFirmCompany,
  getFirmSummary,
  getPortfolioTrendPoints,
  gapTitle,
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyRange,
  formatDate,
  // Forecast — additive; safe to import in page components
  computeCompanyForecast,
  computePortfolioForecast,
  FORECAST_ACTIONS,
  type ForecastPoint,
  type ForecastActionId,
  // ARR Forecast (Raviga sandbox A/B feature)
  ARR_UPLIFT_BENCHMARKS,
  computeCompanyArrForecast,
  computePortfolioArrForecast,
  type ArrTooltipData,
  type ArrForecastPoint,
} from "./engine";

// Raviga-tenant-only simulated live-data layer (Phase 2 connected-data demo).
// Never import these from non-Raviga call sites.
export {
  CONNECTOR_DEFS,
  SIMULATED_CONNECTION_LABEL,
  getConnectorLiveStatus,
  getFirmConnectorSummary,
  getArrConfidenceBandPct,
  getRetentionMetrics,
  getLiveSignalsForCompany,
  getLiveSignalsForCompanies,
  GOVERNANCE_MATRIX,
  SEMANTIC_LAYER,
  type ConnectorId,
  type ConnectorLiveStatus,
  type ConnectorFirmSummary,
  type RetentionMetrics,
  type LiveSignal,
  type LiveSignalSeverity,
  type GovernanceRow,
  type SemanticLayerEntity,
} from "./ravigaLiveData";
