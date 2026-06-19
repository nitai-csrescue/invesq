import { useState } from "react";
import { Link, useParams } from "wouter";
import { getCustomer, ScoreDetail, formatCurrency, PERIOD_LABELS } from "@/data/prenax";
import { PrenaxLayout } from "@/components/prenax/PrenaxLayout";
import { Card, HealthBadge, ScoreRing, MiniSparkline, DeltaIndicator } from "@/components/prenax/PrenaxComponents";
import { ArrowLeft, Building2, MapPin, User, Users, Calendar, Banknote, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

function DimensionCard({ scoreDetail }: { scoreDetail: ScoreDetail }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOverall = scoreDetail.key === 'overall';
  const trendColor = scoreDetail.band === 'green' ? '#34d399' : scoreDetail.band === 'amber' ? '#fbbf24' : '#fb7185';
  const trendData = scoreDetail.trend.map((v, i) => ({ name: PERIOD_LABELS[i] ?? `P${i + 1}`, score: v }));

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : ''}`}>
      <div 
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${scoreDetail.label}, score ${scoreDetail.score} of 100, ${isExpanded ? 'collapse' : 'expand'} details`}
        className="p-5 cursor-pointer hover:bg-white/[0.02] flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/60"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded((v) => !v); } }}
      >
        <div className="flex items-center gap-5">
          <ScoreRing score={scoreDetail.score} band={scoreDetail.band} size={56} strokeWidth={5} />
          <div>
            <h3 className={`font-medium ${isOverall ? 'text-lg text-white' : 'text-base text-slate-200'}`}>
              {scoreDetail.label}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm">
              <HealthBadge band={scoreDetail.band} />
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Trend:</span>
                <DeltaIndicator delta={scoreDetail.delta} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:block w-24 opacity-60">
             <MiniSparkline 
                data={scoreDetail.trend} 
                color={scoreDetail.band === 'green' ? '#34d399' : scoreDetail.band === 'amber' ? '#fbbf24' : '#fb7185'} 
              />
          </div>
          <span aria-hidden="true" className="text-slate-500 p-2 rounded-full transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-800/60 bg-[#0a0f1c]/50"
          >
            <div className="p-6">
              <div className="mb-8">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Historical Trend</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f1526', borderColor: '#1e293b', color: '#f1f5f9' }} />
                      <Line type="monotone" dataKey="score" name={scoreDetail.label} stroke={trendColor} strokeWidth={2.5} dot={{ fill: '#0f1526', stroke: trendColor, strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Driver Analysis</h4>
                <div className="space-y-4">
                  {scoreDetail.drivers.map((driver, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 ${driver.impact > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {driver.impact > 0 ? <CheckCircle2 className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200">{driver.label}</span>
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 ${driver.impact > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {driver.impact > 0 ? '+' : ''}{driver.impact}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{driver.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Recommended Actions</h4>
                <div className="space-y-3">
                  {scoreDetail.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                      <AlertCircle className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300">{action}</p>
                    </div>
                  ))}
                  {scoreDetail.actions.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No critical actions required at this time.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function PrenaxCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const customer = getCustomer(id ?? "");

  if (!customer) {
    return (
      <PrenaxLayout>
        <div className="py-20 text-center">
          <p className="text-slate-400 mb-4">Customer not found.</p>
          <Link href="/prenax/portfolio" className="text-indigo-400 hover:text-indigo-300 transition-colors">&larr; Back to portfolio</Link>
        </div>
      </PrenaxLayout>
    );
  }

  const overallScore = customer.scores.find(s => s.key === 'overall')!;
  const dimensions = customer.scores.filter(s => s.key !== 'overall');

  return (
    <PrenaxLayout>
      <div className="mb-6">
        <Link href="/prenax/portfolio" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portfolio
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold text-white tracking-tight">{customer.name}</h1>
              <HealthBadge band={customer.overallBand} className="ml-2" />
            </div>
            <p className="text-slate-400 max-w-3xl leading-relaxed">{customer.summary}</p>
          </div>
          
          <div className="flex-shrink-0 bg-[#0f1526] border border-slate-800 rounded-lg p-4 flex items-center gap-6 shadow-sm">
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">ARR</div>
              <div className="text-xl font-medium text-white">{formatCurrency(customer.arr)}</div>
            </div>
            <div className="w-px h-10 bg-slate-800"></div>
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">NPS</div>
              <div className="text-xl font-medium text-white">{customer.nps}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-800/50 rounded text-slate-400"><Building2 className="w-4 h-4" /></div>
          <div>
            <div className="text-xs text-slate-500">Industry / Segment</div>
            <div className="text-sm font-medium text-slate-200">{customer.industry} • {customer.segment}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-800/50 rounded text-slate-400"><MapPin className="w-4 h-4" /></div>
          <div>
            <div className="text-xs text-slate-500">Region</div>
            <div className="text-sm font-medium text-slate-200">{customer.region}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-800/50 rounded text-slate-400"><User className="w-4 h-4" /></div>
          <div>
            <div className="text-xs text-slate-500">Executive Sponsor</div>
            <div className="text-sm font-medium text-slate-200">{customer.executiveSponsor}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-800/50 rounded text-slate-400"><Calendar className="w-4 h-4" /></div>
          <div>
            <div className="text-xs text-slate-500">Renewal Date</div>
            <div className="text-sm font-medium text-slate-200">{new Date(customer.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({customer.tenureMonths} mo tenure)</div>
          </div>
        </Card>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-medium text-white mb-6">Composite Health</h2>
        <DimensionCard scoreDetail={overallScore} />
      </div>

      <div>
        <h2 className="text-xl font-medium text-white mb-6">Health Dimensions</h2>
        <div className="space-y-4">
          {dimensions.map((dim) => (
            <DimensionCard key={dim.key} scoreDetail={dim} />
          ))}
        </div>
      </div>

    </PrenaxLayout>
  );
}
