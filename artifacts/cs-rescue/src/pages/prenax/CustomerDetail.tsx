import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  AlertTriangle,
  User,
  CalendarClock,
  ClipboardCheck,
} from "lucide-react";
import { PrenaxLayout } from "@/components/prenax/PrenaxLayout";
import { Card, ScoreRing, HealthBadge, DeltaIndicator } from "@/components/prenax/PrenaxComponents";
import {
  getCustomer,
  FEATURED_AT_RISK_ID,
  formatCurrency,
  formatDate,
  type HealthBand,
  type ScoreDriver,
} from "@/data/prenax";

const BAND_BAR: Record<HealthBand, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};
const BAND_TEXT: Record<HealthBand, string> = {
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-rose-400",
};

export default function CustomerDetail() {
  const [, params] = useRoute("/prenax/customers/:id");
  const customer = getCustomer(params?.id ?? FEATURED_AT_RISK_ID);

  if (!customer) {
    return (
      <PrenaxLayout>
        <div className="text-center py-24">
          <p className="text-slate-400">Account not found.</p>
          <Link href="/prenax/portfolio" className="text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
            Back to portfolio
          </Link>
        </div>
      </PrenaxLayout>
    );
  }

  const overall = customer.scores.find((s) => s.key === "overall")!;
  const dimensions = customer.scores.filter((s) => s.key !== "overall");

  // Top 3 risk drivers = most negative driver contributions across all dimensions.
  const topRiskDrivers: (ScoreDriver & { dimension: string })[] = dimensions
    .flatMap((d) => d.drivers.map((dr) => ({ ...dr, dimension: d.label })))
    .filter((d) => d.impact < 0)
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 3);

  const recommendedActions = Array.from(
    new Set([customer.recommendedNextAction, ...overall.actions]),
  ).slice(0, 4);

  return (
    <PrenaxLayout>
      <Link
        href="/prenax/portfolio"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Portfolio
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-slate-200">
            {customer.initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{customer.name}</h1>
              <HealthBadge band={customer.overallBand} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {customer.segment} · {customer.region} · {customer.industry}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Annual Recurring Revenue</div>
          <div className="text-xl font-bold text-white">{formatCurrency(customer.arr)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Composite health */}
        <Card className="p-6 flex flex-col items-center text-center">
          <ScoreRing score={overall.score} band={overall.band} size={132} strokeWidth={11} />
          <div className="mt-4 text-sm font-medium text-slate-400">Customer Health Score</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <DeltaIndicator delta={overall.delta} />
            <span>vs. prior period</span>
          </div>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">{customer.summary}</p>
        </Card>

        {/* Recommended actions + owner + due date */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Recommended Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3 flex items-center gap-3">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs text-slate-500">Owner</div>
                <div className="text-sm font-medium text-white">{customer.nextActionOwner}</div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3 flex items-center gap-3">
              <CalendarClock className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs text-slate-500">Next action due</div>
                <div className="text-sm font-medium text-white">{formatDate(customer.nextActionDue)}</div>
              </div>
            </div>
          </div>
          <ol className="space-y-2.5">
            {recommendedActions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-300">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Top risk drivers */}
      <Card className="mt-5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h2 className="text-base font-semibold text-white">Top Risk Drivers</h2>
        </div>
        {topRiskDrivers.length === 0 ? (
          <p className="text-sm text-slate-500">No material risk drivers — account is healthy across all dimensions.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topRiskDrivers.map((d, i) => (
              <div key={i} className="rounded-lg border border-rose-500/15 bg-rose-500/5 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-rose-400/80">{d.dimension}</div>
                <div className="mt-1.5 text-sm font-semibold text-white">{d.label}</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed">{d.detail}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dimension scores */}
      <Card className="mt-5 p-6">
        <h2 className="text-base font-semibold text-white mb-1">Dimension Scores</h2>
        <p className="text-xs text-slate-500 mb-5">Each dimension is scored 0–100 and weighted into the composite.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {dimensions.map((d) => (
            <div key={d.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{d.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">{d.weight}%</span>
                  <span className={`font-semibold ${BAND_TEXT[d.band]}`}>{d.score}</span>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${BAND_BAR[d.band]}`} style={{ width: `${d.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PrenaxLayout>
  );
}
