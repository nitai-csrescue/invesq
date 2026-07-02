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
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PortfolioLayout, ConfidenceBadge } from "@/components/portfolio/PortfolioLayout";
import {
  getCompany,
  gapTitle,
  PILLARS,
  scoreLevel,
  formatDate,
  PILLAR_MAX,
  AS_OF_DATE,
  FIRM_NAME,
  type Company,
} from "@/data/portfolioRollup";

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

function TrendChart({ company }: { company: Company }) {
  const labels = ["Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26", "Q2 '26"];
  const data = company.trend.map((v, i) => ({ period: labels[i] ?? `P${i + 1}`, composite: v }));
  return (
    <ResponsiveContainer width="100%" height={200}>
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
        />
        <Line
          type="monotone"
          dataKey="composite"
          stroke={company.tier.color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: company.tier.color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function NotFound() {
  return (
    <PortfolioLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-lg font-semibold text-foreground">Company not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">This portfolio company isn&apos;t in the current rollup.</p>
        <Link
          href="/portfolio"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
        >
          <ArrowLeft className="h-4 w-4" /> Back to portfolio
        </Link>
      </div>
    </PortfolioLayout>
  );
}

export default function PortfolioCompany() {
  const [, params] = useRoute("/portfolio/:companyId");
  const company = params?.companyId ? getCompany(params.companyId) : undefined;

  if (!company) return <NotFound />;
  const { tier } = company;

  return (
    <PortfolioLayout>
      <Link
        href="/portfolio"
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
        {company.insufficientCount > 0 && (
          <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-300/90">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {company.insufficientCount} pillar{company.insufficientCount > 1 ? "s" : ""} marked{" "}
            <span className="font-medium">Insufficient Data</span> — excluded from the displayed composite; tier is
            assigned using a neutral baseline.
          </p>
        )}
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
          <div className="text-[11px] text-amber-300/80">
            {company.arrAtRiskRange ? `Illustrative · ${tier.arrRisk}` : `ARR undisclosed · ${tier.arrRisk}`}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pillar breakdown */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">8-pillar breakdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Each pillar scored 0–2 · weight applied in Phase 2</p>
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
                  <p className="mt-2 text-xs text-muted-foreground">{p.measures}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
                    <span>
                      <span className="text-muted-foreground">Signals:</span> {p.signals}
                    </span>
                    <span>
                      <span className="text-muted-foreground">PE value:</span> {p.peValue}
                    </span>
                  </div>
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
              <span className="flex items-center gap-1 text-[10px] text-amber-300/80">
                <Info className="h-3 w-3" /> Illustrative
              </span>
            </div>
            <div className="mt-3">
              <TrendChart company={company} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Placeholder history pending periodic re-runs.
            </p>
          </div>
        </div>
      </div>

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
              {company.weightedComposite} <span className="text-xs text-muted-foreground">/ {company.weightedMax}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/portfolio/${company.id}/report`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <FileText className="h-4 w-4" /> View sample diagnostic report
        </Link>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Prepared for {FIRM_NAME} · as of {formatDate(AS_OF_DATE)} · Design-partner preview
      </p>
    </PortfolioLayout>
  );
}
