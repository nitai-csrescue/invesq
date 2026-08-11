// ---------------------------------------------------------------------------
// CQ-48: one-shot boot backfill of publicly disclosed ARR figures for exactly
// 12 named companies (signed off by Nitai). Pure data operation:
//
//   - Values go through the SAME validation as the CQ-47 admin ARR route
//     (generated zod body schema + real-calendar-date check).
//   - Keyed by firm slug + company slug; a company is only written when its
//     arr column is still NULL, so a manual CQ-47 edit is never overwritten.
//   - Per-firm durable completion marker (firms.meta.cq48ArrBackfilledAt)
//     makes the routine one-shot: re-onboarded firms that regain old slugs
//     are NOT re-stamped (see slug-keyed-backfill collision policy).
//   - Every company not listed stays untouched (null / "Undisclosed").
//   - No scoring, tier, composite, or ARR-at-risk logic is involved.
//   - Em-dashes in source text are scrubbed to "--" (report-facing text
//     policy), matching the CQ-46 pipeline and CQ-47 route behavior.
//
// Safe to delete after both dev and prod have booted once with it (markers
// prevent any further effect either way).
// ---------------------------------------------------------------------------
import { eq, and, isNull, sql } from "drizzle-orm";
import { db, companiesTable, firmsTable } from "@workspace/db";
import { UpdateAdminCompanyArrBody } from "@workspace/api-zod";
import { logger } from "./logger";
import { invalidatePortfolioCache } from "./portfolioData";

interface ArrSeed {
  firmSlug: string;
  companySlug: string;
  arr: number;
  arrAsOf: string;
  arrSource: string;
}

const ARR_SEEDS: readonly ArrSeed[] = [
  {
    firmSlug: "stg",
    companySlug: "mediavalet",
    arr: 13700000,
    arrAsOf: "2023-12-31",
    arrSource:
      "CAD $18.1M ARR (revenue CAD $16.4M, +28% YoY) per MediaValet FY2023 results, Newsfile, Mar 21 2024 (TSX: MVP, public company disclosure). Converted to USD at ~0.756 USD/CAD (Dec 29 2023 spot rate) = ~$13.7M USD. Last public figure before STG take-private.",
  },
  {
    firmSlug: "stg",
    companySlug: "taxcalc",
    arr: 16500000,
    arrAsOf: "2024-11-07",
    arrSource:
      "GBP \u00a313M revenue (last financial year, +17% YoY) per AccountingWeb (Tom Herbert), Nov 7 2024, citing TaxCalc's filed UK accounts, disclosed at time of STG Allegro fund investment. Converted to USD at ~1.27 USD/GBP (Nov 2024 average) = ~$16.5M USD.",
  },
  {
    firmSlug: "stg",
    companySlug: "trellix",
    arr: 2000000000,
    arrAsOf: "2022-01-19",
    arrSource:
      "~$2 billion combined annual revenue, disclosed by STG at the Trellix launch (Jan 19, 2022, following the McAfee Enterprise + FireEye merger). Corroborated by SecurityWeek, Dark Reading, VentureBeat, and ZDNet. Point-in-time figure tied to the merger/launch announcement, not an audited ongoing run-rate.",
  },
  {
    firmSlug: "staley-capital",
    companySlug: "capacity",
    arr: 100000000,
    arrAsOf: "2026-06-18",
    arrSource:
      "$100M+ ARR ('20x ARR growth in 3.5 years, from $5M to $100M'), per Capacity's PR Newswire release, June 18, 2026. Self-reported milestone via legitimate wire service.",
  },
  {
    firmSlug: "staley-capital",
    companySlug: "mntn",
    arr: 284700000,
    arrAsOf: "2025-12-31",
    arrSource:
      "$284.7M FY2025 revenue (adjusted for Q2 2025 Maximum Effort divestiture, +36% YoY; GAAP FY2025 revenue was $290.1M). Per MNTN's SEC Form 8-K / investor relations release, Feb 10 2026 (NYSE: MNTN, publicly filed financials).",
  },
  {
    firmSlug: "inflexion",
    companySlug: "ecoonline",
    arr: 49200000,
    arrAsOf: "2021-12-31",
    arrSource:
      "NOK 434M ARR (+37% YoY) per EcoOnline's Q4/FY2021 report, Feb 28 2022, published while listed on Euronext Growth Oslo. Converted to USD at ~0.1134 USD/NOK (Dec 31 2021 rate, 8.818 NOK/USD) = ~$49.2M USD. NOTE: this figure predates Inflexion's ownership (company was Apax-owned in 2021-22, later Inflexion) -- flagged as stale/historical, no more recent public figure exists since delisting.",
  },
  {
    firmSlug: "inflexion",
    companySlug: "infront",
    arr: 127300000,
    arrAsOf: "2020-12-31",
    arrSource:
      "EUR 104M subscription ARR (full-year revenue EUR 114.5M) per Infront ASA's Q4 2020 interim report, published ~Feb 2021 at the time Inflexion announced its takeover offer (Dec 15, 2020). Converted to USD at ~1.2238 USD/EUR (Dec 31 2020 rate) = ~$127.3M USD. NOTE: figure is from the acquisition period (2020-21), stale relative to today.",
  },
  {
    firmSlug: "inflexion",
    companySlug: "aosphere",
    arr: 25200000,
    arrAsOf: "2022-12-31",
    arrSource:
      "GBP \u00a320.8M turnover (+13% YoY) per aosphere's FY2022 filed UK accounts, reported by Global Legal Post/Law Gazette. Converted to USD at ~1.21 USD/GBP (Dec 2022 average) = ~$25.2M USD. Roughly one year before the Inflexion/Endicott Capital deal (announced Oct 2023).",
  },
  {
    firmSlug: "ta-associates",
    companySlug: "appfire",
    arr: 100000000,
    arrAsOf: "2021-12-01",
    arrSource:
      "$100M+ ARR milestone (+103% YoY since June 2020) per Appfire/Silversmith Capital Partners' BusinessWire release, Dec 2021. NOTE: Reuters (Aug 16 2024, citing unnamed sources) separately reported ~$300M expected 2024 revenue in the context of a TA Associates/Silversmith stake-sale process valuing Appfire over $2B -- not used as the primary figure here since it's a single anonymously-sourced estimate, but flagged for follow-up verification given the likely growth since 2021.",
  },
  {
    firmSlug: "triton-partners",
    companySlug: "cint-group",
    arr: 170000000,
    arrAsOf: "2025-12-31",
    arrSource:
      "EUR 150.4M net sales FY2025 (down 9.5% from EUR 166.2M FY2024) per Cint Group AB's year-end report, Feb 19 2026 (Nasdaq Stockholm: CINT, regulated financial disclosure). Converted to USD at ~1.13 USD/EUR (2025 average rate) = ~$170.0M USD. Note this is net sales/marketplace revenue, not classic subscription ARR, given Cint's exchange/transactional model.",
  },
  {
    firmSlug: "sixth-street-growth",
    companySlug: "gravitee",
    arr: 22000000,
    arrAsOf: "2025-05-20",
    arrSource:
      "$22M ARR ('in its last financial year') per SiliconANGLE (Mike Wheatley), May 20 2025, reported alongside Gravitee's $60M Series C led by Sixth Street Growth. Single trade-press source (not repeated in the official press release or other outlets covering the same round) -- Medium confidence.",
  },
  {
    firmSlug: "sixth-street-growth",
    companySlug: "kiteworks",
    arr: 130000000,
    arrAsOf: "2024-08-14",
    arrSource:
      "$130M ARR ('profitable for five consecutive years') per CTech/Calcalist (Meir Orbach), Aug 14 2024, reported alongside Kiteworks' $456M growth round from Insight Partners and Sixth Street Growth. Single trade-press source, likely from an executive interview -- Medium confidence.",
  },
];

const MARKER_KEY = "cq48ArrBackfilledAt";

/** Same real-calendar-date guard as the CQ-47 admin route. */
function isRealCalendarDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export async function backfillDisclosedArr(): Promise<void> {
  try {
    const firmSlugs = [...new Set(ARR_SEEDS.map((s) => s.firmSlug))];
    for (const firmSlug of firmSlugs) {
      const [firm] = await db.select().from(firmsTable).where(eq(firmsTable.slug, firmSlug));
      // Firm absent in this environment (e.g. dev only has stg): skip quietly.
      if (!firm) continue;
      const meta = (firm.meta ?? {}) as Record<string, unknown>;
      if (meta[MARKER_KEY]) continue; // one-shot: never re-stamp

      const seeds = ARR_SEEDS.filter((s) => s.firmSlug === firmSlug);
      let wrote = 0;
      await db.transaction(async (tx) => {
        for (const seed of seeds) {
          // Route-parity validation: zod body schema + calendar-date check.
          const scrubbedSource = seed.arrSource.replace(/\u2014/g, "--").trim();
          const parsed = UpdateAdminCompanyArrBody.safeParse({
            arr: seed.arr,
            arrAsOf: seed.arrAsOf,
            arrSource: scrubbedSource,
          });
          if (!parsed.success || !isRealCalendarDate(seed.arrAsOf) || seed.arr <= 0) {
            throw new Error(
              `CQ-48 seed failed route validation for ${firmSlug}/${seed.companySlug}: ${
                parsed.success ? "invalid date or non-positive arr" : JSON.stringify(parsed.error.issues)
              }`,
            );
          }
          const result = await tx
            .update(companiesTable)
            .set({ arr: String(seed.arr), arrAsOf: seed.arrAsOf, arrSource: scrubbedSource })
            .where(
              and(
                eq(companiesTable.firmId, firm.id),
                eq(companiesTable.slug, seed.companySlug),
                isNull(companiesTable.arr), // never overwrite a manual CQ-47 edit
              ),
            )
            .returning({ id: companiesTable.id });
          if (result.length > 0) wrote += 1;
          else
            logger.warn(
              { firmSlug, companySlug: seed.companySlug },
              "CQ-48 ARR backfill: company missing or arr already set; left untouched",
            );
        }
        // Marker stamped in the same transaction as the writes. Atomic jsonb
        // merge conditional on marker absence -- a concurrent firm-meta edit
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
      logger.info({ firmSlug, companiesUpdated: wrote }, "CQ-48 ARR backfill applied for firm");
    }
    invalidatePortfolioCache();
  } catch (err) {
    // Non-fatal: server must still boot; the marker was not stamped for the
    // failing firm, so the next boot retries it.
    logger.error({ err }, "CQ-48 ARR backfill failed");
  }
}
