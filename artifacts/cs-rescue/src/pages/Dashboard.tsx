import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Calendar, Sparkles, PlayCircle, RotateCcw } from "lucide-react";
import { startDemoTour, isTourCompleted } from "@/components/cs/DemoTour";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/cs/PageHeader";
import { SectionHeader } from "@/components/cs/SectionHeader";
import { KpiCard } from "@/components/cs/KpiCard";
import { HealthBadge, healthScoreColor } from "@/components/cs/HealthBadge";
import { SourceBadge } from "@/components/cs/SourceBadge";
import { InsightRailCard } from "@/components/cs/InsightRailCard";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import { Sparkline } from "@/components/cs/Sparkline";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersona, PERSONA_CURRENT_USER, type Persona } from "@/lib/persona";
import {
  dashboardKpis,
  atRiskAccounts,
  expansionAccounts,
  accounts,
  actions,
  playbooks,
  insights,
  getAccount,
  getTeamMember,
  teamCapacity,
  type ActionItem,
  type AIInsight,
  type Account,
} from "@/data";

const PERSONA_GREETING: Record<Persona, string> = {
  vp: "Where the book of business stands today",
  cs: "Your accounts and what needs you this week",
  sales: "Where retention and expansion overlap",
  "post-sales": "Onboarding momentum and time-to-value",
  support: "Live escalations and at-risk customers",
  engineering: "System signals across the topology",
  customer: "Outside-in view of how a customer is doing",
};

type SectionKey =
  | "kpis"
  | "atRisk"
  | "expansion"
  | "insights"
  | "actions"
  | "playbooks"
  | "trend"
  | "capacity"
  | "customerSnapshot"
  | "ttvHero";

interface PersonaLayout {
  /** KPI labels in the order they should appear; falls back to all if undefined. */
  kpiLabels?: string[];
  /** Ordered rows of sections. Each row becomes a CSS grid row on desktop. */
  rows: SectionKey[][];
  /** Filters applied to the action queue surface on this dashboard. */
  actionsFilter?: (a: ActionItem) => boolean;
  /** Filters applied to insights rail. */
  insightsFilter?: (i: AIInsight) => boolean;
  /** Filters / weights at-risk accounts. */
  accountsFilter?: (a: Account) => boolean;
  /** Headline above each list. */
  labels?: Partial<Record<SectionKey, { title?: string; subtitle?: string }>>;
}

const ALL_SECTION_LABELS: Record<SectionKey, { title: string; subtitle?: string }> = {
  kpis: { title: "KPIs" },
  atRisk: { title: "At-Risk Accounts" },
  expansion: { title: "Top Expansion Opportunities", subtitle: "Highest-value plays this quarter" },
  insights: { title: "AI Insights", subtitle: "Pre-briefed and ready to act on" },
  actions: { title: "Recommended Actions", subtitle: "Top of the queue" },
  playbooks: { title: "Active Playbooks" },
  trend: { title: "Portfolio health trend", subtitle: "12-week rolling average" },
  capacity: { title: "Team capacity", subtitle: "Workload across the CS org" },
  customerSnapshot: { title: "How are we doing?", subtitle: "Outside-in view of one account" },
  ttvHero: { title: "Time to first value", subtitle: "Median across the last 90 days" },
};

const PERSONA_LAYOUTS: Record<Persona, PersonaLayout> = {
  // VP: portfolio-wide. Full KPI strip, big trend, then risk + expansion + insights, then capacity + playbooks.
  vp: {
    kpiLabels: ["Portfolio Health", "At-Risk ARR", "Expansion Pipeline", "Time to Value", "NRR Impact"],
    rows: [
      ["kpis"],
      ["trend"],
      ["atRisk", "expansion", "insights"],
      ["capacity", "playbooks"],
    ],
    labels: {
      atRisk: { subtitle: "Across the entire book of business" },
    },
  },

  // CSM: their own queue first.
  cs: {
    kpiLabels: ["Portfolio Health", "At-Risk ARR", "NRR Impact"],
    rows: [
      ["kpis"],
      ["actions", "atRisk"],
      ["playbooks", "insights"],
      ["trend"],
    ],
    actionsFilter: (a) => a.ownerId === PERSONA_CURRENT_USER.cs,
    accountsFilter: (a) => a.ownerId === PERSONA_CURRENT_USER.cs,
    labels: {
      actions: { title: "Your queue", subtitle: "Actions assigned to you" },
      atRisk: { title: "Your at-risk accounts", subtitle: "From accounts you own" },
    },
  },

  // AE / Sales: expansion-first.
  sales: {
    kpiLabels: ["Expansion Pipeline", "NRR Impact", "At-Risk ARR"],
    rows: [
      ["kpis"],
      ["expansion", "insights"],
      ["actions", "playbooks"],
    ],
    insightsFilter: (i) => i.kind !== "ttv",
    actionsFilter: (a) => {
      const acct = a.accountId ? getAccount(a.accountId) : null;
      if (acct && acct.expansionPotential > 0) return true;
      const pb = a.playbookId ? playbooks.find((p) => p.id === a.playbookId) : null;
      return pb?.category === "Expansion" || pb?.category === "Renewal";
    },
    labels: {
      expansion: { title: "Expansion pipeline", subtitle: "Where retention meets new ARR" },
      actions: { title: "Expansion plays", subtitle: "Actions tied to growth + renewal" },
      playbooks: { title: "Growth playbooks" },
    },
  },

  // Post-sales / onboarding: TTV first.
  "post-sales": {
    kpiLabels: ["Time to Value", "Portfolio Health", "At-Risk ARR"],
    rows: [
      ["kpis"],
      ["ttvHero", "insights"],
      ["actions", "playbooks"],
    ],
    insightsFilter: (i) => i.kind === "ttv" || i.kind === "risk",
    actionsFilter: (a) => {
      const pb = a.playbookId ? playbooks.find((p) => p.id === a.playbookId) : null;
      return pb?.category === "Onboarding" || pb?.category === "Adoption";
    },
    labels: {
      actions: { title: "Onboarding actions", subtitle: "Drive accounts to first value" },
      playbooks: { title: "Onboarding playbooks" },
    },
  },

  // Support: live escalations.
  support: {
    kpiLabels: ["At-Risk ARR", "Portfolio Health"],
    rows: [
      ["kpis"],
      ["atRisk", "actions"],
      ["insights", "playbooks"],
    ],
    actionsFilter: (a) => {
      const acct = a.accountId ? getAccount(a.accountId) : null;
      return acct ? acct.status === "at-risk" || acct.status === "churning" || acct.status === "watch" : false;
    },
    insightsFilter: (i) => i.kind === "risk",
    labels: {
      actions: { title: "Escalation queue", subtitle: "Tied to at-risk accounts" },
    },
  },

  // Engineering: system view.
  engineering: {
    rows: [
      ["kpis"],
      ["insights", "trend"],
      ["actions", "playbooks"],
    ],
  },

  // Customer: outside-in view of one account only.
  customer: {
    rows: [
      ["customerSnapshot"],
    ],
    labels: {
      customerSnapshot: { title: "Stark Industries — your account", subtitle: "What your CS team sees about you" },
    },
  },
};

const DEFAULT_DEMO_CUSTOMER_ID = "a_stark";

export default function Dashboard() {
  const { persona } = usePersona();
  const layout = PERSONA_LAYOUTS[persona] ?? PERSONA_LAYOUTS.vp;
  const [tourDone, setTourDone] = useState(false);
  const { toast } = useToast();
  const autoLaunchedRef = useRef(false);

  // Reflect localStorage state so the CTA can show "Restart tour" after completion.
  useEffect(() => {
    setTourDone(isTourCompleted());
    const onStorage = () => setTourDone(isTourCompleted());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto-launch the guided tour for first-time visitors. Once the tour has
  // been skipped or finished, the completion flag in localStorage prevents
  // it from ever auto-starting again.
  useEffect(() => {
    if (autoLaunchedRef.current) return;
    if (isTourCompleted()) return;
    autoLaunchedRef.current = true;
    const startTimer = window.setTimeout(() => {
      if (isTourCompleted()) return;
      startDemoTour();
      toast({
        title: "Welcome — taking you on a quick tour",
        description: 'You can replay it anytime from the "Start tour" button.',
      });
    }, 900);
    return () => window.clearTimeout(startTimer);
  }, [toast]);

  const handleStartTour = () => {
    startDemoTour();
    window.setTimeout(() => setTourDone(isTourCompleted()), 200);
  };

  // ---- Derived, persona-filtered datasets ---------------------------------
  const kpis = useMemo(() => {
    if (!layout.kpiLabels) return dashboardKpis;
    const order = layout.kpiLabels;
    return order
      .map((label) => dashboardKpis.find((k) => k.label === label))
      .filter((k): k is typeof dashboardKpis[number] => !!k);
  }, [layout.kpiLabels]);

  const filteredAtRisk = useMemo(() => {
    const base = atRiskAccounts();
    return layout.accountsFilter ? base.filter(layout.accountsFilter) : base;
  }, [layout.accountsFilter]);

  const filteredExpansion = useMemo(() => {
    const base = expansionAccounts();
    return layout.accountsFilter ? base.filter(layout.accountsFilter) : base;
  }, [layout.accountsFilter]);

  const queued = useMemo(() => {
    const base = actions.filter((a) => a.status === "queued");
    const filtered = layout.actionsFilter ? base.filter(layout.actionsFilter) : base;
    return filtered.slice(0, 6);
  }, [layout.actionsFilter]);

  const filteredInsights = useMemo(
    () => (layout.insightsFilter ? insights.filter(layout.insightsFilter) : insights),
    [layout.insightsFilter],
  );

  const activePlaybooks = useMemo(() => {
    const allActive = playbooks.filter((p) => p.status === "active");
    if (persona === "post-sales") {
      return allActive.filter((p) => p.category === "Onboarding" || p.category === "Adoption").slice(0, 4);
    }
    if (persona === "sales") {
      return allActive.filter((p) => p.category === "Expansion" || p.category === "Renewal").slice(0, 4);
    }
    return allActive.slice(0, 4);
  }, [persona]);

  // ---- Section renderers --------------------------------------------------
  function renderSection(key: SectionKey): React.ReactNode {
    const overrides = layout.labels?.[key];
    const title = overrides?.title ?? ALL_SECTION_LABELS[key].title;
    const subtitle = overrides?.subtitle ?? ALL_SECTION_LABELS[key].subtitle;

    switch (key) {
      case "kpis": {
        const kpiCols: Record<number, string> = {
          1: "lg:grid-cols-1",
          2: "lg:grid-cols-2",
          3: "lg:grid-cols-3",
          4: "lg:grid-cols-4",
          5: "lg:grid-cols-5",
        };
        const colClass = kpiCols[Math.min(kpis.length, 5)] ?? "lg:grid-cols-5";
        return (
          <div key="kpis" className={`grid gap-3 grid-cols-2 md:grid-cols-3 ${colClass}`}>
            {kpis.map((k) => (
              <KpiCard key={k.label} {...k} testId={`kpi-${k.label.toLowerCase().replace(/\s+/g, "-")}`} />
            ))}
          </div>
        );
      }

      case "atRisk":
        return (
          <Panel key="atRisk" testId="dashboard-atrisk" tour="atrisk-table">
            <SectionHeader
              title={title}
              subtitle={subtitle ?? `${filteredAtRisk.length} accounts under threshold`}
              viewAllHref="/accounts"
            />
            <div className="space-y-2">
              {filteredAtRisk.length === 0 && (
                <EmptyMsg msg="No at-risk accounts in this slice — nice." />
              )}
              {filteredAtRisk.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/accounts?accountId=${a.id}`}
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
          </Panel>
        );

      case "expansion":
        return (
          <Panel key="expansion" testId="dashboard-expansion">
            <SectionHeader title={title} subtitle={subtitle} viewAllHref="/accounts" />
            <div className="space-y-2">
              {filteredExpansion.length === 0 && <EmptyMsg msg="No expansion plays in your book yet." />}
              {filteredExpansion.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/accounts?accountId=${a.id}`}
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
          </Panel>
        );

      case "insights":
        return (
          <div key="insights" className="space-y-3" data-tour="insight-rail" data-testid="dashboard-insights">
            <SectionHeader title={title} subtitle={subtitle} />
            {filteredInsights.length === 0
              ? <EmptyMsg msg="No insights matched this lens." />
              : filteredInsights.map((ins) => <InsightRailCard key={ins.id} insight={ins} />)}
          </div>
        );

      case "actions":
        return (
          <Panel key="actions" testId="dashboard-actions">
            <SectionHeader title={title} subtitle={subtitle} viewAllHref="/actions" />
            <div className="divide-y divide-white/5">
              {queued.length === 0 && <EmptyMsg msg="No actions in this queue." />}
              {queued.map((a) => {
                const acct = a.accountId ? getAccount(a.accountId) : null;
                const owner = getTeamMember(a.ownerId);
                return (
                  <Link
                    key={a.id}
                    href={`/actions?actionId=${a.id}`}
                    className="block py-3 first:pt-1 hover:bg-white/[0.02] -mx-2 px-2 rounded-md"
                    data-testid={`rec-action-${a.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <SourceBadge source={a.source} />
                          {acct && <span className="text-[11px] text-slate-400">{acct.name}</span>}
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
          </Panel>
        );

      case "playbooks":
        return (
          <Panel key="playbooks" testId="dashboard-playbooks">
            <SectionHeader title={title} viewAllHref="/playbooks" />
            <div className="space-y-2">
              {activePlaybooks.length === 0 && <EmptyMsg msg="No active playbooks for this lens." />}
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
          </Panel>
        );

      case "trend":
        return (
          <Panel key="trend" testId="dashboard-trend">
            <SectionHeader
              title={title}
              subtitle={subtitle}
              right={
                <Link href="/reports" className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
                  Reports <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />
            <div className="text-cyan-300">
              <Sparkline values={dashboardKpis[0].sparkline} height={64} />
            </div>
          </Panel>
        );

      case "capacity":
        return (
          <Panel key="capacity" testId="dashboard-capacity">
            <SectionHeader title={title} subtitle={subtitle} viewAllHref="/reports" />
            <div className="space-y-2">
              {teamCapacity.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <p className="text-xs text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-500">{t.role}</p>
                  </div>
                  <div className="flex-1"><Progress value={t.capacity} className="h-1.5" /></div>
                  <div className="w-16 text-right text-[11px] text-slate-400">{t.capacity}%</div>
                </div>
              ))}
            </div>
          </Panel>
        );

      case "ttvHero": {
        const ttv = dashboardKpis.find((k) => k.label === "Time to Value");
        return (
          <Panel key="ttvHero" testId="dashboard-ttv-hero">
            <SectionHeader title={title} subtitle={subtitle} viewAllHref="/reports" />
            <div className="flex items-end justify-between mb-2">
              <p className="text-4xl font-bold text-cyan-300">{ttv?.value ?? "—"}</p>
              <Badge variant="outline" className="text-emerald-300 border-emerald-400/30">{ttv?.delta}</Badge>
            </div>
            <div className="text-cyan-300"><Sparkline values={ttv?.sparkline ?? []} height={64} /></div>
            <p className="text-[11px] text-slate-500 mt-2">{ttv?.subtitle}</p>
          </Panel>
        );
      }

      case "customerSnapshot": {
        const acct = accounts.find((a) => a.id === DEFAULT_DEMO_CUSTOMER_ID) ?? accounts[0];
        const owner = getTeamMember(acct.ownerId);
        return (
          <Panel key="customerSnapshot" testId="dashboard-customer-snapshot">
            <SectionHeader title={title} subtitle={subtitle} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Stat label="Health" value={`${acct.healthScore}`} tone={healthScoreColor(acct.healthScore)} />
              <Stat label="Active users" value={`${acct.weeklyActiveUsers}`} />
              <Stat
                label="Seat usage"
                value={`${Math.round((acct.seatsActive / acct.seatsLicensed) * 100)}%`}
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 mb-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Health trend (12 wk)</p>
              <div className={healthScoreColor(acct.healthScore)}>
                <Sparkline values={acct.healthTrend} height={48} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">What your team is seeing</p>
                <div className="space-y-1.5">
                  {acct.recentActivity.slice(0, 4).map((ev) => (
                    <div key={ev.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase">{ev.type}</Badge>
                        <span className="text-[10px] text-slate-500">{ev.at}</span>
                      </div>
                      <p className="text-xs text-slate-200">{ev.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Your CSM</p>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 mb-3">
                  <p className="text-sm font-semibold text-white">{owner?.name ?? "—"}</p>
                  <p className="text-[11px] text-slate-400">{owner?.role} · {owner?.region}</p>
                </div>
                {acct.expansionIndicators.length > 0 && (
                  <>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Where we could help more</p>
                    <div className="space-y-1.5">
                      {acct.expansionIndicators.slice(0, 3).map((s, i) => (
                        <div key={i} className="rounded-lg border border-emerald-400/15 bg-emerald-500/5 p-2.5 text-xs text-emerald-100">{s}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Panel>
        );
      }
    }
  }

  function rowClass(row: SectionKey[]): string {
    // KPI/trend/full-width rows are single column.
    if (row.length === 1) return "grid grid-cols-1 gap-6";
    if (row.length === 2) {
      // If actions are paired with something narrower, give actions 2/3 of the width.
      const actionsIdx = row.indexOf("actions");
      const insightsIdx = row.indexOf("insights");
      if (actionsIdx === 0 && insightsIdx < 0) return "grid grid-cols-1 lg:grid-cols-3 gap-6 [&>*:first-child]:lg:col-span-2";
      return "grid grid-cols-1 lg:grid-cols-2 gap-6";
    }
    return "grid grid-cols-1 lg:grid-cols-3 gap-6";
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto" data-testid="dashboard-page" data-persona={persona}>
      <PageHeader
        eyebrow="Command center"
        title="Customer Success Dashboard"
        subtitle={PERSONA_GREETING[persona] ?? PERSONA_GREETING.vp}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100"
              onClick={handleStartTour}
              data-testid="start-tour-btn"
            >
              {tourDone
                ? (<><RotateCcw className="w-3.5 h-3.5" /> Restart tour</>)
                : (<><PlayCircle className="w-3.5 h-3.5" /> Start tour</>)}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Last 30 days
            </Button>
            <Button asChild size="sm" className="gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              <Link href="/platform/ai-copilot"><Sparkles className="w-3.5 h-3.5" /> Open AI Copilot</Link>
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <DashboardInsights />
        {layout.rows.map((row, idx) => (
          <div key={idx} className={rowClass(row)} data-testid={`dashboard-row-${idx}`}>
            {row.map((section) => renderSection(section))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({
  children,
  testId,
  tour,
}: { children: React.ReactNode; testId?: string; tour?: string }) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
      data-testid={testId}
      data-tour={tour}
    >
      {children}
    </div>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return <p className="text-xs text-slate-500 italic py-4 text-center">{msg}</p>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
