// ---------------------------------------------------------------------------
// Deprecated shim — this file is superseded by src/data/portfolio/index.ts
// All portfolio pages now import from "@/data/portfolio" directly.
// This re-export exists only for any legacy or unexpected consumers.
// ---------------------------------------------------------------------------
export * from "./portfolio/index";

// Legacy singleton exports (STG-scoped) — kept for any imports that haven't
// been migrated to the firm-aware API.
import { getFirmCompanies, getFirmSummary } from "./portfolio/engine";

export const FIRM_NAME = "STG";
export const COMPANIES = getFirmCompanies("stg");
export const portfolioSummary = getFirmSummary("stg")!;
export { getFirmCompany as getCompany } from "./portfolio/engine";
