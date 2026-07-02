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

// ---------------------------------------------------------------------------
// Raw company registry — keyed by firm slug
// ---------------------------------------------------------------------------
const RAW_COMPANIES_BY_FIRM: Readonly<Record<string, RawCompany[]>> = {
  stg: STG_COMPANIES,
  pamlico: PAMLICO_COMPANIES,
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
