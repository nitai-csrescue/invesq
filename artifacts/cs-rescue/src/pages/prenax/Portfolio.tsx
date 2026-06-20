import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { PrenaxLayout } from "@/components/prenax/PrenaxLayout";
import { Card, HealthBadge } from "@/components/prenax/PrenaxComponents";
import {
  prenaxCustomers,
  portfolioMetrics,
  formatCurrency,
  type HealthBand,
} from "@/data/prenax";

const SCORE_COLOR: Record<HealthBand, string> = {
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-rose-400",
};

export default function Portfolio() {
  // Worst-health first so at-risk accounts surface at the top of the board view.
  const rows = [...prenaxCustomers].sort((a, b) => a.overallScore - b.overallScore);
  const m = portfolioMetrics;

  return (
    <PrenaxLayout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio Health</h1>
          <p className="text-slate-400 mt-1">
            Every account scored, owned, and assigned a next action — sorted by risk.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-slate-500 text-xs">Total ARR</div>
            <div className="font-semibold text-white">{formatCurrency(m.totalArr)}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Accounts</div>
            <div className="font-semibold text-white">{m.customerCount}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">At Risk</div>
            <div className="font-semibold text-rose-400">{m.accountsAtRisk}</div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium text-right">ARR</th>
                <th className="px-4 py-3 font-medium text-right">Health</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Top Risk Driver</th>
                <th className="px-4 py-3 font-medium">Recommended Next Action</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((c) => (
                <tr key={c.id} className="group hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/prenax/customers/${c.id}`} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-slate-300">
                        {c.initials}
                      </div>
                      <div>
                        <div className="font-medium text-white group-hover:text-indigo-300 transition-colors">
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-500">{c.industry}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-400">{c.segment}</td>
                  <td className="px-4 py-4 text-slate-400">{c.region}</td>
                  <td className="px-4 py-4 text-right font-medium text-slate-200">{formatCurrency(c.arr)}</td>
                  <td className={`px-4 py-4 text-right text-lg font-bold ${SCORE_COLOR[c.overallBand]}`}>
                    {c.overallScore}
                  </td>
                  <td className="px-4 py-4">
                    <HealthBadge band={c.overallBand} />
                  </td>
                  <td className="px-4 py-4 max-w-[15rem] text-slate-400">{c.topRiskDriver}</td>
                  <td className="px-4 py-4 max-w-[18rem] text-slate-300">{c.recommendedNextAction}</td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/prenax/customers/${c.id}`}
                      className="inline-flex text-slate-600 group-hover:text-indigo-400 transition-colors"
                      aria-label={`Open ${c.name} drilldown`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PrenaxLayout>
  );
}
