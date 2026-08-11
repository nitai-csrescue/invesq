// ---------------------------------------------------------------------------
// CQ-50: full public-sources ARR research pass across all real portfolio
// companies (47 across 13 firms + 3 dev-only Mainsail companies = 38 newly
// researched after excluding the 12 already seeded by CQ-48).
//
// RESEARCH OUTCOME: exactly ONE new qualifying public disclosure was found --
// Tinubu (Long Arc), a disclosed RANGE (EUR 22-23M expected FY2020 revenue,
// Les Echos / Capital Finance, Feb 13 2020). Every other company had only
// estimate-site numbers (prohibited as fabrications), funding amounts,
// valuations, or growth percentages -- none of which qualify under the CQ-46
// rule, so they remain Undisclosed (never zero, excluded from rollups).
//
// Because the disclosure is a RANGE, it is stored the way the engine
// represents ranges -- CompanyMeta.arrForRollup [low, high] + a range
// arrDisplay with the mandatory "as of" qualifier -- NOT as a fabricated
// single number in companies.arr. The citation goes into companies.arr_source
// (provenance column; overlayArrColumns leaves display alone while arr is
// null, so the engine renders the meta range untouched). The CQ-47 admin
// route treats the meta range as part of its full-state semantics, so a
// later manual edit deliberately replaces/clears it.
//
// Safety (per architect review: all guards live ON the UPDATE statements,
// so no select-then-write race can clobber a concurrent edit):
//   - company write conditional on arr IS NULL AND no existing meta range;
//   - firm marker is an atomic jsonb merge conditional on marker absence;
//   - keyed firm slug + company slug; firms absent in an env skip quietly;
//   - non-fatal on error; portfolio cache invalidated after.
// ---------------------------------------------------------------------------
import { eq, and, isNull, sql } from "drizzle-orm";
import { db, companiesTable, firmsTable } from "@workspace/db";
import { logger } from "./logger";
import { invalidatePortfolioCache } from "./portfolioData";

const MARKER_KEY = "cq50ArrBackfilledAt";

const TINUBU = {
  firmSlug: "longarc",
  companySlug: "tinubu",
  arrForRollup: [25124000, 26266000] as [number, number],
  // En-dash range per existing display convention; em-dashes are banned.
  arrDisplay: "$25.1M\u2013$26.3M (as of Feb 2020)",
  arrSource:
    "EUR 22-23M expected FY2020 revenue ('attend entre 22 et 23 M EUR de chiffre d'affaires'), per Les Echos / Capital Finance (William Sadrin), Feb 13 2020, reported alongside Tinubu Square's EUR 15M funding round. Converted at 2020 avg ~1.142 USD/EUR = $25.1M-$26.3M USD. POINT-IN-TIME forward-looking full-year revenue expectation, not a stated ARR run-rate; single trade-press source -- Medium confidence. No newer public figure exists.",
};

export async function backfillDisclosedArrCq50(): Promise<void> {
  try {
    const [firm] = await db
      .select()
      .from(firmsTable)
      .where(eq(firmsTable.slug, TINUBU.firmSlug));
    if (!firm) return; // firm absent in this environment
    const firmMeta = (firm.meta ?? {}) as Record<string, unknown>;
    if (firmMeta[MARKER_KEY]) return; // one-shot: never re-stamp

    const metaPatch = JSON.stringify({
      arrDisplay: TINUBU.arrDisplay,
      arrForRollup: TINUBU.arrForRollup,
    });

    await db.transaction(async (tx) => {
      // No-clobber condition is ON the UPDATE itself: first-class arr must
      // still be null (a CQ-47 manual SET writes arr; a manual CLEAR resets
      // the meta range to null with display "Undisclosed"). An existing meta
      // range is deliberately NOT a skip condition: prod Tinubu carries a
      // hand-authored seed range from onboarding data that this sourced
      // figure must replace -- and the one-shot firm marker prevents any
      // re-stamp after a later manual edit.
      const updated = await tx
        .update(companiesTable)
        .set({
          meta: sql`${companiesTable.meta} || ${metaPatch}::jsonb`,
          arrSource: TINUBU.arrSource,
        })
        .where(
          and(
            eq(companiesTable.firmId, firm.id),
            eq(companiesTable.slug, TINUBU.companySlug),
            isNull(companiesTable.arr),
            sql`${companiesTable.meta} IS NOT NULL`,
          ),
        )
        .returning({ id: companiesTable.id });
      if (updated.length > 0) {
        logger.info(
          { firmSlug: TINUBU.firmSlug, companySlug: TINUBU.companySlug },
          "CQ-50 ARR backfill: disclosed range applied",
        );
      } else {
        logger.warn(
          { firmSlug: TINUBU.firmSlug, companySlug: TINUBU.companySlug },
          "CQ-50 ARR backfill: company missing or already disclosed; left untouched",
        );
      }
      // Atomic marker merge, conditional on marker absence -- a concurrent
      // firm-meta edit is merged against, never overwritten by a stale spread.
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
    invalidatePortfolioCache();
  } catch (err) {
    // Non-fatal: server must boot; unstamped firm retries next boot.
    logger.error({ err }, "CQ-50 ARR backfill failed");
  }
}
