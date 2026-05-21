import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Calendar,
  ShieldAlert,
  Activity,
  Network,
  Workflow,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Clock,
  Target,
  Brain,
  ChevronRight,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoMark from "@assets/INVESQ_Favicon_Selected_Version_1778728139835.png";

/* ------------------------------------------------------------------ */
/* Static demo data — single source of truth for the guided walk      */
/* ------------------------------------------------------------------ */

const DEAL = {
  codename: "Project Atlas",
  vertical: "B2B SaaS · Compliance & Workflow Automation",
  fund: "Lean Growth Fund III",
  stage: "Pre-LOI · Operational diligence",
  arr: "$18.0M",
  nrr: "91%",
  grossChurn: "16%",
  ttv: "74 days",
  employees: "168",
  customers: "412",
  riskScore: 7.4,
};

const REVENUE_TREND = [62, 65, 67, 70, 71, 72, 71, 70, 69, 67, 64, 61];

const SYSTEMS = [
  { name: "Salesforce", category: "CRM", status: "Connected", records: "9,400", color: "#00A1E0" },
  { name: "HubSpot", category: "Marketing", status: "Connected", records: "3,200", color: "#FF7A59" },
  { name: "Zendesk", category: "Support", status: "Connected", records: "6,800", color: "#03363D" },
  { name: "Gong", category: "Revenue intel", status: "Connected", records: "2,150", color: "#8B5CF6" },
  { name: "Slack", category: "Communication", status: "Connected", records: "2,400", color: "#E01E5A" },
  { name: "Zoom AI", category: "Meetings", status: "Connected", records: "850", color: "#2D8CFF" },
];

const SYSTEM_KPIS = [
  { label: "Records analyzed", value: "24,800" },
  { label: "Days of activity reviewed", value: "14" },
  { label: "Systems connected", value: "6" },
  { label: "AI ingestion status", value: "Complete" },
];

const RISK_SIGNALS = [
  {
    id: "onboarding",
    title: "Onboarding Friction",
    severity: "Critical",
    severityColor: "from-rose-500/30 to-rose-500/5 border-rose-500/40",
    pillColor: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    icon: Clock,
    evidence: [
      "Median TTV 74 days vs. 32-day target",
      "39% of new accounts miss day-30 activation milestone",
      "Implementation handoff doc missing on 6 of last 10 deals",
    ],
    impact: "TTV drag · 42 days",
    impactValue: "$640K",
    impactLabel: "delayed NRR realization",
    action: "Redesign onboarding milestones with explicit day-15 and day-45 gates.",
  },
  {
    id: "founder",
    title: "Founder Dependency",
    severity: "High",
    severityColor: "from-amber-500/30 to-amber-500/5 border-amber-500/40",
    pillColor: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    icon: Users,
    evidence: [
      "63% of top-50 accounts list the CEO as primary contact",
      "Gong shows founder on 71% of renewal calls > $100K",
      "Executive sponsor absent from 12 of 14 strategic accounts",
    ],
    impact: "Relationship concentration · 63%",
    impactValue: "$4.2M",
    impactLabel: "ARR exposed to key-person risk",
    action: "Stand up named executive sponsors and document playbooks for top-25.",
  },
  {
    id: "expansion",
    title: "Expansion Leakage",
    severity: "High",
    severityColor: "from-violet-500/30 to-violet-500/5 border-violet-500/40",
    pillColor: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
    icon: TrendingUp,
    evidence: [
      "47 expansion-qualified signals fired in last 90 days",
      "Only 12 routed to AE — 35 sit unowned in CS queue",
      "Average time from signal to outreach: 21 days",
    ],
    impact: "Pipeline missed · 35 accounts",
    impactValue: "$1.8M",
    impactLabel: "expansion ARR at risk",
    action: "Auto-route product-qualified signals from CS to AE within 48h.",
  },
  {
    id: "support",
    title: "Support Escalation Risk",
    severity: "Medium",
    severityColor: "from-cyan-500/30 to-cyan-500/5 border-cyan-500/40",
    pillColor: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
    icon: ShieldAlert,
    evidence: [
      "14 escalation clusters detected across top-100",
      "38% rise in P1 tickets among $250K+ ARR accounts",
      "Sentiment delta on last 6 QBRs: -2.3 (10pt scale)",
    ],
    impact: "Renewal cohort affected · 22 accounts",
    impactValue: "$2.6M",
    impactLabel: "renewal ARR under pressure",
    action: "Activate escalation workflow with VP-level review on every P1.",
  },
];

const JOURNEY = [
  { stage: "Sales", kpi: "Win rate 28%", status: "ok", health: 78, icon: Target },
  { stage: "Handoff", kpi: "62% complete docs", status: "risk", health: 42, icon: ChevronRight },
  { stage: "Implementation", kpi: "74-day median TTV", status: "alert", health: 28, icon: Clock },
  { stage: "Adoption", kpi: "DAU/WAU 41%", status: "risk", health: 48, icon: Activity },
  { stage: "Expansion", kpi: "$1.8M unrouted", status: "alert", health: 32, icon: TrendingUp },
  { stage: "Renewal", kpi: "NRR 91%", status: "risk", health: 55, icon: RotateCcw },
];

const JOURNEY_FRICTION = [
  {
    where: "Sales → CS handoff",
    finding: "Account briefs missing on 38% of new logos.",
    cost: "Adds ~9 days to TTV per impacted account.",
  },
  {
    where: "Implementation → Day 30",
    finding: "39% of accounts fail to hit activation milestone.",
    cost: "Pushes first value to ~day 74, eroding goodwill.",
  },
  {
    where: "Adoption → Expansion",
    finding: "47 expansion-qualified signals, 35 unowned.",
    cost: "$1.8M expansion ARR sitting in CS queue.",
  },
  {
    where: "Renewal cohort",
    finding: "22 accounts entered renewal window with open P1s.",
    cost: "$2.6M ARR at heightened churn risk.",
  },
];

const PLAYBOOK = [
  {
    window: "Days 1 – 15",
    title: "Activate escalation workflow",
    owner: "VP Customer Success",
    priority: "P0",
    priorityColor: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    impact: "Protects $2.6M renewal ARR",
    detail: "Stand up a tiered escalation path with VP review on every new P1 in top-100 accounts.",
  },
  {
    window: "Days 1 – 30",
    title: "Auto-route expansion signals",
    owner: "RevOps + AE leadership",
    priority: "P0",
    priorityColor: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    impact: "Recovers up to $1.8M ARR",
    detail: "Wire product-qualified signals from CS queue to AE in under 48h with closed-loop tracking.",
  },
  {
    window: "Days 15 – 45",
    title: "Redesign onboarding milestones",
    owner: "Head of Implementation",
    priority: "P1",
    priorityColor: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    impact: "Reduces TTV by 25 – 30 days",
    detail: "Introduce explicit day-15 and day-45 gates with shared customer success plan.",
  },
  {
    window: "Days 15 – 60",
    title: "Sales-to-CS handoff overhaul",
    owner: "CRO + VP CS",
    priority: "P1",
    priorityColor: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    impact: "Lifts activation rate +12pts",
    detail: "Mandatory handoff brief with success criteria, exec sponsor, and risk flags before kickoff.",
  },
  {
    window: "Days 30 – 60",
    title: "Document top-25 account playbooks",
    owner: "Strategic Accounts lead",
    priority: "P1",
    priorityColor: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    impact: "De-risks $4.2M founder-led ARR",
    detail: "Named exec sponsors, decision-maker maps, and replacement-ready relationships across top-25.",
  },
  {
    window: "Days 45 – 90",
    title: "Adoption scoring & nudges",
    owner: "Product + CS Ops",
    priority: "P2",
    priorityColor: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
    impact: "Pushes DAU/WAU to 55%+",
    detail: "Per-persona adoption scorecards with in-product nudges and weekly CSM review.",
  },
  {
    window: "Days 60 – 100",
    title: "Weekly operational risk review",
    owner: "CEO + Operating Partner",
    priority: "P2",
    priorityColor: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
    impact: "Sustains gains post-close",
    detail: "Standing 45-min review of INVESQ risk dashboard with PE operating partner present.",
  },
];

const FINAL_METRICS = [
  { label: "Friction points identified", value: "14" },
  { label: "Expansion ARR at risk", value: "$1.8M" },
  { label: "TTV drag", value: "42d" },
  { label: "Recommended actions", value: "7" },
];

/* ------------------------------------------------------------------ */
/* Step definitions                                                   */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: "deal", label: "Deal Context", icon: Building2 },
  { id: "systems", label: "Connected Systems", icon: Network },
  { id: "signals", label: "Risk Signals", icon: ShieldAlert },
  { id: "journey", label: "Customer Journey", icon: Workflow },
  { id: "playbook", label: "AI Playbook", icon: Sparkles },
  { id: "summary", label: "Summary", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function LaunchDemo() {
  const [active, setActive] = useState<StepId>("deal");
  const refs = useRef<Record<StepId, HTMLDivElement | null>>({
    deal: null,
    systems: null,
    signals: null,
    journey: null,
    playbook: null,
    summary: null,
  });

  const activeIndex = useMemo(() => STEPS.findIndex((s) => s.id === active), [active]);

  const goTo = (id: StepId) => {
    setActive(id);
    const el = refs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const next = () => {
    if (activeIndex < STEPS.length - 1) goTo(STEPS[activeIndex + 1].id);
  };
  const prev = () => {
    if (activeIndex > 0) goTo(STEPS[activeIndex - 1].id);
  };

  // Keep active step in sync with scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = (visible.target as HTMLElement).dataset.stepId as StepId | undefined;
          if (id) setActive(id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.5, 0.8, 1] },
    );
    Object.values(refs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const progressPct = ((activeIndex + 1) / STEPS.length) * 100;

  return (
    <div
      className="min-h-screen bg-[#070912] text-slate-100 selection:bg-violet-500/40"
      data-testid="launch-demo"
    >
      {/* Ambient gradient bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[42rem] h-[42rem] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[40rem] h-[40rem] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[36rem] h-[36rem] rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      {/* Sticky presenter nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070912]/85 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0"
            data-testid="demo-brand"
          >
            <img src={logoMark} alt="" className="w-8 h-8 rounded-lg" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white tracking-tight">INVESQ</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Powered by CS Rescue
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 ml-4 overflow-x-auto">
            {STEPS.map((s, i) => {
              const isActive = s.id === active;
              const isDone = i < activeIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  data-testid={`demo-step-${s.id}`}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white/10 text-white ring-1 ring-white/15"
                      : isDone
                        ? "text-cyan-200/80 hover:text-white"
                        : "text-slate-500 hover:text-slate-200"
                  }`}
                >
                  <span
                    className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-violet-500 text-white"
                        : isDone
                          ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
                          : "bg-white/5 text-slate-500 ring-1 ring-white/10"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={activeIndex === 0}
              className="text-slate-300 hover:text-white disabled:opacity-30"
              data-testid="demo-prev"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Prev</span>
            </Button>
            <Button
              size="sm"
              onClick={next}
              disabled={activeIndex === STEPS.length - 1}
              className="bg-violet-500 hover:bg-violet-400 text-white gap-1.5 disabled:opacity-40"
              data-testid="demo-next"
            >
              <span className="hidden sm:inline">Next</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 pb-32">
        {/* ============================== STEP 1: DEAL CONTEXT ====================== */}
        <Section
          ref={(el) => { refs.current.deal = el; }}
          stepId="deal"
          stepNumber={1}
          totalSteps={STEPS.length}
          eyebrow="Deal context"
          title="The Third Pillar of Due Diligence."
          subtitle="Operational revenue risk identified before close — alongside financial and legal diligence."
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Target company */}
            <Card className="lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow icon={Building2}>Target company</Eyebrow>
                  <h3 className="text-2xl font-bold text-white mt-1">{DEAL.codename}</h3>
                  <p className="text-sm text-slate-400 mt-1">{DEAL.vertical}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30 font-semibold">
                  Confidential
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <MiniStat label="ARR" value={DEAL.arr} />
                <MiniStat label="NRR" value={DEAL.nrr} hint="below 100%" hintTone="warn" />
                <MiniStat label="Gross churn" value={DEAL.grossChurn} hint="above 12%" hintTone="warn" />
                <MiniStat label="Median TTV" value={DEAL.ttv} hint="vs 32-day target" hintTone="warn" />
                <MiniStat label="Customers" value={DEAL.customers} />
                <MiniStat label="Headcount" value={DEAL.employees} />
                <MiniStat label="Fund" value={DEAL.fund} small />
                <MiniStat label="Stage" value={DEAL.stage} small />
              </div>
            </Card>

            {/* Risk score gauge */}
            <Card>
              <Eyebrow icon={ShieldAlert}>Operational risk score</Eyebrow>
              <div className="mt-4 flex items-end gap-3">
                <div className="text-6xl font-extrabold tracking-tight text-white tabular-nums">
                  {DEAL.riskScore}
                </div>
                <div className="text-sm text-slate-400 pb-2">/ 10</div>
              </div>
              <RiskMeter value={DEAL.riskScore} />
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Elevated risk driven by onboarding drag, founder relationship concentration,
                and unrouted expansion signals.
              </p>
            </Card>

            {/* Revenue trend */}
            <Card className="lg:col-span-2">
              <div className="flex items-baseline justify-between">
                <Eyebrow icon={DollarSign}>NRR trajectory · last 12 months</Eyebrow>
                <span className="inline-flex items-center gap-1 text-xs text-rose-300">
                  <TrendingDown className="w-3.5 h-3.5" /> -11pts trend
                </span>
              </div>
              <Sparkline values={REVENUE_TREND} />
              <div className="grid grid-cols-3 gap-4 mt-4">
                <MiniStat label="Peak NRR" value="108%" />
                <MiniStat label="Current NRR" value="91%" hintTone="warn" hint="-17pts" />
                <MiniStat label="Trend window" value="12 mo" />
              </div>
            </Card>

            {/* Customer health */}
            <Card>
              <Eyebrow icon={Activity}>Customer health</Eyebrow>
              <div className="mt-4 space-y-2.5">
                <HealthBar label="Healthy" pct={48} tone="ok" />
                <HealthBar label="At watch" pct={27} tone="warn" />
                <HealthBar label="At risk" pct={18} tone="alert" />
                <HealthBar label="Churning" pct={7} tone="critical" />
              </div>
              <p className="text-xs text-slate-500 mt-4">
                25% of book in at-risk or churning state — concentrated in top-50 accounts.
              </p>
            </Card>
          </div>
        </Section>

        {/* ============================== STEP 2: CONNECTED SYSTEMS =================== */}
        <Section
          ref={(el) => { refs.current.systems = el; }}
          stepId="systems"
          stepNumber={2}
          totalSteps={STEPS.length}
          eyebrow="Connected systems"
          title="One operational graph, six source systems."
          subtitle="INVESQ ingests structured and unstructured signals from the systems your portfolio company already runs — no new tooling required."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {SYSTEM_KPIS.map((k) => (
              <Card key={k.label} compact>
                <p className="text-xs uppercase tracking-wider text-slate-500">{k.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{k.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Hub diagram */}
            <Card className="lg:col-span-3 relative overflow-hidden">
              <Eyebrow icon={Network}>Ingestion architecture</Eyebrow>
              <div className="relative h-80 mt-4">
                {/* center node */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-500/30 ring-1 ring-white/20">
                    <div className="text-center">
                      <Brain className="w-6 h-6 text-white mx-auto" />
                      <div className="text-[10px] font-bold text-white mt-1 tracking-wider">
                        INVESQ
                      </div>
                      <div className="text-[8px] text-white/70">Engine</div>
                    </div>
                  </div>
                </div>
                {/* orbit lines */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 rounded-full border border-violet-500/20" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 h-80 rounded-full border border-cyan-500/10" />
                </div>
                {/* system nodes */}
                {SYSTEMS.map((sys, i) => {
                  const angle = (i / SYSTEMS.length) * Math.PI * 2 - Math.PI / 2;
                  const r = 130;
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;
                  return (
                    <div
                      key={sys.name}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                    >
                      <div
                        className="w-16 h-16 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white text-center px-1 shadow-lg"
                        style={{ boxShadow: `0 0 24px ${sys.color}33` }}
                      >
                        {sys.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* System list */}
            <Card className="lg:col-span-2">
              <Eyebrow icon={Database}>Source systems</Eyebrow>
              <div className="mt-4 divide-y divide-white/5">
                {SYSTEMS.map((s) => (
                  <div key={s.name} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-300 tabular-nums">{s.records}</p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 justify-end">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {s.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* ============================== STEP 3: RISK SIGNALS ====================== */}
        <Section
          ref={(el) => { refs.current.signals = el; }}
          stepId="signals"
          stepNumber={3}
          totalSteps={STEPS.length}
          eyebrow="Operational risk signals"
          title="Four material risks, surfaced before close."
          subtitle="AI-powered operational diligence — each signal evidenced by data, quantified in dollars, and paired with the action to address it."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KpiPill label="Friction points detected" value="14" />
            <KpiPill label="Expansion ARR at risk" value="$1.8M" tone="warn" />
            <KpiPill label="TTV drag vs target" value="42 days" tone="alert" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {RISK_SIGNALS.map((r) => (
              <div
                key={r.id}
                className={`relative rounded-xl border bg-gradient-to-br p-6 ${r.severityColor}`}
                data-testid={`risk-card-${r.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                      <r.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{r.title}</h3>
                      <span className={`inline-block mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${r.pillColor}`}>
                        {r.severity}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-white tabular-nums">{r.impactValue}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
                      {r.impactLabel}
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-1.5">
                  {r.evidence.map((e) => (
                    <li key={e} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-cyan-400 mt-0.5 shrink-0">▸</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-200 leading-relaxed">
                    <span className="text-violet-300 font-semibold">Recommended:</span> {r.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ============================== STEP 4: CUSTOMER JOURNEY =================== */}
        <Section
          ref={(el) => { refs.current.journey = el; }}
          stepId="journey"
          stepNumber={4}
          totalSteps={STEPS.length}
          eyebrow="Customer lifecycle diligence"
          title="Map the journey. See where revenue leaks."
          subtitle="An interactive journey intelligence layer that turns six fragmented stages into one accountable lifecycle."
        >
          <Card>
            <Eyebrow icon={Workflow}>End-to-end lifecycle</Eyebrow>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-3">
              {JOURNEY.map((s, i) => {
                const toneRing =
                  s.status === "ok"
                    ? "ring-emerald-500/40"
                    : s.status === "risk"
                      ? "ring-amber-500/40"
                      : "ring-rose-500/50";
                const toneBar =
                  s.status === "ok"
                    ? "bg-emerald-400"
                    : s.status === "risk"
                      ? "bg-amber-400"
                      : "bg-rose-500";
                const toneText =
                  s.status === "ok"
                    ? "text-emerald-300"
                    : s.status === "risk"
                      ? "text-amber-300"
                      : "text-rose-300";
                return (
                  <div key={s.stage} className="relative">
                    <div className={`rounded-xl border border-white/10 bg-slate-950/60 p-4 ring-1 ${toneRing}`}>
                      <div className="flex items-center gap-2">
                        <s.icon className="w-4 h-4 text-slate-400" />
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                          Stage {i + 1}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-bold text-white">{s.stage}</p>
                      <p className={`text-[11px] mt-1 ${toneText}`}>{s.kpi}</p>
                      <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full ${toneBar}`} style={{ width: `${s.health}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Healthy</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />At watch</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />At risk</span>
            </div>
          </Card>

          <h3 className="text-lg font-semibold text-white mt-10 mb-4">Friction points across the journey</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {JOURNEY_FRICTION.map((f) => (
              <Card key={f.where}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">{f.where}</p>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{f.finding}</p>
                    <p className="text-xs text-amber-300 mt-2">{f.cost}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* ============================== STEP 5: AI PLAYBOOK =================== */}
        <Section
          ref={(el) => { refs.current.playbook = el; }}
          stepId="playbook"
          stepNumber={5}
          totalSteps={STEPS.length}
          eyebrow="AI playbook"
          title="100-Day Value Creation Plan generated."
          subtitle="Seven sequenced actions — each with an owner, a window, and a quantified impact on NRR, churn, or TTV."
        >
          <div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 px-5 py-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 ring-1 ring-violet-400/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">100-Day Value Creation Plan</p>
              <p className="text-xs text-slate-300">Generated by INVESQ · Reviewed by Operating Partner</p>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <Calendar className="w-3.5 h-3.5" /> Ready for kickoff
            </span>
          </div>

          <div className="space-y-3">
            {PLAYBOOK.map((p, i) => (
              <div
                key={p.title}
                className="rounded-xl border border-white/10 bg-slate-950/60 p-5 hover:border-violet-400/30 hover:bg-slate-950/80 transition-all"
                data-testid={`playbook-${i}`}
              >
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Window</p>
                    <p className="text-sm font-bold text-white mt-1">{p.window}</p>
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${p.priorityColor} font-semibold`}>
                        {p.priority}
                      </span>
                      <p className="text-base font-semibold text-white">{p.title}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{p.detail}</p>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Owner</p>
                    <p className="text-xs text-slate-200 mt-1">{p.owner}</p>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Expected impact</p>
                    <p className="text-xs text-cyan-200 mt-1 font-medium">{p.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ============================== FINAL SUMMARY =================== */}
        <Section
          ref={(el) => { refs.current.summary = el; }}
          stepId="summary"
          stepNumber={6}
          totalSteps={STEPS.length}
          eyebrow="The bottom line"
          title="Fix the journey. Protect the multiple."
          subtitle="One operational picture. One playbook. One source of truth — from pre-LOI through exit."
        >
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-indigo-500/10 to-cyan-500/10 p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              {FINAL_METRICS.map((m) => (
                <div key={m.label} className="text-center md:text-left">
                  <p className="text-4xl md:text-5xl font-extrabold tabular-nums bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                    {m.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                size="lg"
                onClick={() => goTo("deal")}
                variant="outline"
                className="bg-white/5 border-white/15 text-white hover:bg-white/10 gap-2"
                data-testid="demo-restart"
              >
                <RotateCcw className="w-4 h-4" /> Restart demo
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white gap-2"
                data-testid="demo-request"
              >
                <a href="mailto:jay@csrescue.com?subject=INVESQ%20walkthrough%20request">
                  <Mail className="w-4 h-4" /> Request walkthrough
                </a>
              </Button>
              <Link
                href="/dashboard"
                className="ml-auto inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                data-testid="demo-explore-platform"
              >
                Explore the platform <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-10">
            INVESQ — Operational intelligence platform for PE value creation. Powered by CS Rescue.
          </p>
        </Section>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable bits                                                      */
/* ------------------------------------------------------------------ */

interface SectionProps {
  stepId: StepId;
  stepNumber: number;
  totalSteps: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const Section = forwardRef<HTMLDivElement, SectionProps>(function Section(
  { stepId, stepNumber, totalSteps, eyebrow, title, subtitle, children },
  ref,
) {
  return (
    <section
      ref={ref as React.Ref<HTMLElement> as any}
      data-step-id={stepId}
      data-testid={`section-${stepId}`}
      className="pt-24 -mt-16 scroll-mt-20"
    >
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] uppercase tracking-[0.22em] text-violet-300 font-semibold">
            Step {stepNumber} of {totalSteps}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-violet-500/40 to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{eyebrow}</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          {title}
        </h2>
        <p className="text-base text-slate-400 mt-3 max-w-3xl leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </section>
  );
});

function Card({
  children,
  className = "",
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur-sm ${
        compact ? "p-4" : "p-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-violet-300" /> {children}
    </p>
  );
}

function MiniStat({
  label,
  value,
  hint,
  hintTone,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: "ok" | "warn" | "alert";
  small?: boolean;
}) {
  const toneCls =
    hintTone === "warn"
      ? "text-amber-300"
      : hintTone === "alert"
        ? "text-rose-300"
        : "text-emerald-300";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 font-bold text-white tabular-nums ${
          small ? "text-sm" : "text-xl"
        }`}
      >
        {value}
      </p>
      {hint && <p className={`text-[10px] mt-0.5 ${toneCls}`}>{hint}</p>}
    </div>
  );
}

function KpiPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "alert";
}) {
  const accent =
    tone === "alert"
      ? "from-rose-500/20 to-rose-500/5 border-rose-500/30"
      : tone === "warn"
        ? "from-amber-500/20 to-amber-500/5 border-amber-500/30"
        : "from-violet-500/20 to-violet-500/5 border-violet-500/30";
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${accent} p-5`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-300/80">{label}</p>
      <p className="text-3xl font-extrabold text-white tabular-nums mt-1">{value}</p>
    </div>
  );
}

function HealthBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "ok" | "warn" | "alert" | "critical";
}) {
  const fill =
    tone === "ok"
      ? "bg-emerald-400"
      : tone === "warn"
        ? "bg-amber-400"
        : tone === "alert"
          ? "bg-rose-400"
          : "bg-rose-600";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RiskMeter({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div className="mt-3">
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 600;
  const h = 90;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 6;
  const stepX = (w - pad * 2) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  });
  const path = `M ${points.join(" L ")}`;
  const areaPath = `${path} L ${pad + (values.length - 1) * stepX},${h - pad} L ${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 mt-3">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark)" />
      <path d={path} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
