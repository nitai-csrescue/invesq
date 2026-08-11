// ---------------------------------------------------------------------------
// CQ (Notion 3b91114c714a8143a5a6fe0a9ed3fc04): one-shot boot backfill of
// ANALYTICAL ARR ESTIMATES for exactly 27 named companies (signed off by
// Nitai). These are MODELED RANGES, not disclosed facts, and are strictly
// admin-dashboard-only:
//
//   - Written ONLY to three NEW meta keys no tenant-facing component reads:
//       meta.arrEstimateDisplay  (human string, e.g. "$95M-$145M (Estimate)")
//       meta.arrEstimateRange    ([low, high] whole US dollars)
//       meta.arrIsEstimate       (true)
//   - NEVER touches companies.arr / arr_as_of / arr_source, and NEVER touches
//     meta.arrDisplay / meta.arrForRollup — tenant surfaces keep showing
//     exactly what they show today ("Undisclosed") and the CQ-45 ARR-at-risk
//     rollup (which reads only arr / arrForRollup) is unaffected by design.
//   - Keyed by firm slug + company slug; only written when the company does
//     not already carry an arrEstimateDisplay key (a manual future edit is
//     never overwritten).
//   - Per-firm durable completion marker (firms.meta.arrEstimateBackfilledAt)
//     makes the routine one-shot: re-onboarded firms that regain old slugs
//     are NOT re-stamped (see slug-keyed-backfill collision policy).
//   - The 7 non-recurring-revenue companies (Havis, Heatscape, Illuminati
//     Labs, Raptor Power Systems, Team LINX, TriMech, Prenax) are absent from
//     the seed list and stay completely untouched.
//
// Safe to delete after both dev and prod have booted once with it (markers
// prevent any further effect either way).
// ---------------------------------------------------------------------------
import { eq, and, sql } from "drizzle-orm";
import { db, companiesTable, firmsTable } from "@workspace/db";
import { logger } from "./logger";
import { invalidatePortfolioCache } from "./portfolioData";

interface EstimateSeed {
  firmSlug: string;
  companySlug: string;
  display: string;
  range: [number, number];
}

const ESTIMATE_SEEDS: readonly EstimateSeed[] = [
  { firmSlug: "inflexion", companySlug: "axiom-grc", display: "$100M-$140M (Estimate)", range: [100000000, 140000000] },
  { firmSlug: "inflexion", companySlug: "curinos", display: "$95M-$145M (Estimate)", range: [95000000, 145000000] },
  { firmSlug: "longarc", companySlug: "circleblack", display: "$4M-$7M (Estimate)", range: [4000000, 7000000] },
  { firmSlug: "longarc", companySlug: "concertiv", display: "$8M-$12M (Estimate)", range: [8000000, 12000000] },
  { firmSlug: "m33-growth", companySlug: "apogee-interactive-brillion", display: "$10M-$16M (Estimate)", range: [10000000, 16000000] },
  { firmSlug: "m33-growth", companySlug: "besmartee", display: "$7M-$10M (Estimate)", range: [7000000, 10000000] },
  { firmSlug: "m33-growth", companySlug: "godocs", display: "$5M-$8M (Estimate)", range: [5000000, 8000000] },
  { firmSlug: "m33-growth", companySlug: "swiftcomply", display: "$4M-$8M (Estimate)", range: [4000000, 8000000] },
  { firmSlug: "pamlico", companySlug: "ceati-international", display: "$8M-$18M (Estimate)", range: [8000000, 18000000] },
  { firmSlug: "pamlico", companySlug: "ehs-insight", display: "$9M-$14M (Estimate)", range: [9000000, 14000000] },
  { firmSlug: "pamlico", companySlug: "profisee", display: "$25M-$40M (Estimate)", range: [25000000, 40000000] },
  { firmSlug: "sixth-street-growth", companySlug: "awardco", display: "$65M-$90M (Estimate)", range: [65000000, 90000000] },
  { firmSlug: "sixth-street-growth", companySlug: "drfirst", display: "$80M-$110M (Estimate)", range: [80000000, 110000000] },
  { firmSlug: "solen", companySlug: "cairn-applications", display: "$1.5M-$3M (Estimate)", range: [1500000, 3000000] },
  { firmSlug: "solen", companySlug: "champ-software", display: "$3M-$5M (Estimate)", range: [3000000, 5000000] },
  { firmSlug: "solen", companySlug: "primate-technologies", display: "$2M-$3.5M (Estimate)", range: [2000000, 3500000] },
  { firmSlug: "solen", companySlug: "smrtr", display: "$2M-$4M (Estimate)", range: [2000000, 4000000] },
  { firmSlug: "solen", companySlug: "track-star", display: "$0.5M-$2M (Estimate)", range: [500000, 2000000] },
  { firmSlug: "solen", companySlug: "viapeople", display: "$4M-$6M (Estimate)", range: [4000000, 6000000] },
  { firmSlug: "stg", companySlug: "cadmium", display: "$28M-$42M (Estimate)", range: [28000000, 42000000] },
  { firmSlug: "stg", companySlug: "confience", display: "$21M-$32M (Estimate)", range: [21000000, 32000000] },
  { firmSlug: "stg", companySlug: "nomis-solutions", display: "$14M-$22M (Estimate)", range: [14000000, 22000000] },
  { firmSlug: "ta-associates", companySlug: "certinia", display: "$200M-$260M (Estimate)", range: [200000000, 260000000] },
  { firmSlug: "tritium-partners", companySlug: "inbenta", display: "$45M-$60M (Estimate)", range: [45000000, 60000000] },
  { firmSlug: "tritium-partners", companySlug: "loxo", display: "$95M-$125M (Estimate)", range: [95000000, 125000000] },
  { firmSlug: "tritium-partners", companySlug: "public-relay", display: "$18M-$27M (Estimate)", range: [18000000, 27000000] },
  { firmSlug: "tritium-partners", companySlug: "vanillasoft", display: "$13M-$20M (Estimate)", range: [13000000, 20000000] },
];

const MARKER_KEY = "arrEstimateBackfilledAt";

export async function backfillArrEstimates(): Promise<void> {
  try {
    // Seed-shape sanity guard: ranges must be positive, non-inverted, whole
    // dollars, and every display string must carry the "(Estimate)" label.
    for (const s of ESTIMATE_SEEDS) {
      const [lo, hi] = s.range;
      if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || lo <= 0 || lo > hi || !s.display.endsWith("(Estimate)")) {
        throw new Error(`ARR-estimate seed invalid for ${s.firmSlug}/${s.companySlug}`);
      }
    }

    const firmSlugs = [...new Set(ESTIMATE_SEEDS.map((s) => s.firmSlug))];
    for (const firmSlug of firmSlugs) {
      const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.slug, firmSlug));
      // Firm absent in this environment (e.g. dev lacks several firms): skip quietly.
      if (!firm) continue;
      const meta = (firm.meta ?? {}) as Record<string, unknown>;
      if (meta[MARKER_KEY]) continue; // one-shot: never re-stamp

      const seeds = ESTIMATE_SEEDS.filter((s) => s.firmSlug === firmSlug);
      let wrote = 0;
      await db.transaction(async (tx) => {
        for (const seed of seeds) {
          // jsonb || merge adds ONLY the three estimate keys; every other meta
          // key (arrDisplay, arrForRollup, engagement, ...) is preserved, and
          // the arr/arr_as_of/arr_source columns are not in the SET list at all.
          const result = await tx
            .update(companiesTable)
            .set({
              meta: sql`${companiesTable.meta} || jsonb_build_object(
                'arrEstimateDisplay', ${seed.display}::text,
                'arrEstimateRange', jsonb_build_array(${seed.range[0]}::bigint, ${seed.range[1]}::bigint),
                'arrIsEstimate', true
              )`,
            })
            .where(
              and(
                eq(companiesTable.firmId, firm.id),
                eq(companiesTable.slug, seed.companySlug),
                sql`${companiesTable.meta} IS NOT NULL`,
                sql`NOT (${companiesTable.meta} ? 'arrEstimateDisplay')`, // never overwrite an existing estimate
              ),
            )
            .returning({ id: companiesTable.id });
          if (result.length > 0) wrote += 1;
          else
            logger.warn(
              { firmSlug, companySlug: seed.companySlug },
              "ARR-estimate backfill: company missing or estimate already set; left untouched",
            );
        }
        // Marker stamped in the same transaction as the writes. Atomic jsonb
        // merge conditional on marker absence — a concurrent firm-meta edit
        // is merged against, never overwritten by a stale spread.
        await tx
          .update(firmsTable)
          .set({
            meta: sql`COALESCE(${firmsTable.meta}, '{}'::jsonb) || jsonb_build_object(${MARKER_KEY}::text, ${new Date().toISOString()}::text)`,
          })
          .where(
            and(
              eq(firmsTable.id, firm.id),
              sql`NOT (COALESCE(${firmsTable.meta}, '{}'::jsonb) ? ${MARKER_KEY})`,
            ),
          );
      });
      logger.info({ firmSlug, companiesUpdated: wrote }, "ARR-estimate backfill applied for firm");
    }
    // The estimate keys are not served by the tenant bootstrap, but the cache
    // snapshots companies.meta wholesale — invalidate so nothing stale lingers.
    invalidatePortfolioCache();
  } catch (err) {
    // Non-fatal: server must still boot; the marker was not stamped for the
    // failing firm, so the next boot retries it.
    logger.error({ err }, "ARR-estimate backfill failed");
  }
}
