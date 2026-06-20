import { Link } from "wouter";
import {
  ShieldAlert,
  Headset,
  Smile,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { PrenaxLayout } from "@/components/prenax/PrenaxLayout";
import { Card, ScoreRing, DeltaIndicator, MiniSparkline, HealthBadge } from "@/components/prenax/PrenaxComponents";
import {
  portfolioMetrics,
  healthDistribution,
  prenaxCustomers,
  formatCurrency,
  formatDate,
  type HealthBand,
} from "@/data/prenax";

const BAND_DOT: Record<HealthBand, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};
const BAND_BAR: Record<HealthBand, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};

function KpiCard({
  icon,
  label,
  value,
  sub,
  trend,
  trendColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  trend?: number[];
  trendColor?: string;
}) {
  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <span className="text-slate-500">{icon}</span>
          {label}
        </div>
        {trend && trendColor && <MiniSparkline data={trend} color={trendColor} />}
      </div>
      <div className="mt-3">
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
    </Card>
  );
}

export default function ExecutiveOverview() {
  const m = portfolioMetrics;
  const total = m.customerCount;
  const pct = (n: number) => Math.round((n / total) * 100);

  const atRisk = [...prenaxCustomers]
    .filter((c) => c.overallBand === "red")
    .sort((a, b) => a.overallScore - b.overallScore);

  return (
    <PrenaxLayout>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Executive Overview</h1>
          <p className="text-slate-400 mt-1">
            Portfolio health diagnostic across {total} customer accounts.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          Salesforce Service Cloud · refreshed weekly
        </span>
      </div>

      {/* Hero: composite score + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card className="p-6 flex items-center gap-6">
          <ScoreRing score={m.overallHealth} band="amber" size={104} strokeWidth={9} />
          <div>
            <div className="text-sm font-medium text-slate-400">Portfolio Health Score</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white tracking-tight">{m.overallHealth}</span>
              <span className="text-slate-500 text-lg">/100</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <DeltaIndicator delta={m.overallHealthDelta} />
              <span>vs. start of period</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-400">Accounts by Health Band</div>
            <div className="text-xs text-slate-500">{total} accounts</div>
          </div>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
            {healthDistribution.map((d) => (
              <div
                key={d.band}
                className={BAND_BAR[d.band]}
                style={{ width: `${pct(d.count)}%` }}
                title={`${d.label}: ${d.count}`}
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            {healthDistribution.map((d) => (
              <div key={d.band} className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${BAND_DOT[d.band]}`} />
                  {d.label}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{pct(d.count)}%</span>
                  <span className="text-xs text-slate-500">{d.count} accounts</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{formatCurrency(d.arr)} ARR</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <KpiCard
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Accounts at Risk"
          value={`${m.accountsAtRisk}`}
          sub={`${formatCurrency(healthDistribution.find((d) => d.band === "red")!.arr)} ARR exposed`}
        />
        <KpiCard
          icon={<Headset className="w-4 h-4" />}
          label="Client Self-Service Rate"
          value={`${m.selfServiceRate}%`}
          sub="Cases resolved without an agent"
          trend={m.selfServiceTrend}
          trendColor="#34d399"
        />
        <KpiCard
          icon={<Smile className="w-4 h-4" />}
          label="Portfolio NPS"
          value={`${m.nps > 0 ? "+" : ""}${m.nps}`}
          sub="Trailing voice-of-customer"
          trend={m.npsTrend.map((v) => v + 50)}
          trendColor="#818cf8"
        />
        <KpiCard
          icon={<CalendarClock className="w-4 h-4" />}
          label="Renewal Risk Exposure"
          value={formatCurrency(m.renewalRiskArr)}
          sub={`${m.renewalRiskPct}% of ARR weighted by risk`}
          trend={m.renewalRiskTrend}
          trendColor="#fb7185"
        />
      </div>

      {/* Accounts at risk */}
      <Card>
        <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Accounts Requiring Attention</h2>
            <p className="text-xs text-slate-500 mt-0.5">At-risk accounts with an owner and a committed next action.</p>
          </div>
          <Link
            href="/prenax/portfolio"
            className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
          >
            Full portfolio <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-slate-800/60">
          {atRisk.map((c) => (
            <Link
              key={c.id}
              href={`/prenax/customers/${c.id}`}
              className="grid grid-cols-12 items-center gap-3 px-6 py-4 hover:bg-slate-900/40 transition-colors"
            >
              <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-slate-300">
                  {c.initials}
                </div>
                <div>
                  <div className="font-medium text-white">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.segment} · {c.region}
                  </div>
                </div>
              </div>
              <div className="col-span-6 sm:col-span-2 flex items-center gap-2">
                <span className="text-lg font-bold text-rose-400">{c.overallScore}</span>
                <HealthBadge band={c.overallBand} />
              </div>
              <div className="col-span-12 sm:col-span-4 text-sm text-slate-400">{c.topRiskDriver}</div>
              <div className="col-span-6 sm:col-span-2 text-right">
                <div className="text-xs text-slate-400">{c.nextActionOwner}</div>
                <div className="text-xs text-slate-500">Due {formatDate(c.nextActionDue)}</div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </PrenaxLayout>
  );
}
