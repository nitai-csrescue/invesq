import { useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Target,
  ArrowUpRight,
  FileSearch,
  Workflow,
  Activity,
  ChevronRight,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type RiskLevel = "Low" | "Medium" | "Medium-High" | "High";

interface AuditLink {
  system: string;
  detail: string;
}

interface LifecycleStage {
  id: string;
  name: string;
  grade: string;
  risk: RiskLevel;
  signals: number;
  keyMetric: string;
  revenueExposure: string;
  exposureKind: "risk" | "opportunity";
  confidence: number;
  explanation: string;
  topSignals: string[];
  systems: string[];
  auditTrail: AuditLink[];
  recommendedAction: string;
  suggestedOwner: string;
  estimatedImpact: string;
}

const STAGES: LifecycleStage[] = [
  {
    id: "sales",
    name: "Sales",
    grade: "B+",
    risk: "Medium",
    signals: 42,
    keyMetric: "ICP fit strong, handoff risk moderate",
    revenueExposure: "$420K",
    exposureKind: "risk",
    confidence: 84,
    explanation:
      "Deals are landing within the ideal customer profile and qualification quality is high, but handoff completeness from Sales to Customer Success is inconsistent. Missing context at handoff is the primary drag on this grade.",
    topSignals: [
      "Strong ICP fit across closed-won cohort (88% match)",
      "Opportunity handoff documentation missing on 4 of 10 deals",
      "Sales call expectations not consistently aligned to delivery scope",
    ],
    systems: ["Salesforce", "Gong", "Data Warehouse"],
    auditTrail: [
      { system: "Salesforce", detail: "Opportunity handoff completeness" },
      { system: "Gong", detail: "Sales call expectation alignment" },
      { system: "Data Warehouse", detail: "Closed-won ICP fit benchmarks" },
    ],
    recommendedAction:
      "Standardize a mandatory handoff packet and require expectation alignment notes before deal closure.",
    suggestedOwner: "VP of Sales",
    estimatedImpact: "Protects ~$420K of NRR exposed to weak handoffs",
  },
  {
    id: "implementation",
    name: "Implementation",
    grade: "C",
    risk: "High",
    signals: 61,
    keyMetric: "Time-to-value delayed by 23 days",
    revenueExposure: "$1.2M",
    exposureKind: "risk",
    confidence: 91,
    explanation:
      "Implementation is the weakest link in the lifecycle. Time-to-value is running 23 days behind target, driven by ticket backlog and milestone slippage. Delay here cascades into adoption and renewal risk downstream.",
    topSignals: [
      "Median time-to-value 23 days above the 32-day target",
      "Implementation ticket aging trending up week-over-week",
      "39% of accounts miss the day-30 activation milestone",
    ],
    systems: ["Jira", "Product Analytics", "Salesforce"],
    auditTrail: [
      { system: "Jira", detail: "Implementation ticket delays" },
      { system: "Product Analytics", detail: "Activation milestone trend" },
      { system: "Salesforce", detail: "Go-live date vs. contract start" },
    ],
    recommendedAction:
      "Launch an implementation acceleration plan with milestone-based escalation and a dedicated onboarding pod.",
    suggestedOwner: "Director of Implementation",
    estimatedImpact: "Recovers ~$1.2M of ARR at risk from delayed value realization",
  },
  {
    id: "customer-success",
    name: "Customer Success",
    grade: "B-",
    risk: "Medium",
    signals: 55,
    keyMetric: "QBR coverage inconsistent",
    revenueExposure: "$680K",
    exposureKind: "risk",
    confidence: 87,
    explanation:
      "Health is stable for engaged accounts, but QBR coverage is uneven across the book. Strategic accounts without recent executive touchpoints show early disengagement signals that depress the grade.",
    topSignals: [
      "QBR coverage at 61% of strategic accounts (target 90%)",
      "Declining feature adoption in 12 mid-market accounts",
      "Sponsor engagement gaps in 7 of top-50 accounts",
    ],
    systems: ["Salesforce", "Product Analytics", "Slack"],
    auditTrail: [
      { system: "Product Analytics", detail: "Feature adoption trend" },
      { system: "Salesforce", detail: "QBR cadence coverage" },
      { system: "Slack", detail: "Customer engagement mentions" },
    ],
    recommendedAction:
      "Re-engage executive sponsors on under-covered strategic accounts and enforce a QBR cadence floor.",
    suggestedOwner: "VP of Customer Success",
    estimatedImpact: "Stabilizes ~$680K of renewal ARR in under-managed accounts",
  },
  {
    id: "customer-support",
    name: "Customer Support",
    grade: "C+",
    risk: "Medium-High",
    signals: 74,
    keyMetric: "Escalation rate above benchmark",
    revenueExposure: "$890K",
    exposureKind: "risk",
    confidence: 89,
    explanation:
      "Support volume is manageable, but escalation rate is running above benchmark and concentrated in high-value accounts. Repeated escalations are an early churn indicator and are suppressing expansion readiness upstream.",
    topSignals: [
      "Escalation rate 38% above peer benchmark",
      "Escalation clusters concentrated in 14 of top-100 accounts",
      "Rising P1 ticket volume among $250K+ accounts",
    ],
    systems: ["Zendesk", "Slack", "Data Warehouse"],
    auditTrail: [
      { system: "Zendesk", detail: "Support escalation volume" },
      { system: "Slack", detail: "Customer escalation mentions" },
      { system: "Data Warehouse", detail: "Escalation-to-churn correlation" },
    ],
    recommendedAction:
      "Activate an escalation workflow for high-value accounts and route recurring issues to a tiger team.",
    suggestedOwner: "Director of Support",
    estimatedImpact: "Defends ~$890K of renewal ARR under escalation pressure",
  },
  {
    id: "expansion",
    name: "Upsell / Expansion",
    grade: "A-",
    risk: "Low",
    signals: 38,
    keyMetric: "Expansion readiness strong",
    revenueExposure: "$1.5M opportunity",
    exposureKind: "opportunity",
    confidence: 82,
    explanation:
      "A clear set of accounts shows strong expansion readiness based on adoption depth and usage growth. The constraint is routing: qualified expansion signals are firing faster than they are being actioned by the revenue team.",
    topSignals: [
      "47 expansion-qualified signals fired this quarter",
      "Usage growth above threshold in 23 accounts",
      "35 expansion signals currently unowned",
    ],
    systems: ["Product Analytics", "Salesforce", "Data Warehouse"],
    auditTrail: [
      { system: "Product Analytics", detail: "Feature adoption trend" },
      { system: "Data Warehouse", detail: "NRR and cohort benchmarks" },
      { system: "Salesforce", detail: "Expansion signal ownership" },
    ],
    recommendedAction:
      "Auto-route expansion-qualified signals to account owners and run an expansion readiness review.",
    suggestedOwner: "VP of Revenue",
    estimatedImpact: "Unlocks ~$1.5M of expansion pipeline currently unrouted",
  },
];

const VIEW_OPTIONS = [
  "Funnel View",
  "Bar Chart View",
  "Lifecycle Timeline",
  "Risk Heatmap",
  "Executive Summary",
] as const;

type ViewOption = (typeof VIEW_OPTIONS)[number];

function gradeColor(grade: string): string {
  const letter = grade.charAt(0);
  switch (letter) {
    case "A":
      return "text-emerald-300 border-emerald-400/40 bg-emerald-500/10";
    case "B":
      return "text-cyan-300 border-cyan-400/40 bg-cyan-500/10";
    case "C":
      return "text-amber-300 border-amber-400/40 bg-amber-500/10";
    case "D":
      return "text-orange-300 border-orange-400/40 bg-orange-500/10";
    default:
      return "text-rose-300 border-rose-400/40 bg-rose-500/10";
  }
}

function riskStyles(risk: RiskLevel): string {
  switch (risk) {
    case "Low":
      return "text-emerald-300 bg-emerald-500/10 border-emerald-400/30";
    case "Medium":
      return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
    case "Medium-High":
      return "text-amber-300 bg-amber-500/10 border-amber-400/30";
    case "High":
      return "text-rose-300 bg-rose-500/10 border-rose-400/30";
  }
}

const INSIGHTS = [
  {
    icon: AlertTriangle,
    tone: "text-rose-300",
    ring: "border-rose-400/20",
    title: "Implementation drag is creating downstream churn risk.",
    body: "A 23-day time-to-value delay in Implementation propagates into weaker adoption and elevated renewal risk across the book.",
  },
  {
    icon: Activity,
    tone: "text-amber-300",
    ring: "border-amber-400/20",
    title: "Support escalation volume is suppressing expansion readiness.",
    body: "Escalation clusters in high-value accounts are holding back otherwise expansion-ready customers from upsell motion.",
  },
  {
    icon: Target,
    tone: "text-cyan-300",
    ring: "border-cyan-400/20",
    title: "Sales-to-CS handoff quality is a leading indicator of time-to-value.",
    body: "Accounts with complete handoff packets reach value materially faster — handoff completeness predicts the Implementation grade.",
  },
];

const PLAYBOOKS = [
  {
    icon: Workflow,
    title: "Implementation Acceleration Plan",
    body: "Milestone-based escalation, a dedicated onboarding pod, and ticket-aging alerts to compress time-to-value.",
    target: "Implementation",
  },
  {
    icon: ShieldCheck,
    title: "Executive Sponsor Re-Engagement",
    body: "Reconnect executive sponsors on under-covered strategic accounts and restore a consistent QBR cadence.",
    target: "Customer Success",
  },
  {
    icon: TrendingUp,
    title: "Expansion Readiness Review",
    body: "Auto-route expansion-qualified signals to owners and convert adoption momentum into upsell pipeline.",
    target: "Upsell / Expansion",
  },
];

export default function LifecycleFunnel() {
  const [activeView, setActiveView] = useState<ViewOption>("Funnel View");
  const [selected, setSelected] = useState<LifecycleStage | null>(null);

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Operational Intelligence Layer"
        title="Customer Lifecycle Intelligence Funnel"
        subtitle="INVESQ grades customer health and operational risk across the full lifecycle — turning fragmented system signals into grades, risk levels, recommendations, and auditable evidence."
      />

      {/* View options */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {VIEW_OPTIONS.map((view) => {
          const isActive = view === activeView;
          const isFunnel = view === "Funnel View";
          return (
            <button
              key={view}
              onClick={() => isFunnel && setActiveView(view)}
              disabled={!isFunnel}
              data-testid={`view-${view.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className={[
                "px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors",
                isActive
                  ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-200"
                  : isFunnel
                    ? "bg-slate-950/40 border-white/10 text-slate-300 hover:border-white/20"
                    : "bg-slate-950/20 border-white/5 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              {view}
              {!isFunnel && (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-600">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Funnel */}
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Lifecycle Grade Funnel
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any stage to inspect the contributing evidence and recommended action.
            </p>
          </div>
          <Layers className="w-5 h-5 text-slate-500" />
        </div>

        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            // Funnel taper: each row a bit narrower than the last.
            const widthPct = 100 - i * 9;
            return (
              <button
                key={stage.id}
                onClick={() => setSelected(stage)}
                data-testid={`stage-${stage.id}`}
                style={{ width: `${widthPct}%` }}
                className={[
                  "group block text-left rounded-lg border bg-slate-900/50 p-4 transition-all",
                  "border-white/10 hover:border-cyan-400/40 hover:bg-slate-900/80",
                  selected?.id === stage.id
                    ? "border-cyan-400/60 ring-1 ring-cyan-400/30 bg-slate-900/80"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Stage index + name */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-white/5 text-xs font-semibold text-slate-400 shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">
                        {stage.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {stage.signals} signals analyzed
                      </p>
                    </div>
                  </div>

                  {/* Grade */}
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-lg border text-lg font-bold shrink-0 ${gradeColor(
                      stage.grade,
                    )}`}
                  >
                    {stage.grade}
                  </div>

                  {/* Risk */}
                  <span
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium shrink-0 ${riskStyles(
                      stage.risk,
                    )}`}
                  >
                    {stage.risk} risk
                  </span>

                  {/* Key metric */}
                  <p className="text-xs text-slate-300 flex-1 min-w-[160px]">
                    {stage.keyMetric}
                  </p>

                  {/* Exposure */}
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        stage.exposureKind === "opportunity"
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {stage.revenueExposure}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      {stage.exposureKind === "opportunity"
                        ? "opportunity"
                        : "exposure"}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div className="w-24 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        Conf.
                      </span>
                      <span className="text-[11px] font-medium text-slate-300">
                        {stage.confidence}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400/70"
                        style={{ width: `${stage.confidence}%` }}
                      />
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-300 transition-colors shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Traceability */}
      <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4 mb-8 flex items-start gap-3">
        <FileSearch className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">Traceability</p>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Each lifecycle grade is generated from analyzed signals across source
            systems. Users can inspect the contributing evidence without exposing
            raw implementation complexity.
          </p>
        </div>
      </div>

      {/* What INVESQ Detected */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-white tracking-tight mb-3">
          What INVESQ Detected
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INSIGHTS.map((insight) => {
            const Icon = insight.icon;
            return (
              <div
                key={insight.title}
                className={`rounded-xl border bg-slate-950/40 p-4 ${insight.ring}`}
              >
                <Icon className={`w-5 h-5 mb-3 ${insight.tone}`} />
                <p className="text-sm font-semibold text-white leading-snug">
                  {insight.title}
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {insight.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Playbooks */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white tracking-tight mb-3">
          Recommended Playbooks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAYBOOKS.map((pb) => {
            const Icon = pb.icon;
            return (
              <div
                key={pb.title}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-4 flex flex-col"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-400/30 mb-3">
                  <Icon className="w-4.5 h-4.5 text-cyan-300" />
                </div>
                <p className="text-sm font-semibold text-white leading-snug">
                  {pb.title}
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed flex-1">
                  {pb.body}
                </p>
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Targets: {pb.target}
                  </span>
                  <span className="text-xs font-medium text-cyan-300 inline-flex items-center gap-1">
                    Run playbook <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl bg-slate-950 border-l border-white/10 overflow-y-auto"
        >
          {selected && (
            <>
              <SheetHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-14 h-14 rounded-lg border text-2xl font-bold ${gradeColor(
                      selected.grade,
                    )}`}
                  >
                    {selected.grade}
                  </div>
                  <div>
                    <SheetTitle className="text-white text-xl">
                      {selected.name}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${riskStyles(
                          selected.risk,
                        )}`}
                      >
                        {selected.risk} risk
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {selected.confidence}% confidence · {selected.signals}{" "}
                        signals
                      </span>
                    </div>
                  </div>
                </div>
                <SheetDescription className="sr-only">
                  Lifecycle stage detail for {selected.name}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Why this grade */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-2">
                    Why this grade
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selected.explanation}
                  </p>
                </section>

                {/* Top signals */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-2">
                    Top contributing signals
                  </h3>
                  <ul className="space-y-2">
                    {selected.topSignals.map((sig, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-slate-300"
                      >
                        <span className="flex items-center justify-center w-5 h-5 rounded bg-white/5 text-[11px] font-semibold text-slate-400 shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        {sig}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Systems analyzed */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-2">
                    Systems analyzed
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.systems.map((sys) => (
                      <Badge
                        key={sys}
                        variant="outline"
                        className="border-white/15 text-slate-300 bg-white/5"
                      >
                        {sys}
                      </Badge>
                    ))}
                  </div>
                </section>

                {/* Audit trail */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-2">
                    Audit trail / traceability
                  </h3>
                  <div className="rounded-lg border border-white/10 divide-y divide-white/5">
                    {selected.auditTrail.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <FileSearch className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-200">
                            {link.system}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 text-right max-w-[60%]">
                          {link.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recommendation */}
                <section className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-4">
                  <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-300 font-semibold mb-2">
                    Recommended action
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {selected.recommendedAction}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                        Suggested owner
                      </p>
                      <p className="text-sm font-medium text-white">
                        {selected.suggestedOwner}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                        Estimated impact
                      </p>
                      <p className="text-sm font-medium text-white">
                        {selected.estimatedImpact}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
