import { PageHeader } from "@/components/cs/PageHeader";
import { SectionHeader } from "@/components/cs/SectionHeader";
import { Sparkline } from "@/components/cs/Sparkline";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { retentionTrend, expansionPipeline, playbookImpact, ttvTrend, teamCapacity } from "@/data";

export default function Reports() {
  const retentionMax = Math.max(...retentionTrend.map((p) => p.value));
  const pipelineMax = Math.max(...expansionPipeline.map((p) => p.value));
  const impactMax = Math.max(...playbookImpact.map((p) => p.value));

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="reports-page">
      <PageHeader
        eyebrow="Executive reporting"
        title="Reports"
        subtitle="Quarterly trends across retention, expansion, time-to-value, and playbook impact."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Net retention rate" subtitle="12-week trend">
          <div className="flex items-end justify-between mb-2">
            <p className="text-3xl font-bold text-emerald-300">{retentionTrend.at(-1)?.value}%</p>
            <p className="text-xs text-slate-500">range {Math.min(...retentionTrend.map(p => p.value))}–{retentionMax}%</p>
          </div>
          <div className="text-emerald-400">
            <Sparkline values={retentionTrend.map((p) => p.value)} height={80} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-500">
            {retentionTrend.filter((_, i) => i % 2 === 0).map((p) => <span key={p.label}>{p.label}</span>)}
          </div>
        </Card>

        <Card title="Expansion pipeline" subtitle="Stage funnel · last 90 days">
          <div className="space-y-2.5">
            {expansionPipeline.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{s.label}</span>
                  <span className="text-slate-400">{s.value}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                    style={{ width: `${(s.value / pipelineMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Playbook impact ($k ARR)" subtitle="Saved or expanded by playbook · last 90 days">
          <div className="space-y-2.5">
            {playbookImpact.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{p.label}</span>
                  <span className="text-slate-400">${p.value}k</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-400"
                    style={{ width: `${(p.value / impactMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Time-to-value (days)" subtitle="Quarterly median">
          <div className="flex items-end justify-between mb-2">
            <p className="text-3xl font-bold text-cyan-300">{ttvTrend.at(-1)?.value}d</p>
            <Badge variant="outline" className="text-emerald-300 border-emerald-400/30">−45% YoY</Badge>
          </div>
          <div className="text-cyan-300">
            <Sparkline values={ttvTrend.map((p) => p.value)} height={80} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-500">
            {ttvTrend.map((p) => <span key={p.label}>{p.label}</span>)}
          </div>
        </Card>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 mt-6">
        <SectionHeader title="Team capacity" subtitle="Workload distribution" />
        <div className="space-y-2">
          {teamCapacity.map((t) => (
            <div key={t.name} className="flex items-center gap-4">
              <div className="w-44 shrink-0">
                <p className="text-sm text-white">{t.name}</p>
                <p className="text-[11px] text-slate-500">{t.role}</p>
              </div>
              <div className="flex-1">
                <Progress value={t.capacity} className="h-2" />
              </div>
              <div className="w-24 text-right text-xs text-slate-400">{t.accounts} accounts · {t.capacity}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}
