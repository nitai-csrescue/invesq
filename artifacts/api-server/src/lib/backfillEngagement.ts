// ---------------------------------------------------------------------------
// Startup backfill: refresh RETIRED tier-boilerplate engagement strings in
// companies.meta.engagement to their current TIERS equivalents (CQ-23
// 4-pillar copy cutover).
//
// Why: meta.engagement is baked in at pipeline-build time (jobs/build.ts).
// The 4-pillar copy cutover fixed the TIERS strings in pillars.ts, but
// companies built before it carry the retired 8-pillar-era wording (known
// stale: the 3 Long Arc companies CircleBlack, Concertiv, Tinubu). This
// sweeps ALL companies so any other stale row is caught too.
//
// CRITICAL scope guard: many companies carry bespoke, hand-written
// engagement copy (Raviga demo narratives, curated STG/Pamlico strings) that
// deliberately does NOT match the tier boilerplate. Those must never be
// touched. So this is an EXACT-MATCH rewrite of known retired strings only:
// a row is updated iff its engagement string is one of the retired TIERS
// strings below. It is NOT a recompute-and-overwrite. Only the `engagement`
// key is written; scores, tiers, composites, and all other meta keys are
// untouched.
//
// Idempotent (rewritten rows no longer match any retired string) and
// non-fatal (row-by-row try/catch), mirroring backfillIcpMeta. On any update
// the portfolio bootstrap cache is invalidated so the fix is visible without
// a second restart.
// ---------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { logger } from "./logger.js";
import { invalidatePortfolioCache } from "./portfolioData.js";

// Retired pre-CQ-23 TIERS engagement strings -> current pillars.ts strings.
// Covers both em-dash and colon separator variants that shipped over time.
const RETIRED_ENGAGEMENT_MAP: Record<string, string> = {
  // Tier 1 (8-pillar wording), colon and em-dash separator variants
  "Full-scale rebuild: all 8 pillars require intervention. 90\u2013180 day engagement.":
    "Full-scale rebuild: all 4 pillars require intervention. 90\u2013180 day engagement.",
  "Full-scale rebuild \u2014 all 8 pillars require intervention. 90\u2013180 day engagement.":
    "Full-scale rebuild: all 4 pillars require intervention. 90\u2013180 day engagement.",
  // Tier 2 ("2\u20134 pillar" wording), colon, em-dash, and hyphen variants
  "Targeted remediation: 2\u20134 pillar interventions. 60\u201390 day engagement.":
    "Targeted remediation: 1\u20132 pillar interventions. 60\u201390 day engagement.",
  "Targeted remediation \u2014 2\u20134 pillar interventions. 60\u201390 day engagement.":
    "Targeted remediation: 1\u20132 pillar interventions. 60\u201390 day engagement.",
  "Targeted remediation: 2-4 pillar interventions. 60-90 day engagement.":
    "Targeted remediation: 1\u20132 pillar interventions. 60\u201390 day engagement.",
};

export async function backfillEngagement(): Promise<void> {
  try {
    const companies = await db
      .select({ id: companiesTable.id, name: companiesTable.name, meta: companiesTable.meta })
      .from(companiesTable);

    let updated = 0;
    let failed = 0;
    const touched: Array<{ id: number; name: string }> = [];

    for (const company of companies) {
      const meta = company.meta as Record<string, unknown> | null;
      if (!meta || typeof meta.engagement !== "string") continue;

      const replacement = RETIRED_ENGAGEMENT_MAP[meta.engagement];
      if (!replacement) continue; // current copy or bespoke copy — never touch

      try {
        await db
          .update(companiesTable)
          .set({ meta: { ...meta, engagement: replacement } })
          .where(eq(companiesTable.id, company.id));
        updated += 1;
        touched.push({ id: company.id, name: company.name });
        logger.info(
          { companyId: company.id, name: company.name, from: meta.engagement, to: replacement },
          "Engagement backfill: replaced retired tier copy",
        );
      } catch (err) {
        failed += 1;
        logger.warn(
          { err, companyId: company.id, name: company.name },
          "Engagement backfill skipped a row (failed); left as-is",
        );
      }
    }

    if (updated > 0) invalidatePortfolioCache();
    if (updated > 0 || failed > 0) {
      logger.info(
        { total: companies.length, updated, failed, touched },
        "Engagement backfill complete",
      );
    }
  } catch (err) {
    logger.error({ err }, "Engagement backfill failed (non-fatal)");
  }
}
