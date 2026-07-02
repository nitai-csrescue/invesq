// ---------------------------------------------------------------------------
// Portfolio engine — ALL derived values live here.
// Raw company data (assessments + copy) → computed Company + PortfolioSummary.
// Validation runs eagerly at module load; any violation throws, ensuring
// bad data never silently reaches the UI.
// ---------------------------------------------------------------------------
import type {
  RawCompany,
  Company,
  GapItem,
  PortfolioSummary,
  PillarScore,
  AssessmentPoint,
  PortfolioTrendPoint,
} from "./types";
import { PILLARS, PILLAR_MAX, TIERS, getTier } from "./pillars";
import { FIRMS, getFirm as _getFirm } from "./firms";
import STG_COMPANIES from "./stg";
import PAMLICO_COMPANIES from "./pamlico";
import RAVIGA_COMPANIES from "./raviga";

// ---------------------------------------------------------------------------
// Raw company registry — keyed by firm slug
// ---------------------------------------------------------------------------
const RAW_COMPANIES_BY_FIRM: Readonly<Record<string, RawCompany[]>> = {
  stg: STG_COMPANIES,
  pamlico: PAMLICO_COMPANIES,
  raviga: RAVIGA_COMPANIES,
};

// ---------------------------------------------------------------------------
// Internal helpers
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

function computeGaps(
  scores: Record<string, PillarScore>,
  gapNotes: Record<string, string> | undefined,
): GapItem[] {
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
        note: gapNotes?.[p.id] ?? p.gapNote,
      };
    })
    .sort((a, b) => b.weakness - a.weakness);
}

// Normalize a raw composite to the 0–PILLAR_MAX scale, making it
// comparable across assessments even if NA counts differ between runs.
function normalizeComposite(composite: number, displayMax: number): number {
  if (displayMax === 0) return 0;
  return Math.round((composite / displayMax) * PILLAR_MAX * 10) / 10;
}

// Build AssessmentPoint[] from a company's assessments array.
function buildAssessmentPoints(
  assessments: RawCompany["assessments"],
): AssessmentPoint[] {
  return assessments.map((a) => {
    const scored = PILLARS.filter(
      (p) => a.pillarScores[p.id] !== null && a.pillarScores[p.id] !== undefined,
    );
    const composite = scored.reduce(
      (sum, p) => sum + (a.pillarScores[p.id] as number),
      0,
    );
    const displayMax = scored.length * 2;
    return {
      date: a.date,
      composite,
      displayMax,
      normalizedComposite: normalizeComposite(composite, displayMax),
    };
  });
}

function buildCompany(raw: RawCompany): Company {
  const latest = raw.assessments[raw.assessments.length - 1];
  const scores = latest.pillarScores;

  const scored = scoredPillars(scores);
  const composite = scored.reduce((sum, p) => sum + (scores[p.id] as number), 0);
  const weighted = scored.reduce(
    (sum, p) => sum + (scores[p.id] as number) * p.weight,
    0,
  );
  const tierComposite = computeTierComposite(scores);
  const tier = getTier(tierComposite);
  const gaps = computeGaps(scores, raw.gapNotes);

  const arrAtRiskRange: [number, number] | null = raw.arrForRollup
    ? [
        Math.round(raw.arrForRollup[0] * tier.riskMidpoint),
        Math.round(raw.arrForRollup[1] * tier.riskMidpoint),
      ]
    : null;

  return {
    ...raw,
    // Derived from latest assessment:
    scores,
    lastDiagnostic: latest.date,
    assessmentPoints: buildAssessmentPoints(raw.assessments),
    // Derived from latest scores:
    composite,
    displayMax: scored.length * 2,
    tierComposite,
    weightedComposite: Math.round(weighted * 10) / 10,
    weightedMax:
      Math.round(scored.reduce((s, p) => s + p.weight * 2, 0) * 10) / 10,
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
  return ranges.reduce<[number, number]>(
    (acc, [lo, hi]) => [acc[0] + lo, acc[1] + hi],
    [0, 0],
  );
}

function computeSummary(companies: Company[]): PortfolioSummary {
  const disclosed = companies.filter((c) => c.arrForRollup !== null);
  const undisclosed = companies.filter((c) => c.arrForRollup === null);

  const totalArrRange =
    disclosed.length > 0
      ? sumRanges(disclosed.map((c) => c.arrForRollup as [number, number]))
      : ([0, 0] as [number, number]);

  const atRiskRange =
    disclosed.length > 0
      ? sumRanges(
          disclosed.map((c) => c.arrAtRiskRange as [number, number]),
        )
      : ([0, 0] as [number, number]);

  const avgComposite =
    companies.length > 0
      ? Math.round(
          (companies.reduce(
            (s, c) => s + (c.composite / c.displayMax) * PILLAR_MAX,
            0,
          ) /
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

function validateFirmData(
  firmSlug: string,
  rawList: RawCompany[],
  companies: Company[],
) {
  const errs: string[] = [];

  for (const raw of rawList) {
    const ctx = `[${firmSlug}/${raw.id}]`;

    // 1. Must have at least one assessment.
    if (!raw.assessments || raw.assessments.length === 0) {
      errs.push(`${ctx} assessments array is empty — at least one is required`);
      continue; // no point validating further
    }

    // 2. Assessments must be sorted ascending by date.
    for (let i = 1; i < raw.assessments.length; i++) {
      if (raw.assessments[i].date < raw.assessments[i - 1].date) {
        errs.push(
          `${ctx} assessments not in ascending date order: "${raw.assessments[i - 1].date}" → "${raw.assessments[i].date}"`,
        );
      }
    }

    // 3. Each assessment: all 8 pillars present with valid scores; date parses.
    for (const a of raw.assessments) {
      const actx = `${ctx}[${a.date}]`;

      if (isNaN(Date.parse(a.date))) {
        errs.push(`${actx} assessment date is not a valid ISO date`);
      }

      for (const p of PILLARS) {
        if (!(p.id in a.pillarScores)) {
          errs.push(
            `${actx} pillar "${p.id}" is missing from pillarScores`,
          );
        } else if (!VALID_SCORES.has(a.pillarScores[p.id])) {
          errs.push(
            `${actx} pillar "${p.id}" has invalid score ${a.pillarScores[p.id]} (must be 0, 1, 2, or null)`,
          );
        }
      }
    }

    // 4. ARR range must be ordered.
    if (raw.arrForRollup !== null) {
      const [lo, hi] = raw.arrForRollup;
      if (lo > hi) {
        errs.push(`${ctx} arrForRollup [${lo}, ${hi}] is inverted (lo > hi)`);
      }
      if (lo < 0 || hi < 0) {
        errs.push(`${ctx} arrForRollup contains negative values`);
      }
    }
  }

  // 5. For each built company, verify denominators and tier derivation.
  for (const c of companies) {
    const naCount = PILLARS.filter(
      (p) =>
        c.scores[p.id] === null || c.scores[p.id] === undefined,
    ).length;
    const expectedMax = PILLAR_MAX - 2 * naCount;
    if (c.displayMax !== expectedMax) {
      errs.push(
        `[${firmSlug}/${c.id}] displayMax ${c.displayMax} !== expected ${expectedMax} (${naCount} NA pillars)`,
      );
    }

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
// Public query API
// ---------------------------------------------------------------------------
export { _getFirm as getFirm };

export function getFirmCompanies(firmSlug: string): Company[] {
  return FIRM_COMPANIES.get(firmSlug) ?? [];
}

export function getFirmCompany(
  firmSlug: string,
  companySlug: string,
): Company | undefined {
  return FIRM_COMPANIES.get(firmSlug)?.find((c) => c.id === companySlug);
}

export function getFirmSummary(firmSlug: string): PortfolioSummary | undefined {
  return FIRM_SUMMARIES.get(firmSlug);
}

// ---------------------------------------------------------------------------
// Portfolio-level trend — aggregate normalized composite by month across
// all companies in a firm. One point per calendar month that appears in
// any company's assessments.
// ---------------------------------------------------------------------------
function monthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const yr = String(d.getFullYear()).slice(2);
  return `${mon} '${yr}`;
}

export function getPortfolioTrendPoints(firmSlug: string): PortfolioTrendPoint[] {
  const companies = FIRM_COMPANIES.get(firmSlug) ?? [];
  // Bucket by year-month key ("2026-06") so we can sort, map to label later.
  const byYearMonth = new Map<
    string,
    { label: string; sortKey: string; values: number[] }
  >();

  for (const company of companies) {
    for (const ap of company.assessmentPoints) {
      const ym = ap.date.slice(0, 7); // "2026-06"
      if (!byYearMonth.has(ym)) {
        byYearMonth.set(ym, {
          label: monthLabel(ap.date),
          sortKey: ap.date,
          values: [],
        });
      }
      byYearMonth.get(ym)!.values.push(ap.normalizedComposite);
    }
  }

  return [...byYearMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { label, sortKey, values }]) => ({
      period: label,
      sortKey,
      avgNormalized:
        Math.round(
          (values.reduce((s, v) => s + v, 0) / values.length) * 10,
        ) / 10,
      companyCount: values.length,
    }));
}

// ---------------------------------------------------------------------------
// Utility: gap display title
// ---------------------------------------------------------------------------
export function gapTitle(
  company: Pick<Company, "leadershipFraming">,
  gap: GapItem,
): string {
  if (
    gap.pillar.id === "leadership" &&
    company.leadershipFraming === "establish"
  ) {
    return "Establish CS Leadership";
  }
  return gap.pillar.name;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
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

// ---------------------------------------------------------------------------
// Forecast — additive; never modifies core derivation logic above
// ---------------------------------------------------------------------------

/** A single forward-projected data point produced by computeCompanyForecast / computePortfolioForecast. */
export interface ForecastPoint {
  period: string;    // human-readable label e.g. "Jul '26"
  sortKey: string;   // ISO yyyy-mm-dd for sorting / deduplication
  baselineValue: number; // clamped to [0, PILLAR_MAX]
}

/** Pre-defined hypothetical actions for the interactive forecast dropdown. */
export const FORECAST_ACTIONS = [
  { id: "hire-hocs",    label: "Hire Head of Customer Success",          bump: 1.5, rampMonths: 3 },
  { id: "cs-platform",  label: "Deploy CS Platform (Gainsight/Planhat)", bump: 2.0, rampMonths: 3 },
  { id: "onboarding",   label: "Implement formal onboarding process",    bump: 1.2, rampMonths: 2 },
  { id: "trust-safety", label: "Stand up Trust & Safety function",       bump: 1.0, rampMonths: 2 },
  { id: "support-team", label: "Hire dedicated support team",            bump: 1.0, rampMonths: 2 },
  { id: "qbr-cadence",  label: "Install formal QBR cadence",             bump: 0.8, rampMonths: 2 },
] as const;

export type ForecastActionId = (typeof FORECAST_ACTIONS)[number]["id"];

/** Simple linear regression helper — returns { slope, intercept } fitted on ys. */
function linReg(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const ssXX = xs.reduce((s, x) => s + (x - meanX) ** 2, 0) || 1;
  const ssXY = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const slope = ssXY / ssXX;
  return { slope, intercept: meanY - slope * meanX };
}

/** Generate N forward months given a last ISO date string. */
function futureMonths(lastIso: string, count: number): { iso: string; period: string }[] {
  const base = new Date(lastIso + "T00:00:00");
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i + 1);
    const iso = d.toISOString().slice(0, 10);
    return { iso, period: monthLabel(iso) };
  });
}

/**
 * Produce 6-month forward baseline forecast for a company using linear regression
 * on the last (up to 4) real assessment points.
 * Returns [] when fewer than 2 assessment points exist.
 */
export function computeCompanyForecast(
  assessmentPoints: AssessmentPoint[],
  monthsAhead = 6,
): ForecastPoint[] {
  if (assessmentPoints.length < 2) return [];
  const window = assessmentPoints.slice(-Math.min(4, assessmentPoints.length));
  const { slope, intercept } = linReg(window.map((p) => p.normalizedComposite));
  const n = window.length;
  const months = futureMonths(assessmentPoints[assessmentPoints.length - 1].date, monthsAhead);
  return months.map(({ iso, period }, i) => ({
    period,
    sortKey: iso,
    baselineValue: Math.max(0, Math.min(PILLAR_MAX, Math.round((slope * (n + i) + intercept) * 10) / 10)),
  }));
}

/**
 * Produce 6-month forward baseline forecast for a firm's portfolio average
 * using linear regression on the last (up to 4) portfolio trend periods.
 * Returns [] when fewer than 2 trend periods exist.
 */
export function computePortfolioForecast(firmSlug: string, monthsAhead = 6): ForecastPoint[] {
  const trendPoints = getPortfolioTrendPoints(firmSlug);
  if (trendPoints.length < 2) return [];
  const window = trendPoints.slice(-Math.min(4, trendPoints.length));
  const { slope, intercept } = linReg(window.map((p) => p.avgNormalized));
  const n = window.length;
  const months = futureMonths(trendPoints[trendPoints.length - 1].sortKey, monthsAhead);
  return months.map(({ iso, period }, i) => ({
    period,
    sortKey: iso,
    baselineValue: Math.max(0, Math.min(PILLAR_MAX, Math.round((slope * (n + i) + intercept) * 10) / 10)),
  }));
}
