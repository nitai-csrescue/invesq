// ---------------------------------------------------------------------------
// Portfolio data module — public API
// Import from "@/data/portfolio" throughout the portfolio pages.
// ---------------------------------------------------------------------------

// Types
export type { PillarScore, Pillar, Tier, Firm, RawCompany, GapItem, Company, PortfolioSummary, TierCount } from "./types";

// Pillar / tier definitions + helpers
export { PILLARS, PILLAR_MAX, WEIGHTED_MAX, TIERS, SCORE_LEVELS, scoreLevel, getTier } from "./pillars";

// Firms registry
export { FIRMS, FIRMS_BY_SLUG, getFirm, AS_OF_DATE } from "./firms";

// Engine — query API (pre-computed, validated at startup)
export {
  getFirmCompanies,
  getFirmCompany,
  getFirmSummary,
  gapTitle,
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyRange,
  formatDate,
} from "./engine";
