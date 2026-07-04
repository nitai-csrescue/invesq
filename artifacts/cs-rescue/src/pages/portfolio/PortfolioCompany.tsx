import { useState, useEffect, type ReactNode } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  CalendarClock,
  TrendingDown,
  FileText,
  Info,
  Plug,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { PortfolioLayout, ConfidenceBadge } from "@/components/portfolio/PortfolioLayout";
import { RavigaShell } from "@/components/portfolio/RavigaShell";
import {
  getFirm,
  getFirmCompany,
  getFirmCompanies,
  gapTitle,
  PILLARS,
  scoreLevel,
  formatDate,
  PILLAR_MAX,
  AS_OF_DATE,
  computeCompanyForecast,
  computeCompanyArrForecast,
  FORECAST_ACTIONS,
  formatCurrencyCompact,
  type Company,
  type Firm,
  type AssessmentPoint,
  type ArrForecastPoint,
  type ArrTooltipData,
} from "@/data/portfolio";

function Meta({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary/70" />
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xs font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function CompositeRing({ company }: { company: Company }) {
  const pct = company.composite / company.displayMax;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={company.tier.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold text-foreground">{company.composite}</span>
        <span className="text-[10px] text-muted-foreground">of {company.displayMax}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assessment-driven trend chart
// ---------------------------------------------------------------------------

function periodLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
}

function futureLabel(baseIso: string, quartersAhead: number): string {
  const d = new Date(baseIso + "T00:00:00");
  d.setDate(d.getDate() + quartersAhead * 91);
  const iso = d.toISOString().slice(0, 10);
  return periodLabel(iso);
}

function buildTrendChartData(
  points: AssessmentPoint[],
  tierColor: string,
): { data: { period: string; actual: number | null; projected: number | null }[]; needsProjection: boolean } {
  const needsProjection = points.length < 3;
  const lastPt = points[points.length - 1];
  const lastNorm = lastPt.normalizedComposite;
  const lastIso = lastPt.date;

  // Real assessment points — also set `projected` on the last point so the
  // two Recharts Lines share that coordinate and visually connect.
  const data: { period: string; actual: number | null; projected: number | null }[] = points.map((p, i) => ({
    period: periodLabel(p.date),
    actual: p.normalizedComposite,
    projected: i === points.length - 1 && needsProjection ? p.normalizedComposite : null,
  }));

  if (needsProjection) {
    data.push(
      {
        period: futureLabel(lastIso, 1),
        actual: null,
        projected: Math.min(PILLAR_MAX, Math.round((lastNorm + 0.75) * 10) / 10),
      },
      {
        period: futureLabel(lastIso, 2),
        actual: null,
        projected: Math.min(PILLAR_MAX, Math.round((lastNorm + 1.5) * 10) / 10),
      },
    );
  }

  return { data, needsProjection };
}

function TrendChart({ company }: { company: Company }) {
  const { data, needsProjection } = buildTrendChartData(
    company.assessmentPoints,
    company.tier.color,
  );
  const count = company.assessmentPoints.length;

  return (
    <div>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
          <YAxis domain={[0, PILLAR_MAX]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number, name: string) => [
              value.toFixed(1),
              name === "actual" ? "Actual (normalized)" : "Illustrative projection",
            ]}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={company.tier.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: company.tier.color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          {needsProjection && (
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: "#6b7280", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          )}
          {(company.actionsLog ?? []).map((entry) => (
            <ReferenceLine
              key={entry.date}
              x={periodLabel(entry.date)}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ backgroundColor: company.tier.color }} />
          <span>
            Actual ({count} {count === 1 ? "assessment" : "assessments"})
          </span>
        </div>
        {needsProjection && (
          <div className="flex items-center gap-1.5">
            <svg width="20" height="4" className="shrink-0">
              <line x1="0" y1="2" x2="20" y2="2" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="5 4" />
            </svg>
            <span>Illustrative projection</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers for View B ARR overlay (Raviga sandbox A/B feature)
// ---------------------------------------------------------------------------

function ArrInfoPopover({ data }: { data: ArrTooltipData }) {
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
        <div className="absolute bottom-full left-0 z-50 mb-2 w-60 rounded-lg border border-border bg-popover p-3 shadow-lg">
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

function formatArrTick(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(v / 1_000)}K`;
}

function ArrChartTooltipContent({
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
              <span className="font-medium">{formatArrTick(p.value)}</span>
            </div>
            {tip && (
              <div className="ml-4 mt-0.5 space-y-0.5 text-[10px] text-muted-foreground">
                <div>{tip.tierMovement}</div>
                <div>{tip.benchmarkPct}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
        className={`fixed bottom-0 right-0 z-50 flex flex-col overflow-hidden border-border bg-background transition-transform duration-300 h-[88vh] w-full rounded-t-xl border-t sm:top-0 sm:h-full sm:w-[480px] sm:rounded-none sm:border-l sm:border-t-0 ${
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
// Pillar methodology drawer — raviga only; surfaces measures/signals/PE value
// ---------------------------------------------------------------------------

function PillarMethodologyDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        <Info className="h-3.5 w-3.5" /> Methodology
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Pillar methodology">
        <div className="space-y-5">
          {PILLARS.map((p) => (
            <div key={p.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{p.name}</span>
                <span className="font-mono text-xs text-muted-foreground">×{p.weight.toFixed(2)}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.measures}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>
                  <span className="text-foreground/70">Signals: </span>
                  {p.signals}
                </div>
                <div>
                  <span className="text-foreground/70">PE value: </span>
                  {p.peValue}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Forecast section — interactive 6-month outlook shown when ≥ 2 real data pts
// ---------------------------------------------------------------------------

function ForecastSection({ company, firmSlug }: { company: Company; firmSlug: string }) {
  const [selectedAction, setSelectedAction] = useState("none");
  const [viewB, setViewB] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const isRaviga = firmSlug === "raviga";
  const forecastPts = computeCompanyForecast(company.assessmentPoints);
  if (forecastPts.length === 0) return null;

  const action = FORECAST_ACTIONS.find((a) => a.id === selectedAction);

  // ── Composite forecast chart data (View A — always shown) ──────────────
  type Row = { period: string; actual: number | null; baseline: number | null; upside: number | null };

  const chartData: Row[] = [
    ...company.assessmentPoints.map((p, i) => ({
      period: periodLabel(p.date),
      actual: p.normalizedComposite,
      baseline: i === company.assessmentPoints.length - 1 ? p.normalizedComposite : null,
      upside: i === company.assessmentPoints.length - 1 && action != null ? p.normalizedComposite : null,
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

  const actionMarkers = (company.actionsLog ?? []).map((entry) => ({
    period: periodLabel(entry.date),
    label: entry.label,
    date: entry.date,
  }));

  // ── ARR forecast (View B — Raviga only) ────────────────────────────────
  const arrForecastPts: ArrForecastPoint[] =
    isRaviga && viewB ? computeCompanyArrForecast(company, forecastPts, action) : [];

  const arrMidCurrent = company.arrForRollup
    ? (company.arrForRollup[0] + company.arrForRollup[1]) / 2
    : 0;
  const lastPeriod = periodLabel(
    company.assessmentPoints[company.assessmentPoints.length - 1].date,
  );

  type ArrRow = {
    period: string;
    baselineArrMid: number | null;
    upsideArrMid: number | null;
    baselineTooltip?: ArrTooltipData;
    upsideTooltip?: ArrTooltipData;
  };

  const arrChartData: ArrRow[] =
    arrForecastPts.length > 0
      ? [
          {
            period: lastPeriod,
            baselineArrMid: arrMidCurrent,
            upsideArrMid: action != null ? arrMidCurrent : null,
          },
          ...arrForecastPts.map((pt) => ({
            period: pt.period,
            baselineArrMid: pt.baselineArrMid,
            upsideArrMid: pt.upsideArrMid,
            baselineTooltip: pt.baselineTooltip,
            upsideTooltip: pt.upsideTooltip ?? undefined,
          })),
        ]
      : [];

  const endArrPt = arrForecastPts.length > 0 ? arrForecastPts[arrForecastPts.length - 1] : null;
  const arrYValues = arrChartData.flatMap((d) =>
    [d.baselineArrMid, d.upsideArrMid].filter((v): v is number => v != null),
  );
  const arrYMin = arrYValues.length > 0 ? Math.floor(Math.min(...arrYValues) * 0.96) : 0;
  const arrYMax = arrYValues.length > 0 ? Math.ceil(Math.max(...arrYValues) * 1.04) : 1;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Forecast</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {company.assessmentPoints.length} real data points · linear trend extrapolation · 6-month outlook
          </p>
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
                  className={`px-2.5 py-1 text-xs transition-colors ${
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
                  className={`border-l border-border px-2.5 py-1 text-xs transition-colors ${
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
          <span className="text-xs text-muted-foreground">Model action:</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            <option value="none">None — baseline only</option>
            {FORECAST_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Composite forecast chart ─────────────────────────────────────── */}
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis domain={[0, PILLAR_MAX]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(value: number, name: string) => [
                value.toFixed(1),
                name === "actual"
                  ? "Actual (normalized)"
                  : name === "baseline"
                    ? "Projected — baseline"
                    : "Modeled upside",
              ]}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={company.tier.color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: company.tier.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={{ r: 2.5, fill: "#6b7280", strokeWidth: 0 }}
              connectNulls={false}
            />
            {action != null && (
              <Line
                type="monotone"
                dataKey="upside"
                stroke="#818cf8"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={{ r: 2.5, fill: "#818cf8", strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
            {actionMarkers.map((m) => (
              <ReferenceLine
                key={m.date}
                x={m.period}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: "⚑", position: "top", fontSize: 11, fill: "#f59e0b" }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Composite legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ backgroundColor: company.tier.color }} />
          <span>Actual ({company.assessmentPoints.length} assessments)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="4" className="shrink-0">
            <line x1="0" y1="2" x2="20" y2="2" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="5 4" />
          </svg>
          <span>Projected — trend continuation</span>
        </div>
        {action != null && (
          <div className="flex items-center gap-1.5">
            <svg width="20" height="4" className="shrink-0">
              <line x1="0" y1="2" x2="20" y2="2" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="6 3" />
            </svg>
            <span>Modeled upside — {action.label}</span>
          </div>
        )}
      </div>

      {/* Actions log annotation key */}
      {actionMarkers.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {actionMarkers.map((m) => (
            <div key={m.date} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className="text-amber-400">⚑</span>
              <span>
                <span className="text-foreground">{m.period}</span> — {m.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── View B: ARR Outlook panel ─────────────────────────────────────── */}
      {isRaviga && viewB && arrForecastPts.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-xs font-semibold text-foreground">ARR Outlook</h3>
            <span className="text-[10px] text-muted-foreground">
              projected company ARR · 6-month window · tier-benchmark model · illustrative only
            </span>
          </div>

          <div className="mt-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={arrChartData} margin={{ top: 8, right: 12, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="period"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={[arrYMin, arrYMax]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatArrTick}
                  width={56}
                />
                <Tooltip content={<ArrChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="baselineArrMid"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: "#6b7280", strokeWidth: 0 }}
                  connectNulls
                />
                {action != null && (
                  <Line
                    type="monotone"
                    dataKey="upsideArrMid"
                    stroke="#818cf8"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    dot={{ r: 3, fill: "#818cf8", strokeWidth: 0 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ARR chart legend */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <svg width="20" height="4" className="shrink-0">
                <line x1="0" y1="2" x2="20" y2="2" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="5 4" />
              </svg>
              <span>Baseline ARR</span>
            </div>
            {action != null && (
              <div className="flex items-center gap-1.5">
                <svg width="20" height="4" className="shrink-0">
                  <line x1="0" y1="2" x2="20" y2="2" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="6 3" />
                </svg>
                <span>Upside ARR — {action.label}</span>
              </div>
            )}
          </div>

          {/* End-of-period summary with info popovers */}
          {endArrPt && (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground">Baseline at 6 mo:</span>
                <span className="ml-1 font-medium text-foreground">
                  {formatCurrencyCompact(endArrPt.baselineArrMid)}
                </span>
                <ArrInfoPopover data={endArrPt.baselineTooltip} />
              </div>
              {action != null && endArrPt.upsideArrMid != null && (
                <div className="flex items-center text-xs">
                  <span className="text-muted-foreground">Upside at 6 mo:</span>
                  <span className="ml-1 font-medium text-indigo-400">
                    {formatCurrencyCompact(endArrPt.upsideArrMid)}
                  </span>
                  <ArrInfoPopover data={endArrPt.upsideTooltip!} />
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-[10px] italic text-amber-300/70">
            Modeled ARR uplift is an illustrative benchmark, not a guarantee — actual results vary by company.
          </p>
        </div>
      )}

      {/* Composite forecast disclaimer */}
      {isRaviga ? (
        <>
          <button
            type="button"
            onClick={() => setDisclaimerOpen(true)}
            className="mt-3 inline-flex items-center gap-1 border-t border-border pt-2 text-[10px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            <Info className="h-3 w-3" /> Methodology &amp; disclaimer
          </button>
          <Drawer
            open={disclaimerOpen}
            onClose={() => setDisclaimerOpen(false)}
            title="Forecast methodology"
          >
            <div className="space-y-5 text-sm">
              <div>
                <h3 className="font-semibold text-foreground">Composite forecast</h3>
                <p className="mt-1.5 text-muted-foreground">
                  Linear regression on real assessment data, extrapolated 6 months forward. Projections are
                  illustrative — actual results depend on execution and market conditions.
                </p>
                {action != null && (
                  <p className="mt-1.5 text-muted-foreground">
                    Modeled upside assumes a linear ramp over {action.rampMonths} months once the selected action
                    is taken.
                  </p>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">ARR uplift benchmarks (View B)</h3>
                <p className="mt-1.5 text-muted-foreground">Tier-based directional benchmarks, annualized:</p>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <span className="w-16 font-mono text-xs text-foreground">T1 → T2</span>
                    <span>+9% ARR</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-16 font-mono text-xs text-foreground">T2 → T3</span>
                    <span>+15% ARR</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-16 font-mono text-xs text-foreground">T3 → T4</span>
                    <span>+20% ARR</span>
                  </li>
                </ul>
                <p className="mt-2 text-muted-foreground">
                  When composite progress doesn't cross a tier boundary, half the next band's rate applies.
                  Phased in linearly over 6 months.
                </p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/80">
                Modeled ARR uplift is an illustrative benchmark, not a guarantee. Actual results vary by company
                and execution.
              </div>
            </div>
          </Drawer>
        </>
      ) : (
        <p className="mt-3 border-t border-border pt-2 text-[10px] italic text-muted-foreground/70">
          Forecasts are illustrative projections, not guarantees.
          {action != null &&
            ` Modeled upside assumes a linear ramp over ${action.rampMonths} months once the selected action is taken.`}
        </p>
      )}
    </div>
  );
}

const PHASE2_CONNECTORS = [
  { label: "CRM", example: "Salesforce / HubSpot" },
  { label: "CS Platform", example: "Gainsight / Planhat / ChurnZero" },
  { label: "Conversation Intelligence", example: "Gong / Chorus" },
  { label: "Product Telemetry", example: "" },
] as const;

function Phase2Integrations() {
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary/70" />
          <h2 className="text-sm font-semibold text-foreground">Integrations · Phase 2</h2>
        </div>
        <span className="text-xs text-muted-foreground">Activate in a Phase 2 engagement</span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Telemetry connections activate in a Phase 2 engagement — scores upgrade from external signals (max 16) to the
        weighted proprietary model (max 19.5).
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PHASE2_CONNECTORS.map((conn) => (
          <div key={conn.label} className="rounded-lg border border-border bg-background/40 p-4">
            <div className="text-xs font-medium text-foreground">{conn.label}</div>
            {conn.example && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">{conn.example}</div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Not connected</span>
              <button
                disabled
                className="cursor-not-allowed rounded border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyNotFound({ firm }: { firm: Firm }) {
  return (
    <PortfolioLayout firm={firm}>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-lg font-semibold text-foreground">Company not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This portfolio company isn&apos;t in the current rollup.
        </p>
        <Link
          href={`/${firm.slug}/portfolio`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
        >
          <ArrowLeft className="h-4 w-4" /> Back to portfolio
        </Link>
      </div>
    </PortfolioLayout>
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

export default function PortfolioCompany() {
  const [, params] = useRoute("/:firmSlug/portfolio/:companyId");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);

  if (!firm) return <FirmNotFound />;

  const company = params?.companyId ? getFirmCompany(firmSlug, params.companyId) : undefined;
  if (!company) return <CompanyNotFound firm={firm} />;

  const { tier } = company;
  const isRaviga = firmSlug === "raviga";
  const allCompanies = isRaviga ? getFirmCompanies(firmSlug) : [];
  const LayoutShell = (isRaviga ? RavigaShell : PortfolioLayout) as typeof PortfolioLayout;

  return (
    <LayoutShell firm={firm}>
      {isRaviga && allCompanies.length > 1 && (
        <div className="mb-5">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {allCompanies.map((c) => (
              <Link
                key={c.id}
                href={`/${firm.slug}/portfolio/${c.id}`}
                className={`flex-none flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap font-medium transition-colors ${
                  c.id === company.id
                    ? "border-[#2d4a6e] bg-[#2d4a6e] text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.tier.color }}
                />
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      <Link
        href={`/${firm.slug}/portfolio`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Portfolio
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <CompositeRing company={company} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{company.sector}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tier.badgeClass}`}
                >
                  Tier {tier.id} · {tier.label}
                </span>
                <ConfidenceBadge confidence={company.confidence} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-2">
            <Meta icon={Building2} label="ARR" value={company.arrDisplay} />
            <Meta icon={MapPin} label="HQ" value={company.hq} />
            <Meta icon={Users} label="Headcount" value={company.employeesDisplay} />
            <Meta icon={CalendarClock} label="Last assessed" value={formatDate(company.lastDiagnostic)} />
          </div>
        </div>
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">{company.summary}</p>
        {company.insufficientCount > 0 &&
          (isRaviga ? (
            <p
              title={`${company.insufficientCount} pillar${company.insufficientCount > 1 ? "s" : ""} marked Insufficient Data — excluded from composite; tier uses a neutral baseline.`}
              className="mt-3 flex cursor-help items-center gap-1.5 text-[11px] text-amber-300/80"
            >
              <Info className="h-3 w-3 shrink-0" />
              {company.insufficientCount} N/A pillar{company.insufficientCount > 1 ? "s" : ""}
            </p>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-300/90">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {company.insufficientCount} pillar{company.insufficientCount > 1 ? "s" : ""} marked{" "}
              <span className="font-medium">Insufficient Data</span> — excluded from the displayed composite; tier is
              assigned using a neutral baseline.
            </p>
          ))}
      </div>

      {/* Recommendation band */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recommended engagement
          </div>
          <p className="mt-2 text-sm text-foreground">{company.engagement}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">INVESQ signal</div>
          <p className="mt-2 text-sm text-foreground">{company.invesqSignal}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Est. ARR at risk
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold" style={{ color: tier.color }}>
            {company.arrAtRiskDisplay}
          </div>
          <div className="text-[11px] text-amber-600">
            {company.arrAtRiskRange
              ? `Illustrative · ${tier.arrRisk} · typical exposure for this tier`
              : `ARR undisclosed · ${tier.arrRisk} · typical exposure for this tier`}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pillar breakdown */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">8-pillar breakdown</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Each pillar scored 0–2 · weight applied in Phase 2</p>
            </div>
            {isRaviga && <PillarMethodologyDrawer />}
          </div>
          <div className="mt-4 space-y-4">
            {PILLARS.map((p) => {
              const score = company.scores[p.id];
              const lvl = scoreLevel(score);
              const fill = score === null ? 0 : (score / 2) * 100;
              return (
                <div key={p.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                      <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        ×{p.weight.toFixed(2)}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${lvl.textClass}`}>
                      {score === null ? "N/A" : score} · {lvl.label}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full rounded-full ${lvl.barClass} ${score === null ? "opacity-40" : ""}`}
                      style={{ width: `${score === null ? 100 : fill}%` }}
                    />
                  </div>
                  {!isRaviga && (
                    <>
                      <p className="mt-2 text-xs text-muted-foreground">{p.measures}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
                        <span>
                          <span className="text-muted-foreground">Signals:</span> {p.signals}
                        </span>
                        <span>
                          <span className="text-muted-foreground">PE value:</span> {p.peValue}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right rail: gaps + trend */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingDown className="h-4 w-4 text-rose-400" /> Priority gaps
            </h2>
            <div className="mt-3 space-y-3">
              {company.gaps.slice(0, 3).map((g) => (
                <div key={g.pillar.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{gapTitle(company, g)}</span>
                    <span className={`text-[11px] font-medium ${scoreLevel(g.score).textClass}`}>
                      {scoreLevel(g.score).label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{g.note}</p>
                </div>
              ))}
              {company.gaps.length === 0 && (
                <p className="text-xs text-muted-foreground">No material gaps — all pillars are optimized.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Composite trend</h2>
              {company.assessmentPoints.length < 3 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-300/80">
                  <Info className="h-3 w-3" /> Projection illustrative
                </span>
              )}
            </div>
            <div className="mt-3">
              <TrendChart company={company} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {company.assessmentPoints.length === 1
                ? "1 assessment on record — trend builds as diagnostics re-run"
                : company.assessmentPoints.length === 2
                  ? "2 assessments on record — projection shown until 3+ diagnostics exist"
                  : company.assessmentPoints.length >= 6
                    ? `${company.assessmentPoints.length} monthly assessments on record · see Forecast section below`
                    : `${company.assessmentPoints.length} assessments on record`}
            </p>
          </div>
        </div>
      </div>

      {/* Forecast section */}
      <ForecastSection company={company} firmSlug={firmSlug} />

      {/* Phase 2 integrations */}
      <Phase2Integrations />

      {/* Phase footer + CTA */}
      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 1 · unweighted</div>
            <div className="font-mono text-lg font-semibold text-foreground">
              {company.composite} <span className="text-xs text-muted-foreground">/ {company.displayMax}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 2 · weighted</div>
            <div className="font-mono text-lg font-semibold text-foreground">
              {company.weightedComposite}{" "}
              <span className="text-xs text-muted-foreground">/ {company.weightedMax}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/${firm.slug}/portfolio/${company.id}/report`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <FileText className="h-4 w-4" /> View sample diagnostic report
        </Link>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Prepared for {firm.displayName} · as of {formatDate(AS_OF_DATE)} · Design-partner preview
      </p>
    </LayoutShell>
  );
}
