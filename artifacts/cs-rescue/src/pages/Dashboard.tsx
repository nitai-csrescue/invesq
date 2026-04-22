import { Link } from "wouter";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { SectionHeader } from "@/components/cs/SectionHeader";
import { KpiCard } from "@/components/cs/KpiCard";
import { HealthBadge, healthScoreColor } from "@/components/cs/HealthBadge";
import { SourceBadge } from "@/components/cs/SourceBadge";
import { InsightRailCard } from "@/components/cs/InsightRailCard";
import { Sparkline } from "@/components/cs/Sparkline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersona } from "@/lib/persona";
import {
  dashboardKpis,
  atRiskAccounts,
  expansionAccounts,
  actions,
  playbooks,
  insights,
  getAccount,
  getTeamMember,
} from "@/data";

const PERSONA_GREETING: Record<string, string> = {
  vp: "Where the book of business stands today",
  csm: "Your accounts and what needs you this week",
  ae: "Where retention and expansion overlap",
  customer: "Outside-in view of how a customer is doing",
};

export default function Dashboard() {
  const { persona } = usePersona();
  const queued = actions.filter((a) => a.status === "queued").slice(0, 6);
  const activePlaybooks = playbooks.filter((p) => p.status === "active").slice(0, 4);

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="dashboard-page">
      <PageHeader
        eyebrow="Command center"
        title="Customer Success Dashboard"
        subtitle={PERSONA_GREETING[persona] ?? PERSONA_GREETING.vp}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Last 30 days
            </Button>
            <Button asChild size="sm" className="gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              <Link href="/platform/ai-copilot"><Sparkles className="w-3.5 h-3.5" /> Open AI Copilot</Link>
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {dashboardKpis.map((k) => (
          <KpiCard key={k.label} {...k} testId={`kpi-${k.label.toLowerCase().replace(/\s+/g, "-")}`} />
        ))}
      </div>

      {/* Main grid: at-risk + expansion + insights rail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* At-risk */}
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <SectionHeader
              title="At-Risk Accounts"
              subtitle={`${atRiskAccounts().length} accounts under threshold`}
              viewAllHref="/accounts"
            />
            <div className="space-y-2">
              {atRiskAccounts().slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href="/accounts"
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:border-rose-400/30 hover:bg-rose-500/5 transition-colors"
                  data-testid={`atrisk-${a.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {a.segment} · ${(a.arr / 1000).toFixed(0)}k ARR · renews in {a.daysToRenewal}d
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${healthScoreColor(a.healthScore)}`}>{a.healthScore}</p>
                    <HealthBadge status={a.status} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Expansion */}
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <SectionHeader
              title="Top Expansion Opportunities"
              subtitle="Highest-value plays this quarter"
              viewAllHref="/accounts"
            />
            <div className="space-y-2">
              {expansionAccounts().slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href="/accounts"
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:border-emerald-400/30 hover:bg-emerald-500/5 transition-colors"
                  data-testid={`expansion-${a.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {a.segment} · health {a.healthScore}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-300">+${(a.expansionPotential / 1000).toFixed(0)}k</p>
                    <p className="text-[10px] text-slate-500">potential</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Insights rail */}
        <div className="space-y-3">
          <SectionHeader title="AI Insights" subtitle="Pre-briefed and ready to act on" />
          {insights.map((ins) => <InsightRailCard key={ins.id} insight={ins} />)}
        </div>
      </div>

      {/* Recommended actions + Active playbooks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <SectionHeader title="Recommended Actions" subtitle="Top of the queue" viewAllHref="/actions" />
          <div className="divide-y divide-white/5">
            {queued.map((a) => {
              const acct = a.accountId ? getAccount(a.accountId) : null;
              const owner = getTeamMember(a.ownerId);
              return (
                <Link
                  key={a.id}
                  href="/actions"
                  className="block py-3 first:pt-1 hover:bg-white/[0.02] -mx-2 px-2 rounded-md"
                  data-testid={`rec-action-${a.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <SourceBadge source={a.source} />
                        {acct && (
                          <span className="text-[11px] text-slate-400">{acct.name}</span>
                        )}
                      </div>
                      <p className="text-sm text-white">{a.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-slate-400">{owner?.initials}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">due {a.dueDate.slice(5)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <SectionHeader title="Active Playbooks" viewAllHref="/playbooks" />
          <div className="space-y-2">
            {activePlaybooks.map((pb) => (
              <Link
                key={pb.id}
                href="/playbooks"
                className="block rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-cyan-400/30 hover:bg-cyan-500/5"
                data-testid={`active-pb-${pb.id}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-white">{pb.name}</p>
                  <Badge variant="outline" className="text-[10px] uppercase">{pb.category}</Badge>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{pb.objective}</p>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                  <span>{pb.activeAccounts.length} active accounts</span>
                  <span>{pb.runsLast30Days} runs · 30d</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Trend strip */}
      <div className="mt-8 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <SectionHeader title="Portfolio health trend" subtitle="12-week rolling average" right={
          <Link href="/reports" className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
            Reports <ArrowRight className="w-3 h-3" />
          </Link>
        } />
        <div className="text-cyan-300">
          <Sparkline values={dashboardKpis[0].sparkline} height={64} />
        </div>
      </div>
    </div>
  );
}
