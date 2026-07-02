// ---------------------------------------------------------------------------
// Portfolio engine — ALL derived values live here.
// Raw company data (scores + copy) → computed Company + PortfolioSummary.
// Validation runs eagerly at module load; any violation throws, ensuring
// bad data never silently reaches the UI.
// ---------------------------------------------------------------------------
import type { RawCompany, Company, GapItem, PortfolioSummary, PillarScore } from "./types";
import { PILLARS, PILLAR_MAX, TIERS, getTier } from "./pillars";
import { FIRMS, getFirm as _getFirm } from "./firms";
import STG_COMPANIES from "./stg";
import PAMLICO_COMPANIES from "./pamlico";

// ---------------------------------------------------------------------------
// Raw company registry — keyed by firm slug
// ---------------------------------------------------------------------------
const RAW_COMPANIES_BY_FIRM: Readonly<Record<string, RawCompany[]>> = {
  stg: STG_COMPANIES,
  pamlico: PAMLICO_COMPANIES,
};

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

function scoredPillars(scores: Record<string, PillarScore>) {
  return PILLARS.filter((p) => scores[p.id] !== null && scores[p.id] !== undefined);
}

// Tier composite: NA pillars substitute 1 per the framework rules.
function computeTierComposite(scores: Record<string, PillarScore>): number {
  return PILLARS.reduce((sum, p) => {
    const s = scores[p.id];
    return sum + (s === null || s === undefined ? 1 : s);
  }, 0);
}

function computeGaps(raw: RawCompany): GapItem[] {
  const { scores } = raw;
  return PILLARS.filter((p) => {
    const s = scores[p.id];
    return s !== null && s !== undefined && (s as number) < 2;
  })
    .map((p) => {
      const score = scores[p.id];
      return {
        pillar: p,
        score,
        weakness: (2 - (score as number)) * p.weight,
        note: raw.gapNotes?.[p.id] ?? p.gapNote,
      };
    })
    .sort((a, b) => b.weakness - a.weakness);
}

function buildCompany(raw: RawCompany): Company {
  const scored = scoredPillars(raw.scores);
  const composite = scored.reduce((sum, p) => sum + (raw.scores[p.id] as number), 0);
  const weighted = scored.reduce((sum, p) => sum + (raw.scores[p.id] as number) * p.weight, 0);
  const tierComposite = computeTierComposite(raw.scores);
  const tier = getTier(tierComposite);
  const gaps = computeGaps(raw);

  const arrAtRiskRange: [number, number] | null = raw.arrForRollup
    ? [
        Math.round(raw.arrForRollup[0] * tier.riskMidpoint),
        Math.round(raw.arrForRollup[1] * tier.riskMidpoint),
      ]
    : null;

  return {
    ...raw,
    composite,
    displayMax: scored.length * 2,
    tierComposite,
    weightedComposite: Math.round(weighted * 10) / 10,
    weightedMax: Math.round(scored.reduce((s, p) => s + p.weight * 2, 0) * 10) / 10,
    insufficientCount: PILLARS.length - scored.length,
    tier,
    gaps,
    topGap: gaps[0] ?? null,
    arrAtRiskRange,
    arrAtRiskDisplay: arrAtRiskRange ? formatCurrencyRange(arrAtRiskRange) : "N/A",
  };
}

// ---------------------------------------------------------------------------
// Portfolio-level summary computation
// ---------------------------------------------------------------------------
function sumRanges(ranges: [number, number][]): [number, number] {
  return ranges.reduce<[number, number]>((acc, [lo, hi]) => [acc[0] + lo, acc[1] + hi], [0, 0]);
}

function computeSummary(companies: Company[]): PortfolioSummary {
  const disclosed = companies.filter((c) => c.arrForRollup !== null);
  const undisclosed = companies.filter((c) => c.arrForRollup === null);

  const totalArrRange =
    disclosed.length > 0
      ? sumRanges(disclosed.map((c) => c.arrForRollup as [number, number]))
      : [0, 0] as [number, number];

  const atRiskRange =
    disclosed.length > 0
      ? sumRanges(disclosed.map((c) => c.arrAtRiskRange as [number, number]))
      : [0, 0] as [number, number];

  const avgComposite =
    companies.length > 0
      ? Math.round(
          (companies.reduce((s, c) => s + (c.composite / c.displayMax) * PILLAR_MAX, 0) /
            companies.length) *
            10,
        ) / 10
      : 0;

  return {
    companyCount: companies.length,
    totalArrDisplay:
      disclosed.length > 0 ? formatCurrencyRange(totalArrRange) : "N/A",
    arrAtRiskDisplay:
      disclosed.length > 0 ? formatCurrencyRange(atRiskRange) : "N/A",
    arrDisclosedCount: disclosed.length,
    arrUndisclosedCount: undisclosed.length,
    arrUndisclosedNames: undisclosed.map((c) => c.name),
    avgComposite,
    tierCounts: TIERS.map((t) => ({
      tier: t,
      count: companies.filter((c) => c.tier.id === t.id).length,
    })),
  };
}

// ---------------------------------------------------------------------------
// Validation — runs once at module load, throws on any violation
// ---------------------------------------------------------------------------
const VALID_SCORES = new Set([0, 1, 2, null]);

function validateFirmData(firmSlug: string, rawList: RawCompany[], companies: Company[]) {
  const errs: string[] = [];

  for (const raw of rawList) {
    const ctx = `[${firmSlug}/${raw.id}]`;

    // 1. Every pillar must be represented in scores with a valid value.
    for (const p of PILLARS) {
      if (!(p.id in raw.scores)) {
        errs.push(`${ctx} pillar "${p.id}" is missing from scores`);
      } else if (!VALID_SCORES.has(raw.scores[p.id])) {
        errs.push(`${ctx} pillar "${p.id}" has invalid score ${raw.scores[p.id]} (must be 0, 1, 2, or null)`);
      }
    }

    // 2. ARR range must be ordered (lo <= hi).
    if (raw.arrForRollup !== null) {
      const [lo, hi] = raw.arrForRollup;
      if (lo > hi) {
        errs.push(`${ctx} arrForRollup [${lo}, ${hi}] is inverted (lo > hi)`);
      }
      if (lo < 0 || hi < 0) {
        errs.push(`${ctx} arrForRollup contains negative values`);
      }
    }

    // 3. lastDiagnostic must parse as a date.
    if (isNaN(Date.parse(raw.lastDiagnostic))) {
      errs.push(`${ctx} lastDiagnostic "${raw.lastDiagnostic}" is not a valid ISO date`);
    }
  }

  // 4. For each built company, verify denominators.
  for (const c of companies) {
    const naCount = PILLARS.filter(
      (p) => c.scores[p.id] === null || c.scores[p.id] === undefined,
    ).length;
    const expectedMax = PILLAR_MAX - 2 * naCount;
    if (c.displayMax !== expectedMax) {
      errs.push(
        `[${firmSlug}/${c.id}] displayMax ${c.displayMax} !== expected ${expectedMax} (${naCount} NA pillars)`,
      );
    }

    // 5. Tier must derive from substitution rule.
    const expectedTierComposite = computeTierComposite(c.scores);
    if (c.tierComposite !== expectedTierComposite) {
      errs.push(
        `[${firmSlug}/${c.id}] tierComposite ${c.tierComposite} !== recomputed ${expectedTierComposite}`,
      );
    }
    const expectedTier = getTier(expectedTierComposite);
    if (c.tier.id !== expectedTier.id) {
      errs.push(
        `[${firmSlug}/${c.id}] tier ${c.tier.id} !== recomputed ${expectedTier.id}`,
      );
    }
  }

  if (errs.length > 0) {
    throw new Error(
      `INVESQ Portfolio validation failed for firm "${firmSlug}":\n` +
        errs.map((e) => `  • ${e}`).join("\n"),
    );
  }
}

// ---------------------------------------------------------------------------
// Pre-compute everything eagerly (throws at startup if data is invalid)
// ---------------------------------------------------------------------------
const FIRM_COMPANIES = new Map<string, Company[]>();
const FIRM_SUMMARIES = new Map<string, PortfolioSummary>();

for (const firm of FIRMS) {
  const rawList = RAW_COMPANIES_BY_FIRM[firm.slug] ?? [];
  const companies = rawList
    .map(buildCompany)
    .sort((a, b) => a.tierComposite - b.tierComposite);

  validateFirmData(firm.slug, rawList, companies);

  FIRM_COMPANIES.set(firm.slug, companies);
  FIRM_SUMMARIES.set(firm.slug, computeSummary(companies));
}

// ---------------------------------------------------------------------------
// Public API — query functions
// ---------------------------------------------------------------------------
export { _getFirm as getFirm };

export function getFirmCompanies(firmSlug: string): Company[] {
  return FIRM_COMPANIES.get(firmSlug) ?? [];
}

export function getFirmCompany(firmSlug: string, companySlug: string): Company | undefined {
  return FIRM_COMPANIES.get(firmSlug)?.find((c) => c.id === companySlug);
}

export function getFirmSummary(firmSlug: string): PortfolioSummary | undefined {
  return FIRM_SUMMARIES.get(firmSlug);
}

// ---------------------------------------------------------------------------
// Utility: gap display title
// ---------------------------------------------------------------------------
export function gapTitle(company: Pick<Company, "leadershipFraming">, gap: GapItem): string {
  if (gap.pillar.id === "leadership" && company.leadershipFraming === "establish") {
    return "Establish CS Leadership";
  }
  return gap.pillar.name;
}

// ---------------------------------------------------------------------------
// Formatters (re-exported for consumer convenience)
// ---------------------------------------------------------------------------
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

export function formatCurrencyCompact(value: number): string {
  return formatCurrency(value).replace(/\.0(?=[KMB]$)/, "");
}

export function formatCurrencyRange([lo, hi]: [number, number]): string {
  return `${formatCurrencyCompact(lo)}–${formatCurrencyCompact(hi)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
