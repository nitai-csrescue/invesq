import { useState, useEffect, type ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { TrendingDown, Building2, Wallet, Gauge, AlertTriangle, ShieldAlert, Info, X, ChevronRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PortfolioLayout, ConfidenceBadge } from "@/components/portfolio/PortfolioLayout";
import { RavigaShell } from "@/components/portfolio/RavigaShell";
import { RavigaCompanyList } from "./RavigaCompanyList";
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
  computePortfolioArrForecast,
  FORECAST_ACTIONS,
  formatCurrencyCompact,
  type Company,
  type Firm,
  type PortfolioTrendPoint,
  type ArrForecastPoint,
  type ArrTooltipData,
} from "@/data/portfolio";

// ---------------------------------------------------------------------------
// Phase 2 connector list — used in quick-look drawer
// ---------------------------------------------------------------------------

const DASH_PHASE2_CONNECTORS = [
  { label: "CRM", example: "Salesforce / HubSpot" },
  { label: "CS Platform", example: "Gainsight / Planhat" },
  { label: "Conversation Intel", example: "Gong / Chorus" },
  { label: "Product Telemetry", example: "" },
] as const;

// ---------------------------------------------------------------------------
// Drawer — slide-in panel (right on desktop, bottom sheet on mobile)
// ---------------------------------------------------------------------------

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed bottom-0 right-0 z-50 flex flex-col overflow-hidden border-border bg-background transition-transform duration-300 h-[88vh] w-full rounded-t-xl border-t sm:top-0 sm:h-full sm:w-[440px] sm:rounded-none sm:border-l sm:border-t-0 ${
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        <div className="flex shrink-0 justify-center py-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Raviga compact card — composite score + ARR as visual heroes
// ---------------------------------------------------------------------------

function RavigaCompanyCard({ company, firmSlug }: { company: Company; firmSlug: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { tier } = company;

  const statusLine = company.topGap
    ? `${gapTitle(company, company.topGap)} · ${scoreLevel(company.topGap.score).label}`
    : "No priority gaps";

  return (
    <>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
        <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: tier.color }} />
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/${firmSlug}/portfolio/${company.id}`}
              className="group/link min-w-0 flex-1"
              aria-label={`Open ${company.name} profile`}
            >
              <h3 className="truncate text-base font-semibold text-foreground transition-colors group-hover/link:text-primary">
                {company.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{company.sector}</p>
            </Link>
            <div className="shrink-0 text-right">
              <div className="font-mono text-5xl font-black leading-none" style={{ color: tier.color }}>
                {company.composite}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">/ {company.displayMax}</div>
            </div>
          </div>

          <div className="mt-3">
            <span
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide"
              style={{
                backgroundColor: `${tier.color}22`,
                color: tier.color,
                border: `1px solid ${tier.color}50`,
              }}
            >
              Tier {tier.id} · {tier.label}
            </span>
          </div>

          <div className="mt-4 flex-1">
            <div className="text-xl font-semibold tabular-nums text-foreground">
              {company.arrDisplay}{" "}
              <span className="text-sm font-normal text-muted-foreground">ARR</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{statusLine}</p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-[11px] text-muted-foreground">{formatDate(company.lastDiagnostic)}</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1 rounded border border-border bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Details <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={company.name}>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
          <div>
            <span
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: `${tier.color}22`,
                color: tier.color,
                border: `1px solid ${tier.color}50`,
              }}
            >
              Tier {tier.id} · {tier.label}
            </span>
            <div className="mt-1.5 text-xs text-muted-foreground">{company.arrDisplay} ARR</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-4xl font-black" style={{ color: tier.color }}>
              {company.composite}
            </div>
            <div className="text-[10px] text-muted-foreground">/ {company.displayMax}</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority gaps</h3>
          {company.gaps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {company.displayMax === 0
                ? "No gaps scored — all pillars returned Insufficient Data in this diagnostic."
                : "No material gaps — all pillars optimized."}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {company.gaps.slice(0, 3).map((g) => (
                <div key={g.pillar.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{gapTitle(company, g)}</span>
                    <span className={`text-xs font-medium ${scoreLevel(g.score).textClass}`}>
                      {scoreLevel(g.score).label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{g.note}</p>
                </div>
              ))}
            </div>
          )}
          {company.scores.leadership === null && company.gapNotes?.leadership && (
            <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">CS Leadership</span>
                <span className={`text-xs font-medium ${scoreLevel(null).textClass}`}>
                  {scoreLevel(null).label}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{company.gapNotes.leadership}</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pillar scores</h3>
          <div className="mt-3 space-y-2">
            {PILLARS.map((p) => {
              const score = company.scores[p.id];
              const lvl = scoreLevel(score);
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${lvl.dotClass}`} />
                  <span className="flex-1 text-sm text-foreground">{p.name}</span>
                  <span className={`text-xs font-medium ${lvl.textClass}`}>
                    {score === null ? "N/A" : `${score} · ${lvl.label}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {(company.actionsLog ?? []).length > 0 && (
          <div className="mt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions log</h3>
            <div className="mt-3 space-y-2">
              {(company.actionsLog ?? []).map((entry) => (
                <div key={entry.date} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatDate(entry.date)}
                  </span>
                  <span className="text-sm text-foreground">{entry.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Phase 2 integrations
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Activate to unlock the weighted model (max 19.5).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DASH_PHASE2_CONNECTORS.map((conn) => (
              <div key={conn.label} className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
                <div className="text-xs font-medium text-foreground">{conn.label}</div>
                {conn.example && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{conn.example}</div>
                )}
                <div className="mt-2 text-[11px] text-muted-foreground">Not connected</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <Link
            href={`/${firmSlug}/portfolio/${company.id}`}
            onClick={() => setDrawerOpen(false)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Full diagnostic profile <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </Drawer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Scoring model drawer — raviga only; full methodology in a slide-in panel
// ---------------------------------------------------------------------------

function ScoringModelDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        <Info className="h-3.5 w-3.5" /> Scoring model
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="How scoring works">
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              8 pillars · scored 0–2
            </h3>
            <ul className="mt-3 space-y-1.5">
              {PILLARS.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-foreground">
                  <span>{p.name}</span>
                  <span className="font-mono text-muted-foreground">×{p.weight.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pillar score scale
            </h3>
            <ul className="mt-3 space-y-2">
              {["2", "1", "0", "na"].map((k) => {
                const lvl = SCORE_LEVELS[k];
                return (
                  <li key={k} className="flex items-center gap-2 text-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${lvl.dotClass}`} />
                    <span className="w-6 font-mono text-muted-foreground">{k === "na" ? "N/A" : k}</span>
                    <span>{lvl.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Engagement tiers
            </h3>
            <ul className="mt-3 space-y-2">
              {TIERS.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="w-12 font-mono text-muted-foreground">
                    {t.range[0]}–{t.range[1]}
                  </span>
                  <span>
                    Tier {t.id} · {t.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
            Phase 1 scores use external public signals only (LinkedIn, G2/Capterra, job postings, press) and are
            illustrative for this preview. Phase 2 layers in proprietary data (CRM, Gainsight, Gong, product
            telemetry) once INVESQ is engaged, producing a weighted composite (max 19.5).
          </div>
        </div>
      </Drawer>
    </>
  );
}

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
// Helpers for View B ARR overlay (Raviga sandbox A/B feature)
// ---------------------------------------------------------------------------

function DashArrInfoPopover({ data }: { data: ArrTooltipData }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 text-muted-foreground/50 hover:text-muted-foreground focus:outline-none"
        aria-label="Show ARR forecast methodology"
      >
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <div className="space-y-1.5 text-[11px]">
            <div>
              <span className="text-muted-foreground">Tier: </span>
              <span className="font-medium text-foreground">{data.tierMovement}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Benchmark: </span>
              <span className="font-medium text-foreground">{data.benchmarkPct}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Action: </span>
              <span className="font-medium text-foreground">{data.actionNote}</span>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function formatDashArrTick(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${Math.round(v / 1_000)}K`;
}

function DashArrChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { baselineTooltip?: ArrTooltipData; upsideTooltip?: ArrTooltipData };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div
      className="rounded-lg border border-border bg-popover p-3 shadow-lg"
      style={{ fontSize: 11, color: "hsl(var(--foreground))" }}
    >
      <div className="mb-1.5 font-medium">{label}</div>
      {payload.map((p) => {
        const isUpside = p.name === "upsideArrMid";
        const tip = isUpside ? row.upsideTooltip : row.baselineTooltip;
        return (
          <div key={p.name} className="mb-1.5 last:mb-0">
            <div className="flex items-center gap-1.5">
              <div
                className="h-0.5 w-3 shrink-0 rounded"
                style={{ backgroundColor: isUpside ? "#818cf8" : "#6b7280" }}
              />
              <span className="text-muted-foreground">{isUpside ? "Upside" : "Baseline"}:</span>
              <span className="font-medium">{formatDashArrTick(p.value)}</span>
            </div>
            {tip && (
              <div className="ml-4 mt-0.5 text-[10px] text-muted-foreground">
                {tip.benchmarkPct}
              </div>
            )}
          </div>
        );
      })}
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
  const [viewB, setViewB] = useState(false);

  const isRaviga = firmSlug === "raviga";
  const realPoints = getPortfolioTrendPoints(firmSlug);
  const forecastPts = computePortfolioForecast(firmSlug);

  if (realPoints.length < 3 || forecastPts.length === 0) return null;

  const action = FORECAST_ACTIONS.find((a) => a.id === selectedAction);

  // ── Composite forecast chart data ──────────────────────────────────────
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

  // ── Portfolio ARR forecast (View B — Raviga only) ──────────────────────
  const arrForecastPts: ArrForecastPoint[] =
    isRaviga && viewB ? computePortfolioArrForecast(firmSlug, action) : [];

  type ArrRow = {
    period: string;
    baselineArrMid: number | null;
    upsideArrMid: number | null;
    baselineTooltip?: ArrTooltipData;
    upsideTooltip?: ArrTooltipData;
  };

  const arrChartData: ArrRow[] = arrForecastPts.map((pt) => ({
    period: pt.period,
    baselineArrMid: pt.baselineArrMid,
    upsideArrMid: pt.upsideArrMid,
    baselineTooltip: pt.baselineTooltip,
    upsideTooltip: pt.upsideTooltip ?? undefined,
  }));

  const endArrPt = arrForecastPts.length > 0 ? arrForecastPts[arrForecastPts.length - 1] : null;
  const arrYValues = arrChartData.flatMap((d) =>
    [d.baselineArrMid, d.upsideArrMid].filter((v): v is number => v != null),
  );
  const arrYMin = arrYValues.length > 0 ? Math.floor(Math.min(...arrYValues) * 0.96) : 0;
  const arrYMax = arrYValues.length > 0 ? Math.ceil(Math.max(...arrYValues) * 1.04) : 1;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold text-foreground">Portfolio forecast</h2>
          <span className="text-[10px] text-muted-foreground">
            avg normalized composite · 0–{PILLAR_MAX} · {companyCount}{" "}
            {companyCount === 1 ? "company" : "companies"} · 6-month outlook
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* A/B toggle — Raviga sandbox only */}
          {isRaviga && (
            <>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-400">
                Sandbox A/B
              </span>
              <div className="flex overflow-hidden rounded border border-border">
                <button
                  type="button"
                  onClick={() => setViewB(false)}
                  className={`px-2 py-1 text-[10px] transition-colors ${
                    !viewB
                      ? "bg-primary/20 font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  View A
                </button>
                <button
                  type="button"
                  onClick={() => setViewB(true)}
                  className={`border-l border-border px-2 py-1 text-[10px] transition-colors ${
                    viewB
                      ? "bg-primary/20 font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  View B
                </button>
              </div>
            </>
          )}
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

      {/* ── Composite forecast chart ─────────────────────────────────── */}
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

      {/* Composite legend */}
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

      {/* ── View B: Portfolio ARR Outlook ──────────────────────────────── */}
      {isRaviga && viewB && arrForecastPts.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-[10px] font-semibold text-foreground">Portfolio ARR Outlook</h3>
            <span className="text-[10px] text-muted-foreground">
              6-month forward · tier-benchmark model · illustrative only
            </span>
          </div>

          {/* Total Portfolio ARR Upside summary */}
          {endArrPt && (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
              <div className="flex items-center text-[11px]">
                <span className="text-muted-foreground">Baseline (6-mo end):</span>
                <span className="ml-1 font-medium text-foreground">
                  {formatCurrencyCompact(endArrPt.baselineArrMid)}
                </span>
                <DashArrInfoPopover data={endArrPt.baselineTooltip} />
              </div>
              {action != null && endArrPt.upsideArrMid != null && (
                <>
                  <div className="flex items-center text-[11px]">
                    <span className="text-muted-foreground">Upside (6-mo end):</span>
                    <span className="ml-1 font-medium text-indigo-400">
                      {formatCurrencyCompact(endArrPt.upsideArrMid)}
                    </span>
                    <DashArrInfoPopover data={endArrPt.upsideTooltip!} />
                  </div>
                  <div className="flex items-center text-[11px]">
                    <span className="text-muted-foreground">Total ARR upside:</span>
                    <span className="ml-1 font-semibold text-indigo-300">
                      +{formatCurrencyCompact(endArrPt.upsideArrMid - endArrPt.baselineArrMid)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Portfolio ARR chart */}
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={arrChartData} margin={{ top: 6, right: 8, left: 16, bottom: 0 }}>
                <XAxis
                  dataKey="period"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[arrYMin, arrYMax]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickCount={3}
                  tickFormatter={formatDashArrTick}
                  width={42}
                />
                <Tooltip content={<DashArrChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="baselineArrMid"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={{ r: 2.5, fill: "#6b7280", strokeWidth: 0 }}
                  connectNulls
                />
                {action != null && (
                  <Line
                    type="monotone"
                    dataKey="upsideArrMid"
                    stroke="#818cf8"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    dot={{ r: 2.5, fill: "#818cf8", strokeWidth: 0 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ARR legend */}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <svg width="16" height="4" className="shrink-0">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
              <span>Baseline ARR</span>
            </div>
            {action != null && (
              <div className="flex items-center gap-1.5">
                <svg width="16" height="4" className="shrink-0">
                  <line x1="0" y1="2" x2="16" y2="2" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="5 3" />
                </svg>
                <span>Upside ARR</span>
              </div>
            )}
          </div>

          <p className="mt-2 text-[10px] italic text-amber-300/70">
            Modeled ARR uplift is an illustrative benchmark, not a guarantee — actual results vary by company.
          </p>
        </div>
      )}

      <p className="mt-2 text-[10px] italic text-muted-foreground/60">
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

  // Raviga: redesigned dark-sidebar shell with light canvas + table layout
  if (firmSlug === "raviga") {
    const attentionCount = companies.filter((c) => c.tier.id <= 2).length;
    const openFindings = companies.reduce((s, c) => s + c.gaps.length, 0);
    const scoredCompanies = companies.filter((c) => c.displayMax > 0);
    const avgNorm =
      scoredCompanies.length > 0
        ? Math.round(
            (scoredCompanies.reduce(
              (s, c) => s + (c.composite / c.displayMax) * PILLAR_MAX,
              0,
            ) /
              scoredCompanies.length) *
              10,
          ) / 10
        : 0;
    return (
      <RavigaShell firm={firm}>
        {/* Page header */}
        <div className="mb-7">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {firm.displayName.toUpperCase()} · FUND III
          </p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground">Portfolio Overview</h1>
            <div className="flex items-center gap-2">
              <Link
                href={`/${firmSlug}/benchmarks`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Benchmarks
              </Link>
              <Link
                href={`/${firmSlug}/findings`}
                className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                View Findings
              </Link>
            </div>
          </div>
        </div>

        {/* KPI summary cards */}
        <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-3xl font-bold text-foreground">{summary.companyCount}</div>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio Companies
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-3xl font-bold text-foreground">{summary.totalArrDisplay}</div>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Combined ARR
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-3xl font-bold text-foreground">
              {avgNorm.toFixed(1)}
              <span className="ml-1 text-base font-normal text-muted-foreground"> / {PILLAR_MAX}</span>
            </div>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Composite
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">higher is better</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div
              className={`text-4xl font-black ${attentionCount > 0 ? "text-amber-600" : "text-emerald-600"}`}
            >
              {attentionCount}
            </div>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Need Attention
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">Tier 1 &amp; 2 companies</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-3xl font-bold text-foreground">{openFindings}</div>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Open Findings
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">across portfolio</div>
          </div>
        </div>

        {/* Portfolio accordion table */}
        <RavigaCompanyList companies={companies} firm={firm} summary={summary} />
      </RavigaShell>
    );
  }

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
        <div className="flex items-center gap-3">
          {firmSlug === "raviga" && <ScoringModelDrawer />}
          <span className="text-xs text-muted-foreground">Lowest composite first</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) =>
          firmSlug === "raviga" ? (
            <RavigaCompanyCard key={c.id} company={c} firmSlug={firmSlug} />
          ) : (
            <CompanyCard key={c.id} company={c} firmSlug={firmSlug} />
          )
        )}
      </div>
      {summary.arrUndisclosedCount > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          ² {summary.arrUndisclosedNames.join(" and ")} ARR is undisclosed and excluded from the Total ARR and Est.
          ARR at Risk figures.
        </p>
      )}

      {/* Legend / scoring model — hidden for raviga (accessible via "Scoring model" drawer) */}
      {firmSlug !== "raviga" && (
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
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pillar score scale
              </div>
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
      )}
    </PortfolioLayout>
  );
}
