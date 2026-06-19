import { Link } from "wouter";
import { portfolioMetrics, prenaxCustomers, formatCurrency, PERIOD_LABELS } from "@/data/prenax";
import { PrenaxLayout } from "@/components/prenax/PrenaxLayout";
import { Card, HealthBadge, MiniSparkline, DeltaIndicator } from "@/components/prenax/PrenaxComponents";
import { Users, TrendingUp, ShieldAlert, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

function MetricCard({ title, value, subValue, icon, trend }: { title: string, value: string | React.ReactNode, subValue?: string | React.ReactNode, icon: React.ReactNode, trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="text-slate-500">{icon}</div>
      </div>
      <div>
        <div className="text-3xl font-light text-white mb-1 flex items-end gap-2">
          {value}
          {trend === 'up' && <ArrowUpRight className="w-5 h-5 text-emerald-500 mb-1" />}
          {trend === 'down' && <ArrowDownRight className="w-5 h-5 text-rose-500 mb-1" />}
        </div>
        {subValue && <div className="text-sm text-slate-500">{subValue}</div>}
      </div>
    </Card>
  );
}

export default function PrenaxExecutiveOverview() {
  const chartData = PERIOD_LABELS.map((label, i) => ({
    name: label,
    health: portfolioMetrics.overallHealthTrend[i]
  }));

  return (
    <PrenaxLayout>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Executive Overview</h1>
          <p className="text-slate-400 mt-2">Portfolio health, risk signals, and expansion opportunities across {portfolioMetrics.customerCount} accounts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard 
          title="Overall Health Score" 
          value={portfolioMetrics.overallHealth} 
          subValue={<><DeltaIndicator delta={portfolioMetrics.overallHealthDelta} /> vs last period</>}
          icon={<Activity className="w-5 h-5" />}
        />
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Health Distribution</h3>
            <div className="text-slate-500"><Users className="w-5 h-5" /></div>
          </div>
          <div className="flex items-end gap-4 h-full pb-1">
            <div className="text-center">
              <div className="text-2xl font-light text-emerald-400">{portfolioMetrics.green}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-amber-400">{portfolioMetrics.amber}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Watch</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-rose-400">{portfolioMetrics.red}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">At Risk</div>
            </div>
          </div>
        </Card>
        <MetricCard 
          title="Renewal Risk Exposure" 
          value={`${portfolioMetrics.renewalRiskPct}%`} 
          subValue={`ARR at risk in next 12mo`}
          icon={<ShieldAlert className="w-5 h-5" />}
          trend={portfolioMetrics.renewalRiskTrend[portfolioMetrics.renewalRiskTrend.length - 1] > portfolioMetrics.renewalRiskTrend[portfolioMetrics.renewalRiskTrend.length - 2] ? 'up' : 'down'}
        />
        <MetricCard 
          title="Expansion Opportunity" 
          value={formatCurrency(portfolioMetrics.expansionOpportunity)} 
          subValue="Qualified upsell whitespace"
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-white">Portfolio Health Trend</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} domain={[50, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f1526', borderColor: '#1e293b', color: '#f1f5f9' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Line type="monotone" dataKey="health" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#0f1526', stroke: '#818cf8', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-white">Engagement KPIs</h2>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Platform Adoption</span>
                <span className="text-white font-medium">{portfolioMetrics.adoptionPct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${portfolioMetrics.adoptionPct}%` }}></div>
              </div>
              <div className="mt-2 h-10">
                <MiniSparkline data={portfolioMetrics.adoptionTrend} color="#818cf8" />
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Aggregate NPS</span>
                <span className="text-white font-medium">{portfolioMetrics.nps}</span>
              </div>
              <div className="mt-2 h-10">
                <MiniSparkline data={portfolioMetrics.npsTrend} color="#34d399" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Critical Accounts</h2>
          <Link href="/prenax/portfolio" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View full portfolio &rarr;</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#131b2f] text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Segment</th>
                <th className="px-6 py-4 font-medium">ARR</th>
                <th className="px-6 py-4 font-medium">Health Score</th>
                <th className="px-6 py-4 font-medium">Trend</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[...prenaxCustomers].sort((a,b) => a.overallScore - b.overallScore).slice(0, 5).map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <Link href={`/prenax/customers/${c.id}`} className="font-medium text-white group-hover:text-indigo-400 transition-colors block">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{c.segment}</td>
                  <td className="px-6 py-4 text-slate-300">{formatCurrency(c.arr)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{c.overallScore}</span>
                      <DeltaIndicator delta={c.overallDelta} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <MiniSparkline 
                      data={c.overallTrend} 
                      color={c.overallBand === 'green' ? '#34d399' : c.overallBand === 'amber' ? '#fbbf24' : '#fb7185'} 
                    />
                  </td>
                  <td className="px-6 py-4">
                    <HealthBadge band={c.overallBand} />
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
