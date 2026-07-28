// ---------------------------------------------------------------------------
// @workspace/portfolio-engine — public API
// Pure derivation engine for the INVESQ portfolio portals. Raw data comes
// from the DB (via the api-server bootstrap endpoint); this lib derives
// Company / PortfolioSummary / trend / forecast values from it.
// ---------------------------------------------------------------------------

export type {
  PillarScore,
  Assessment,
  AssessmentPoint,
  PortfolioTrendPoint,
  Pillar,
  Tier,
  Firm,
  FirmMeta,
  RawCompany,
  CompanyMeta,
  GapItem,
  Company,
  PortfolioSummary,
  TierCount,
  ActionLogEntry,
  PortfolioBootstrap,
  PortfolioBootstrapFirm,
  PortfolioStatus,
  SectorCategory,
  IcpFitLabel,
} from "./types";

export {
  PILLARS,
  PILLAR_MAX,
  WEIGHTED_MAX,
  TIERS,
  SCORE_LEVELS,
  scoreLevel,
  getTier,
} from "./pillars";

export { PILLAR_IDS, scoreToText, textToScore, normalizeCompanyName } from "./mapping";

export {
  RUBRIC_INSUFFICIENT,
  RUBRIC_BAND_ORDER,
  RUBRIC_PILLARS,
  singleToRubric,
  combineToRubric,
  rubricValueToPoints,
  computePortcoComposite,
  portcoBandFromComposite,
  computePortcoScore,
  computeRubricV2,
  type RubricBand,
  type RubricValue,
  type RubricV2Scores,
  type RubricPillarDef,
} from "./rubricV2";

export {
  RUBRIC_VERSION,
  RUBRIC_VERSION_LEGACY,
  NOTION_RUBRIC_LABEL_V1,
  NOTION_RUBRIC_LABEL_V2,
  notionRubricVersionLabel,
} from "./rubricVersion";

export {
  AS_OF_DATE,
  buildCompany,
  computeIcpFit,
  monthsSince,
  ICP_PRIORITY_SECTORS,
  type IcpFit,
  computeSummary,
  validateFirmData,
  buildFirmPortfolio,
  computePortfolioTrendPoints,
  gapTitle,
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyRange,
  formatDate,
  computeCompanyForecast,
  computePortfolioForecastFromTrend,
  FORECAST_ACTIONS,
  type ForecastPoint,
  type ForecastActionId,
  ARR_UPLIFT_BENCHMARKS,
  computeCompanyArrForecast,
  computePortfolioArrForecastFromCompanies,
  type ArrTooltipData,
  type ArrForecastPoint,
} from "./engine";
