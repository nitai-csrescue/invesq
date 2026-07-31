// CQ-15: supplemental third-party enrichment layer.
//
// POSITIONING (per the Proactive Benchmark Data Sourcing Plan's validated
// recommendation): the legacy web-research scrape remains the SOURCE OF TRUTH
// for CS-team-specific headcount, G2/Capterra ratings, Glassdoor signals,
// job-posting text, and CS leadership presence. No firmographic API reproduces
// those qualitative signals. Third-party enrichment adapters (People Data Labs
// now; Revelio/Coresignal later) are SUPPLEMENTAL and contribute exactly two
// field types the legacy scrape does not produce:
//   (a) funding history (amount raised, round count, stage, date)
//   (b) country-by-country employee split
// On the ONE overlapping field (total headcount) the legacy scrape is
// authoritative: a supplemental value that diverges by more than 20% is
// FLAGGED for human review (signals row with divergenceFlag=true), never
// silently overwritten. (PDL validation: agreed within 2-14% on 3 of 5
// companies, missed by 37-45% on 2 of 5 multi-subsidiary companies.)
//
// CONFLICT PRIORITY when sources disagree: legacy scrape first, then the
// highest-confidence third-party source, then lower-confidence third-party
// sources — and the conflict is always surfaced as signal rows (one per
// source per field), never silently resolved.

export interface FundingRound {
  amountUsd: number | null;
  round: string | null;
  stage: string | null;
  date: string | null;
}

export interface FundingHistory {
  rounds: FundingRound[];
  totalRaisedUsd: number | null;
  roundCount: number | null;
  latestStage: string | null;
  source: string;
  pulledAt: string;
}

export interface CountryHeadcount {
  byCountry: Record<string, number>;
  source: string;
  pulledAt: string;
}

export interface EnrichmentResult {
  fundingHistory: FundingHistory | null;
  countryHeadcount: CountryHeadcount | null;
  /** Supplemental total headcount — used ONLY for the divergence check. */
  totalHeadcount: number | null;
}

// Every supplemental provider (PDL today, Revelio later) implements this
// interface; plugging in a new provider means adding one adapter object to
// ENRICHMENT_ADAPTERS — no pipeline rework.
export interface EnrichmentAdapter {
  /** signals.source_system value, e.g. "pdl" | "revelio". */
  name: string;
  /** Lower = higher confidence. Decides third-party priority order. */
  confidenceRank: number;
  /** "High" | "Medium" | "Low" stamped on this adapter's signal rows. */
  signalConfidence: "High" | "Medium" | "Low";
  /** False (e.g. missing API key) => adapter is skipped silently. */
  isConfigured(): boolean;
  fetch(company: { name: string; website: string | null }): Promise<EnrichmentResult | null>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

// ---------------------------------------------------------------------------
// People Data Labs adapter (live when PDL_API_KEY is set; inert otherwise).
// ---------------------------------------------------------------------------
const pdlAdapter: EnrichmentAdapter = {
  name: "pdl",
  confidenceRank: 1,
  signalConfidence: "Medium",
  isConfigured: () => Boolean(process.env.PDL_API_KEY),
  async fetch(company) {
    if (!company.website) return null;
    const url = new URL("https://api.peopledatalabs.com/v5/company/enrich");
    url.searchParams.set("website", company.website);
    const res = await fetch(url, {
      headers: { "X-Api-Key": process.env.PDL_API_KEY ?? "" },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404) return null; // company not in PDL — a valid outcome
    if (!res.ok) throw new Error(`PDL enrich failed: HTTP ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    const pulledAt = todayIso();

    const totalRaised = toNumber(body.total_funding_raised);
    const latestStage = toStr(body.latest_funding_stage);
    const rawRounds = Array.isArray(body.funding_details) ? body.funding_details : [];
    const rounds: FundingRound[] = rawRounds.map((r) => {
      const rec = (typeof r === "object" && r !== null ? r : {}) as Record<string, unknown>;
      return {
        amountUsd: toNumber(rec.funding_raised),
        round: toStr(rec.funding_type),
        stage: toStr(rec.funding_stage) ?? toStr(rec.funding_type),
        date: toStr(rec.funding_date),
      };
    });
    const roundCount = toNumber(body.number_funding_rounds) ?? (rounds.length > 0 ? rounds.length : null);
    const hasFunding = totalRaised !== null || roundCount !== null || latestStage !== null || rounds.length > 0;

    const rawByCountry =
      typeof body.employee_count_by_country === "object" && body.employee_count_by_country !== null
        ? (body.employee_count_by_country as Record<string, unknown>)
        : null;
    const byCountry: Record<string, number> = {};
    if (rawByCountry) {
      for (const [country, count] of Object.entries(rawByCountry)) {
        const n = toNumber(count);
        if (n !== null && n > 0) byCountry[country] = n;
      }
    }

    return {
      fundingHistory: hasFunding
        ? { rounds, totalRaisedUsd: totalRaised, roundCount, latestStage, source: "pdl", pulledAt }
        : null,
      countryHeadcount:
        Object.keys(byCountry).length > 0 ? { byCountry, source: "pdl", pulledAt } : null,
      totalHeadcount: toNumber(body.employee_count),
    };
  },
};

// ---------------------------------------------------------------------------
// Revelio placeholder — same interface as PDL so wiring it later is purely
// filling in fetch() + flipping isConfigured(). Ranked below PDL until its
// accuracy is validated.
// ---------------------------------------------------------------------------
const revelioAdapter: EnrichmentAdapter = {
  name: "revelio",
  confidenceRank: 2,
  signalConfidence: "Medium",
  isConfigured: () => false, // not integrated yet — intentional placeholder
  async fetch() {
    throw new Error("Revelio adapter is a placeholder and not integrated yet");
  },
};

// Highest confidence first. Legacy scrape is NOT an adapter — it is the
// authoritative baseline the adapters are compared against.
export const ENRICHMENT_ADAPTERS: EnrichmentAdapter[] = [pdlAdapter, revelioAdapter].sort(
  (a, b) => a.confidenceRank - b.confidenceRank,
);

// Parses the legacy scrape's employeesDisplay ("175", "150-200", "1,200+",
// "Unconfirmed") into a comparable number (midpoint for ranges). Null when
// the legacy scrape produced no numeric signal — then no divergence check is
// possible (we do NOT treat the supplemental number as authoritative).
export function parseLegacyHeadcount(display: string | null | undefined): number | null {
  if (!display) return null;
  const cleaned = display.replace(/,/g, "");
  const range = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const single = cleaned.match(/(\d+)/);
  return single ? Number(single[1]) : null;
}

// >20% relative divergence vs the authoritative legacy value.
export function isHeadcountDivergent(legacy: number, supplemental: number): boolean {
  if (legacy <= 0) return false;
  return Math.abs(supplemental - legacy) / legacy > 0.2;
}
