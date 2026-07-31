// CQ-15: runs the supplemental enrichment adapters for one freshly scored
// company and persists the results. Best-effort by design: an adapter error
// is logged and skipped — enrichment must never fail or delay a build job,
// and the legacy scrape output is already fully persisted by the time this
// runs.
import { eq } from "drizzle-orm";
import { db, companiesTable, signalsTable, type Company } from "@workspace/db";
import { RUBRIC_VERSION } from "@workspace/portfolio-engine";
import { logger } from "../logger.js";
import {
  ENRICHMENT_ADAPTERS,
  isHeadcountDivergent,
  parseLegacyHeadcount,
  type EnrichmentAdapter,
  type EnrichmentResult,
} from "./index.js";

// Non-pillar bucket for enrichment provenance rows. signals.pillar_id is
// free text (deliberately not a pg enum); portal readers group by the eight
// PILLARS ids and simply don't render this bucket.
const ENRICHMENT_PILLAR_ID = "company_profile";

interface EnrichmentContext {
  company: Company;
  assessmentId: number;
  /** The legacy scrape's employeesDisplay from this run's researched profile. */
  legacyEmployeesDisplay: string | null;
}

export async function runSupplementalEnrichment(ctx: EnrichmentContext): Promise<void> {
  const configured = ENRICHMENT_ADAPTERS.filter((a) => a.isConfigured());
  if (configured.length === 0) {
    logger.info(
      { companyId: ctx.company.id },
      "Supplemental enrichment skipped: no adapter configured (PDL_API_KEY unset, Revelio placeholder)",
    );
    return;
  }

  const results: { adapter: EnrichmentAdapter; result: EnrichmentResult }[] = [];
  for (const adapter of configured) {
    try {
      const result = await adapter.fetch({ name: ctx.company.name, website: ctx.company.website });
      if (result) results.push({ adapter, result });
    } catch (err) {
      logger.warn(
        { companyId: ctx.company.id, adapter: adapter.name, err },
        "Supplemental enrichment adapter failed; continuing without it (legacy scrape data unaffected)",
      );
    }
  }
  if (results.length === 0) return;

  const signalRows: (typeof signalsTable.$inferInsert)[] = [];
  const stamp = {
    assessmentId: ctx.assessmentId,
    companyId: ctx.company.id,
    pillarId: ENRICHMENT_PILLAR_ID,
    rubricVersion: RUBRIC_VERSION,
    dateObserved: new Date().toISOString().slice(0, 10),
    url: null as string | null,
  };

  // Supplemental-only fields: first (highest-confidence) adapter that
  // produced data wins the companies column; EVERY adapter that produced
  // data gets a provenance signal row, so a conflict between third-party
  // sources is visible rather than silently resolved.
  const companyUpdate: Partial<typeof companiesTable.$inferInsert> = {};
  for (const { adapter, result } of results) {
    if (result.fundingHistory) {
      if (companyUpdate.fundingHistory === undefined) companyUpdate.fundingHistory = result.fundingHistory;
      signalRows.push({
        ...stamp,
        source: "other",
        sourceSystem: adapter.name,
        field: "funding_history",
        value: JSON.stringify({
          totalRaisedUsd: result.fundingHistory.totalRaisedUsd,
          roundCount: result.fundingHistory.roundCount,
          latestStage: result.fundingHistory.latestStage,
        }),
        direction: "neutral",
        confidence: adapter.signalConfidence,
        note: `Funding history supplied by supplemental source ${adapter.name}. Not produced by the legacy scrape.`,
        divergenceFlag: false,
      });
    }
    if (result.countryHeadcount) {
      if (companyUpdate.countryHeadcount === undefined) companyUpdate.countryHeadcount = result.countryHeadcount;
      signalRows.push({
        ...stamp,
        source: "other",
        sourceSystem: adapter.name,
        field: "country_headcount",
        value: JSON.stringify(result.countryHeadcount.byCountry),
        direction: "neutral",
        confidence: adapter.signalConfidence,
        note: `Country-level employee split supplied by supplemental source ${adapter.name}. Not produced by the legacy scrape.`,
        divergenceFlag: false,
      });
    }
    // Overlapping field: total headcount. Legacy scrape is authoritative and
    // is never overwritten. A >20% divergence is flagged for human review.
    if (result.totalHeadcount !== null) {
      const legacy = parseLegacyHeadcount(ctx.legacyEmployeesDisplay);
      const divergent = legacy !== null && isHeadcountDivergent(legacy, result.totalHeadcount);
      signalRows.push({
        ...stamp,
        source: "other",
        sourceSystem: adapter.name,
        field: "total_headcount",
        value: String(result.totalHeadcount),
        direction: "neutral",
        confidence: adapter.signalConfidence,
        note: divergent
          ? `Supplemental source ${adapter.name} reports total headcount ${result.totalHeadcount}, diverging more than 20% from the legacy scrape value (${ctx.legacyEmployeesDisplay ?? "unavailable"}). Legacy value remains authoritative; flagged for human review.`
          : `Supplemental source ${adapter.name} reports total headcount ${result.totalHeadcount}, consistent with the legacy scrape value (${ctx.legacyEmployeesDisplay ?? "unavailable"}). Legacy value remains authoritative.`,
        divergenceFlag: divergent,
      });
    }
  }

  if (Object.keys(companyUpdate).length > 0) {
    await db.update(companiesTable).set(companyUpdate).where(eq(companiesTable.id, ctx.company.id));
  }
  if (signalRows.length > 0) {
    await db.insert(signalsTable).values(signalRows);
  }
  logger.info(
    {
      companyId: ctx.company.id,
      adapters: results.map((r) => r.adapter.name),
      signalCount: signalRows.length,
      divergenceFlags: signalRows.filter((r) => r.divergenceFlag).length,
    },
    "Supplemental enrichment persisted",
  );
}
