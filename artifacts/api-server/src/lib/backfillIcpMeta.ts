// ---------------------------------------------------------------------------
// Startup backfill for ICP eligibility meta on the 8 legacy STG/Pamlico
// companies (Task: stored firm ICP badge + prod DB backfill).
//
// The ICP guardrail fields (portfolioStatus / sectorCategory / investmentDate)
// were added to companies.meta in dev via a one-off script, but production
// rows predate that and carry none of them, so the per-company eligibility
// chips never render live. This idempotent routine merges the exact values
// from the canonical source data (lib/portfolio-engine/src/data/{stg,pamlico}.ts)
// into companies.meta on boot.
//
// Deliberately additive and non-fatal, mirroring backfillNormalizedNames:
//  - Keyed on companies.slug; only the 8 known legacy slugs are touched.
//  - Skips any row whose meta already has portfolioStatus, so it no-ops in
//    dev (already backfilled) and on every prod boot after the first run.
//  - Merges into the existing meta object; never replaces or drops keys.
//  - Row-by-row with per-row try/catch; a failure is logged and skipped,
//    never crashing the server on boot.
// ---------------------------------------------------------------------------
import { eq, inArray } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { logger } from "./logger.js";

interface IcpMetaValues {
  portfolioStatus: string;
  sectorCategory: string;
  investmentDate: string;
}

// Exact copies of the ICP fields in the canonical TS source data.
const ICP_META_BY_SLUG: Record<string, IcpMetaValues> = {
  // STG (lib/portfolio-engine/src/data/stg.ts)
  "nomis-solutions": { portfolioStatus: "Active", sectorCategory: "Fintech", investmentDate: "2024-01-01" },
  cadmium: { portfolioStatus: "Active", sectorCategory: "Other B2B SaaS", investmentDate: "2024-01-01" },
  confience: { portfolioStatus: "Active", sectorCategory: "Other B2B SaaS", investmentDate: "2024-06-01" },
  mediavalet: { portfolioStatus: "Active", sectorCategory: "Other B2B SaaS", investmentDate: "2023-01-01" },
  taxcalc: { portfolioStatus: "Active", sectorCategory: "Fintech", investmentDate: "2023-06-01" },
  // Pamlico (lib/portfolio-engine/src/data/pamlico.ts)
  profisee: { portfolioStatus: "Active", sectorCategory: "Other B2B SaaS", investmentDate: "2022-01-01" },
  "ehs-insight": { portfolioStatus: "Active", sectorCategory: "Other B2B SaaS", investmentDate: "2025-12-01" },
  ceati: { portfolioStatus: "Active", sectorCategory: "Non-SaaS", investmentDate: "2025-12-01" },
};

export async function backfillIcpMeta(): Promise<void> {
  try {
    const slugs = Object.keys(ICP_META_BY_SLUG);
    const rows = await db
      .select({ id: companiesTable.id, slug: companiesTable.slug, meta: companiesTable.meta })
      .from(companiesTable)
      .where(inArray(companiesTable.slug, slugs));

    let updated = 0;
    let skippedAlreadySet = 0;
    let failed = 0;

    for (const row of rows) {
      const slug = row.slug;
      if (!slug) continue;
      const icp = ICP_META_BY_SLUG[slug];
      if (!icp) continue;

      const existingMeta = (row.meta ?? {}) as Record<string, unknown>;
      if (existingMeta.portfolioStatus) {
        skippedAlreadySet += 1;
        continue;
      }

      try {
        await db
          .update(companiesTable)
          .set({ meta: { ...existingMeta, ...icp } })
          .where(eq(companiesTable.id, row.id));
        updated += 1;
      } catch (err) {
        failed += 1;
        logger.warn(
          { err, companyId: row.id, slug },
          "ICP meta backfill skipped a row (update failed); left as-is for human follow-up",
        );
      }
    }

    if (updated > 0 || failed > 0) {
      logger.info(
        { matched: rows.length, updated, skippedAlreadySet, failed },
        "ICP meta backfill complete",
      );
    }
  } catch (err) {
    logger.error({ err }, "ICP meta backfill failed (non-fatal)");
  }
}
