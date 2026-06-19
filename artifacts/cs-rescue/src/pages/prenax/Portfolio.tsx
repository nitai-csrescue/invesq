import { Link } from "wouter";
import { prenaxCustomers, healthDistribution, segmentation, heatmap, heatmapDimensions, riskTrends, formatCurrency, HealthBand } from "@/data/prenax";
import { PrenaxLayout } from "@/components/prenax/PrenaxLayout";
import { Card, HealthBadge } from "@/components/prenax/PrenaxComponents";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Cell, Legend } from "recharts";

export default function PrenaxPortfolio() {
  const getBandColor = (band: HealthBand) => {
    switch(band) {
      case 'green': return '#10b981';
      case 'amber': return '#f59e0b';
      case 'red': return '#f43f5e';
      default: return '#64748b';
    }
  };

  const getBandBgClass = (band: HealthBand) => {
    switch(band) {
      case 'green': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'amber': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'red': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  const riskData = riskTrends.periods.map((p, i) => ({
    name: p,
    health: riskTrends.health[i],
    risk: riskTrends.renewalRisk[i],
    adoption: riskTrends.adoption[i],
  }));

  return (
    <PrenaxLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Customer Portfolio</h1>
        <p className="text-slate-400 mt-2">Comprehensive health distribution and dimensional heat map.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 lg:col-span-1 flex flex-col justify-center">
          <h3 className="text-sm font-medium text-slate-400 mb-6">ARR by Health Band</h3>
          <div className="space-y-4">
            {healthDistribution.map((h) => (
              <div key={h.band}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: getBandColor(h.band) }}></span>
                    {h.label}
                  </span>
                  <span className="font-medium text-white">{formatCurrency(h.arr)}</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${(h.arr / healthDistribution.reduce((a,b)=>a+b.arr,0)) * 100}%`,
                      backgroundColor: getBandColor(h.band)
                    }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{h.count} customers</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-400 mb-6">Health by Segment</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentation.bySegment} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="key" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} width={80} />
                <Tooltip 
                  cursor={{fill: '#ffffff0a'}}
                  contentStyle={{ backgroundColor: '#0f1526', borderColor: '#1e293b', color: '#f1f5f9' }}
                  formatter={(val: number) => [val, 'Count']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                <Bar dataKey="green" name="Healthy" stackId="a" fill="#10b981" radius={[0,0,0,0]} barSize={20} />
                <Bar dataKey="amber" name="Watch" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                <Bar dataKey="red" name="At Risk" stackId="a" fill="#f43f5e" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-medium text-white">Dimensional Heat Map</h2>
          <p className="text-sm text-slate-400 mt-1">Identify systemic risks across all 6 health vectors.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#131b2f] text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium w-64">Customer</th>
                <th className="px-4 py-4 font-medium text-center w-24">Overall</th>
                {heatmapDimensions.map(d => (
                  <th key={d.key} className="px-4 py-4 font-medium text-center w-24">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {prenaxCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-3">
                    <Link href={`/prenax/customers/${c.id}`} className="font-medium text-white group-hover:text-indigo-400 transition-colors block truncate">
                      {c.name}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">{formatCurrency(c.arr)} ARR</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`inline-flex w-10 h-10 items-center justify-center rounded-md font-medium ${getBandBgClass(c.overallBand)}`}>
                      {c.overallScore}
                    </div>
                  </td>
                  {heatmap.find(h => h.id === c.id)?.cells.map(cell => (
                    <td key={cell.key} className="px-4 py-3 text-center">
                       <div className={`inline-flex w-10 h-10 items-center justify-center rounded-md font-medium text-xs opacity-90 ${getBandBgClass(cell.band)}`}>
                        {cell.score}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-medium text-white">Risk Trends</h2>
          <p className="text-sm text-slate-400 mt-1 mb-6">Portfolio health, renewal risk, and adoption across the trailing {riskTrends.periods.length} periods.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1526', borderColor: '#1e293b', color: '#f1f5f9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="health" name="Portfolio Health" stroke="#818cf8" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="risk" name="Renewal Risk" stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="adoption" name="Adoption" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-1">
          <h3 className="text-sm font-medium text-slate-400 mb-6">Health by Region</h3>
          <div className="space-y-5">
            {segmentation.byRegion.map((r) => {
              const total = r.count || 1;
              return (
                <div key={r.key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300">{r.key}</span>
                    <span className="font-medium text-white">{r.avgHealth}</span>
                  </div>
                  <div className="flex w-full h-2 rounded-full overflow-hidden bg-slate-800/50">
                    <div style={{ width: `${(r.green / total) * 100}%`, backgroundColor: '#10b981' }} />
                    <div style={{ width: `${(r.amber / total) * 100}%`, backgroundColor: '#f59e0b' }} />
                    <div style={{ width: `${(r.red / total) * 100}%`, backgroundColor: '#f43f5e' }} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{r.count} customers · {formatCurrency(r.arr)} ARR</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PrenaxLayout>
  );
}
