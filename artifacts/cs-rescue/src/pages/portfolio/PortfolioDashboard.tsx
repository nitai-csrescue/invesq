import { useState } from "react";
import { Link, useRoute } from "wouter";
import { TrendingDown, Building2, Wallet, Gauge, AlertTriangle, ShieldAlert } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PortfolioLayout, ConfidenceBadge } from "@/components/portfolio/PortfolioLayout";
import {
  PILLARS,
  TIERS,
  SCORE_LEVELS,
  scoreLevel,
  gapTitle,
  formatDate,
  PILLAR_MAX,
  AS_OF_DATE,
  getFirm,
  getFirmCompanies,
  getFirmSummary,
  getPortfolioTrendPoints,
  computePortfolioForecast,
  FORECAST_ACTIONS,
  type Company,
  type Firm,
  type PortfolioTrendPoint,
} from "@/data/portfolio";

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  illustrative,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  sub: string;
  illustrative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <div className="mt-3 font-mono text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {illustrative && <span className="text-amber-300/80">Illustrative · </span>}
        {sub}
      </div>
    </div>
  );
}

function PillarStrip({ company }: { company: Company }) {
  return (
    <div className="flex items-center gap-1">
      {PILLARS.map((p) => {
        const lvl = scoreLevel(company.scores[p.id]);
        return (
          <div
            key={p.id}
            title={`${p.name}: ${lvl.label}`}
            className={`h-1.5 flex-1 rounded-full ${lvl.dotClass} ${
              company.scores[p.id] === null ? "opacity-40" : ""
            }`}
          />
        );
      })}
    </div>
  );
}

function CompanyCard({ company, firmSlug }: { company: Company; firmSlug: string }) {
  const { tier } = company;
  return (
    <Link href={`/${firmSlug}/portfolio/${company.id}`}>
      <div className="group h-full cursor-pointer rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
              {company.name}
            </h3>
            <p className="truncate text-xs text-muted-foreground">{company.sector}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-3xl font-bold leading-none" style={{ color: tier.color }}>
              {company.composite}
            </div>
            <div
              className="text-[10px] text-muted-foreground"
              title={
                company.insufficientCount > 0
                  ? `${company.insufficientCount} of 8 pillars marked Insufficient Data (N/A) — excluded from the composite rather than guessed, so the max is ${company.displayMax} instead of ${PILLAR_MAX}.`
                  : undefined
              }
            >
              / {company.displayMax}
              {company.insufficientCount > 0 && (
                <span className="text-amber-300/80"> · {company.insufficientCount} N/A</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tier.badgeClass}`}>
            Tier {tier.id} · {tier.label}
          </span>
          <ConfidenceBadge confidence={company.confidence} />
        </div>

        <div className="mt-4">
          <PillarStrip company={company} />
        </div>

        {company.calloutNote && (
          <div className="mt-3 flex items-start gap-1.5 rounded border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 text-[11px] text-amber-300">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{company.calloutNote}</span>
          </div>
        )}

        {company.topGap && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-2.5">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-rose-300">Top gap · {gapTitle(company, company.topGap)}</div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{company.topGap.note}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="font-mono text-foreground">{company.arrDisplay} ARR</span>
          <span>Assessed {formatDate(company.lastDiagnostic)}</span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Portfolio-level trend widget
// ---------------------------------------------------------------------------

function portfolioFutureLabel(baseIso: string, quartersAhead: number): string {
  const d = new Date(baseIso + "T00:00:00");
  d.setDate(d.getDate() + quartersAhead * 91);
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const yr = String(d.getFullYear()).slice(2);
  return `${mon} '${yr}`;
}

function PortfolioTrendWidget({
  firmSlug,
  companyCount,
}: {
  firmSlug: string;
  companyCount: number;
}) {
  const realPoints = getPortfolioTrendPoints(firmSlug);
  if (realPoints.length === 0) return null;

  const needsProjection = realPoints.length < 3;
  const last = realPoints[realPoints.length - 1];

  // Build chart data — real points, plus dashed projection if < 3 assessments
  const chartData: { period: string; actual: number | null; projected: number | null }[] =
    realPoints.map((p, i) => ({
      period: p.period,
      actual: p.avgNormalized,
      // bridge: last real point is also the start of the projected line
      projected: i === realPoints.length - 1 && needsProjection ? p.avgNormalized : null,
    }));

  if (needsProjection) {
    chartData.push(
      {
        period: portfolioFutureLabel(last.sortKey, 1),
        actual: null,
        projected: Math.min(PILLAR_MAX, Math.round((last.avgNormalized + 0.5) * 10) / 10),
      },
      {
        period: portfolioFutureLabel(last.sortKey, 2),
        actual: null,
        projected: Math.min(PILLAR_MAX, Math.round((last.avgNormalized + 1.0) * 10) / 10),
      },
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-foreground">Portfolio trend</h2>
          <span className="text-[10px] text-muted-foreground">avg normalized composite · 0–{PILLAR_MAX}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded bg-primary/70" />
            <span>
              Actual ({realPoints.length} {realPoints.length === 1 ? "period" : "periods"} · {companyCount}{" "}
              {companyCount === 1 ? "company" : "companies"})
            </span>
          </div>
          {needsProjection && (
            <div className="flex items-center gap-1.5">
              <svg width="16" height="4" className="shrink-0">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
              <span>Projection</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2">
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={chartData} margin={{ top: 6, right: 8, left: -28, bottom: 0 }}>
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis domain={[0, PILLAR_MAX]} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickCount={3} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 11,
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(1),
                name === "actual" ? "Avg composite (actual)" : "Illustrative projection",
              ]}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.7}
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0, fillOpacity: 0.8 }}
              connectNulls={false}
            />
            {needsProjection && (
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: "#6b7280", strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {needsProjection && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {realPoints.length === 1
            ? `1 assessment period on record — trend builds as re-runs are added`
            : `${realPoints.length} assessment periods — projection shown until 3+ exist`}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio forecast widget — shown only when firm has ≥ 3 real trend periods
// ---------------------------------------------------------------------------

function PortfolioForecastWidget({
  firmSlug,
  companyCount,
}: {
  firmSlug: string;
  companyCount: number;
}) {
  const [selectedAction, setSelectedAction] = useState("none");
  const realPoints = getPortfolioTrendPoints(firmSlug);
  const forecastPts = computePortfolioForecast(firmSlug);

  if (realPoints.length < 3 || forecastPts.length === 0) return null;

  const action = FORECAST_ACTIONS.find((a) => a.id === selectedAction);

  type Row = { period: string; actual: number | null; baseline: number | null; upside: number | null };

  const chartData: Row[] = [
    ...realPoints.map((p, i) => ({
      period: p.period,
      actual: p.avgNormalized,
      baseline: i === realPoints.length - 1 ? p.avgNormalized : null,
      upside: i === realPoints.length - 1 && action != null ? p.avgNormalized : null,
    })),
    ...forecastPts.map((fp, i) => {
      const bumpAtMonth = action
        ? Math.min(action.bump, action.bump * ((i + 1) / action.rampMonths))
        : 0;
      return {
        period: fp.period,
        actual: null,
        baseline: fp.baselineValue,
        upside:
          action != null
            ? Math.max(0, Math.min(PILLAR_MAX, Math.round((fp.baselineValue + bumpAtMonth) * 10) / 10))
            : null,
      };
    }),
  ];

  return (
    <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold text-foreground">Portfolio forecast</h2>
          <span className="text-[10px] text-muted-foreground">
            avg normalized composite · 0–{PILLAR_MAX} · {companyCount}{" "}
            {companyCount === 1 ? "company" : "companies"} · 6-month outlook
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Model action:</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-[10px] text-foreground"
          >
            <option value="none">Baseline only</option>
            {FORECAST_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2">
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={chartData} margin={{ top: 6, right: 8, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="period"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, PILLAR_MAX]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickCount={3}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 11,
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(1),
                name === "actual"
                  ? "Avg composite (actual)"
                  : name === "baseline"
                    ? "Projected — baseline"
                    : "Modeled upside",
              ]}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.7}
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0, fillOpacity: 0.8 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={{ r: 2, fill: "#6b7280", strokeWidth: 0 }}
              connectNulls={false}
            />
            {action != null && (
              <Line
                type="monotone"
                dataKey="upside"
                stroke="#818cf8"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={{ r: 2, fill: "#818cf8", strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded bg-primary/70" />
          <span>
            Actual ({realPoints.length} {realPoints.length === 1 ? "period" : "periods"})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="4" className="shrink-0">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <span>Projected — trend continuation</span>
        </div>
        {action != null && (
          <div className="flex items-center gap-1.5">
            <svg width="16" height="4" className="shrink-0">
              <line x1="0" y1="2" x2="16" y2="2" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="5 3" />
            </svg>
            <span>Modeled upside — {action.label}</span>
          </div>
        )}
      </div>
      <p className="mt-1 text-[10px] italic text-muted-foreground/60">
        Forecasts are illustrative projections, not guarantees.
      </p>
    </div>
  );
}

function FirmNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="text-6xl font-bold text-muted-foreground/30">404</div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Firm not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No portfolio exists for this firm identifier.</p>
      </div>
    </div>
  );
}

export default function PortfolioDashboard() {
  const [, params] = useRoute("/:firmSlug/portfolio");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);

  if (!firm) return <FirmNotFound />;

  const companies = getFirmCompanies(firmSlug);
  const summary = getFirmSummary(firmSlug)!;
  const { tierCounts } = summary;
  const maxTierCount = Math.max(...tierCounts.map((t) => t.count), 1);

  return (
    <PortfolioLayout firm={firm}>
      {/* Page heading */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Portfolio Operating Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer Success operational-diligence rollup across {firm.displayName}&apos;s portfolio · as of{" "}
            {formatDate(AS_OF_DATE)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {firm.internalOnly && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300">
              <ShieldAlert className="h-3 w-3" /> {firm.statusLabel}
            </span>
          )}
          <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
            <AlertTriangle className="h-3 w-3" /> Phase 1 external-signal scoring · trend projections illustrative
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Building2}
          label="Portfolio Companies"
          value={String(summary.companyCount)}
          sub="Assessed this cycle"
        />
        <KpiCard
          icon={Wallet}
          label="Total ARR"
          value={summary.totalArrDisplay}
          sub={
            summary.arrUndisclosedCount > 0
              ? `Disclosed ARR only — ${summary.arrUndisclosedCount} ${
                  summary.arrUndisclosedCount === 1 ? "company" : "companies"
                } undisclosed²`
              : "Across assessed companies"
          }
        />
        <KpiCard
          icon={Gauge}
          label="Avg Composite"
          value={`${summary.avgComposite}`}
          sub={`of ${PILLAR_MAX} · Phase 1 · normalized for N/A pillars`}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Est. ARR at Risk"
          value={summary.arrAtRiskDisplay}
          sub={
            summary.arrUndisclosedCount > 0
              ? "Preventable, tier-weighted · disclosed ARR only²"
              : "Preventable, tier-weighted"
          }
          illustrative
        />
      </div>

      {/* Portfolio trend */}
      <PortfolioTrendWidget firmSlug={firmSlug} companyCount={summary.companyCount} />

      {/* Portfolio forecast (only renders when firm has ≥ 3 real trend periods) */}
      <PortfolioForecastWidget firmSlug={firmSlug} companyCount={summary.companyCount} />

      {/* Tier distribution */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Engagement tier distribution</h2>
          <span className="text-xs text-muted-foreground">by Phase 1 composite (0–{PILLAR_MAX})</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tierCounts.map(({ tier, count }) => (
            <div key={tier.id}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">
                  Tier {tier.id} · {tier.label}
                </span>
                <span className="font-mono text-lg font-semibold" style={{ color: tier.color }}>
                  {count}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / maxTierCount) * 100}%`, backgroundColor: tier.color }}
                />
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                {tier.range[0]}–{tier.range[1]} · {tier.arrRisk}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company grid */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Portfolio companies <span className="text-muted-foreground">· ranked by opportunity</span>
        </h2>
        <span className="text-xs text-muted-foreground">Lowest composite first</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <CompanyCard key={c.id} company={c} firmSlug={firmSlug} />
        ))}
      </div>
      {summary.arrUndisclosedCount > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          ² {summary.arrUndisclosedNames.join(" and ")} ARR is undisclosed and excluded from the Total ARR and Est.
          ARR at Risk figures.
        </p>
      )}

      {/* Legend / scoring model */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">How scoring works</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              8 pillars · scored 0–2
            </div>
            <ul className="mt-2 space-y-1">
              {PILLARS.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-xs text-foreground">
                  <span>{p.name}</span>
                  <span className="font-mono text-muted-foreground">×{p.weight.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pillar score scale</div>
            <ul className="mt-2 space-y-2">
              {["2", "1", "0", "na"].map((k) => {
                const lvl = SCORE_LEVELS[k];
                return (
                  <li key={k} className="flex items-center gap-2 text-xs text-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${lvl.dotClass}`} />
                    <span className="font-mono w-6 text-muted-foreground">{k === "na" ? "N/A" : k}</span>
                    <span>{lvl.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Engagement tiers
            </div>
            <ul className="mt-2 space-y-2">
              {TIERS.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-xs text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="font-mono w-12 text-muted-foreground">
                    {t.range[0]}–{t.range[1]}
                  </span>
                  <span>
                    Tier {t.id} · {t.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Phase 1 scores use external public signals only (LinkedIn, G2/Capterra, job postings, press) and are
          illustrative for this preview. Phase 2 layers in proprietary data (CRM, Gainsight, Gong, product telemetry)
          once INVESQ is engaged, producing a weighted composite (max 19.5).
        </p>
      </div>
    </PortfolioLayout>
  );
}
