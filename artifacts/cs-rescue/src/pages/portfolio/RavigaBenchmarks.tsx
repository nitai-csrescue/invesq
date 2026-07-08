import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { BarChart3, TrendingUp, ArrowUp, ArrowDown, Minus, ChevronRight } from "lucide-react";
import {
  getFirm,
  getFirmCompanies,
  computeCompanyForecast,
  PILLAR_MAX,
  type Company,
} from "@/data/portfolio";
import { RavigaShell } from "@/components/portfolio/RavigaShell";

type Tab = "composite" | "arr" | "forecast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function normalizedScore(c: Company): number {
  return Math.round(((c.composite / c.displayMax) * PILLAR_MAX) * 10) / 10;
}

function arrMid(c: Company): number | null {
  if (!c.arrForRollup) return null;
  return (c.arrForRollup[0] + c.arrForRollup[1]) / 2;
}

function forecastUplift(c: Company): number | null {
  const pts = computeCompanyForecast(c.assessmentPoints);
  if (pts.length === 0) return null;
  const current = c.assessmentPoints[c.assessmentPoints.length - 1].normalizedComposite;
  return Math.round((pts[pts.length - 1].baselineValue - current) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Delta badge
// ---------------------------------------------------------------------------
function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) {
    return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> —</span>;
  }
  const pos = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos ? "text-emerald-600" : "text-rose-600"}`}>
      {pos ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {pos ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Composite tab
// ---------------------------------------------------------------------------
function CompositeTab({ companies, firmSlug }: { companies: Company[]; firmSlug: string }) {
  // Companies with zero scored pillars (all NA, displayMax 0) carry no
  // composite signal — exclude them from benchmarking rather than treating
  // "no data" as a score of 0 (or dividing 0/0 into NaN).
  const scoredCompanies = companies.filter((c) => c.displayMax > 0);
  const scores = scoredCompanies.map(normalizedScore);
  const median = scores.length > 0 ? getMedian(scores) : 0;
  const sorted = [...scoredCompanies].sort((a, b) => normalizedScore(b) - normalizedScore(a));

  return (
    <div>
      <p className="mb-5 text-sm text-muted-foreground">
        Portfolio median: <span className="font-semibold text-foreground">{median.toFixed(1)} / {PILLAR_MAX}</span>
      </p>
      <div className="divide-y divide-border">
        {sorted.map((c, i) => {
          const val = normalizedScore(c);
          const delta = Math.round((val - median) * 10) / 10;
          return (
            <div key={c.id} className="flex items-center gap-4 py-3">

              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: c.tier.color }}
              >
                {c.tier.id}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/${firmSlug}/portfolio/${c.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
                  {c.name}
                </Link>
                <div className="text-xs text-muted-foreground truncate">{c.sector}</div>
              </div>
              <div className="hidden flex-1 max-w-40 md:block">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(val / PILLAR_MAX) * 100}%`, backgroundColor: c.tier.color }}
                  />
                </div>
              </div>
              <span className="w-16 text-right font-mono text-sm font-semibold text-foreground">{val.toFixed(1)}</span>
              <div className="w-14 text-right"><DeltaBadge delta={delta} /></div>
              <Link href={`/${firmSlug}/portfolio/${c.id}`} className="text-muted-foreground hover:text-primary">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARR tab
// ---------------------------------------------------------------------------
function ArrTab({ companies, firmSlug }: { companies: Company[]; firmSlug: string }) {
  const disclosed = companies.filter((c) => c.arrForRollup !== null);
  const undisclosed = companies.filter((c) => c.arrForRollup === null);
  const mids = disclosed.map((c) => arrMid(c) as number);
  const median = getMedian(mids);
  const maxVal = Math.max(...mids, 1);
  const sorted = [...disclosed].sort((a, b) => (arrMid(b) ?? 0) - (arrMid(a) ?? 0));

  return (
    <div>
      {mids.length > 0 && (
        <p className="mb-5 text-sm text-muted-foreground">
          Disclosed ARR median:{" "}
          <span className="font-semibold text-foreground">
            {median >= 1e6 ? `$${(median / 1e6).toFixed(0)}M` : `$${(median / 1e3).toFixed(0)}K`}
          </span>
        </p>
      )}
      <div className="divide-y divide-border">
        {sorted.map((c, i) => {
          const mid = arrMid(c) ?? 0;
          const delta = mid - median;
          const sign = delta >= 0 ? "+" : "-";
          const abs = Math.abs(delta);
          const dl = abs >= 1e6 ? `${sign}$${(abs / 1e6).toFixed(1)}M` : `${sign}$${(abs / 1e3).toFixed(0)}K`;
          return (
            <div key={c.id} className="flex items-center gap-4 py-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: c.tier.color }}>
                {c.tier.id}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/${firmSlug}/portfolio/${c.id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                  {c.name}
                </Link>
                <div className="text-xs text-muted-foreground truncate">{c.sector}</div>
              </div>
              <div className="hidden flex-1 max-w-40 md:block">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/60" style={{ width: `${(mid / maxVal) * 100}%` }} />
                </div>
              </div>
              <span className="w-24 text-right font-mono text-sm font-semibold text-foreground">{c.arrDisplay}</span>
              <span className={`w-16 text-right text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{dl}</span>
              <Link href={`/${firmSlug}/portfolio/${c.id}`} className="text-muted-foreground hover:text-primary">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
        {undisclosed.length > 0 && (
          <div className="pt-3 text-xs text-muted-foreground">
            {undisclosed.map((c) => `${c.name}`).join(", ")} ARR undisclosed
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forecast tab
// ---------------------------------------------------------------------------
function ForecastTab({ companies, firmSlug }: { companies: Company[]; firmSlug: string }) {
  const withUplift = useMemo(() => {
    return companies
      .map((c) => ({ c, uplift: forecastUplift(c) }))
      .filter((x) => x.uplift !== null) as { c: Company; uplift: number }[];
  }, [companies]);

  const uplifts = withUplift.map((x) => x.uplift);
  const median = getMedian(uplifts);
  const sorted = [...withUplift].sort((a, b) => b.uplift - a.uplift);

  return (
    <div>
      <p className="mb-5 text-sm text-muted-foreground">
        6-month composite uplift (normalized 0–{PILLAR_MAX}). Portfolio median:{" "}
        <span className="font-semibold text-foreground">
          {median >= 0 ? "+" : ""}{median.toFixed(1)} pts
        </span>
      </p>
      <div className="divide-y divide-border">
        {sorted.map(({ c, uplift }, i) => {
          const delta = Math.round((uplift - median) * 10) / 10;
          return (
            <div key={c.id} className="flex items-center gap-4 py-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: c.tier.color }}>
                {c.tier.id}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/${firmSlug}/portfolio/${c.id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                  {c.name}
                </Link>
                <div className="text-xs text-muted-foreground truncate">{c.sector}</div>
              </div>
              <div className="hidden flex-1 max-w-40 md:block">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${uplift >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.min(100, Math.abs(uplift / PILLAR_MAX) * 200)}%` }}
                  />
                </div>
              </div>
              <span className={`w-16 text-right font-mono text-sm font-semibold ${uplift >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {uplift >= 0 ? "+" : ""}{uplift.toFixed(1)}
              </span>
              <div className="w-14 text-right"><DeltaBadge delta={delta} /></div>
              <Link href={`/${firmSlug}/portfolio/${c.id}`} className="text-muted-foreground hover:text-primary">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-border pt-4 text-[11px] text-muted-foreground">
        Forecast uses linear regression on historical assessment periods. Illustrative — not a guarantee.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function FirmNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-muted-foreground">Firm not found.</p>
    </div>
  );
}

export default function RavigaBenchmarks() {
  const [, params] = useRoute("/:firmSlug/benchmarks");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);
  if (!firm) return <FirmNotFound />;

  const companies = getFirmCompanies(firmSlug);
  const [tab, setTab] = useState<Tab>("composite");

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "composite", label: "Composite Score", icon: BarChart3 },
    { id: "arr", label: "ARR", icon: TrendingUp },
    { id: "forecast", label: "6-Mo Forecast", icon: TrendingUp },
  ];

  return (
    <RavigaShell firm={firm}>
      {/* Eyebrow + title */}
      <div className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {firm.displayName.toUpperCase()} · Fund III
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Portfolio Benchmarks</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} companies · ranked best-to-worst per metric
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="mb-1 flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {tab === "composite" && <CompositeTab companies={companies} firmSlug={firmSlug} />}
        {tab === "arr" && <ArrTab companies={companies} firmSlug={firmSlug} />}
        {tab === "forecast" && <ForecastTab companies={companies} firmSlug={firmSlug} />}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Delta = vs portfolio median · Phase 1 external-signal data only
      </p>
    </RavigaShell>
  );
}
