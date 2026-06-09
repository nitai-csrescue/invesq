import { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  Info,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ---------------------------------------------------------------- *
 * CS Rescue · CS Health Scorecard — self-contained demo page.
 * Operator-led diagnostic & intelligence layer. Illustrative demo
 * data only. Keeps the "CS Rescue" brand name (not INVESQ).
 * ---------------------------------------------------------------- */

const COMPOSITE = 11;
const COMPOSITE_MAX = 20;

const PRODUCT_BANNER =
  "CS Rescue is an operator-led diagnostic and intelligence layer — not a CRM or CS-tool replacement. It turns customer data, interviews, and operating evidence into a prioritized value creation plan.";

const COMPOSITE_TOOLTIP =
  "Composite score combines the 5 scored pillars plus leadership readiness weighting. It is not a direct sum of pillar levels.";

const WHY_IT_MATTERS = [
  "Customer risk remains reactive",
  "Renewals remain difficult to forecast",
  "Expansion remains opportunistic",
  "Leadership visibility remains limited",
];

const EXPECTED_OUTCOMES = [
  "Earlier risk identification",
  "Repeatable onboarding motion",
  "Forecastable renewals",
  "Structured expansion process",
  "Executive visibility",
];

const DIAGNOSTIC_STEPS = ["Assess", "Score", "Recommend", "Build Plan"];

const TABS = [
  "Executive Summary",
  "Pillar Scores",
  "Evidence Review",
  "Engagement Plan",
  "Board-Ready Output",
] as const;
type Tab = (typeof TABS)[number];

const TAB_SLUGS: Record<Tab, string> = {
  "Executive Summary": "summary",
  "Pillar Scores": "pillars",
  "Evidence Review": "evidence",
  "Engagement Plan": "engagement",
  "Board-Ready Output": "board",
};
const SLUG_TO_TAB = Object.fromEntries(
  Object.entries(TAB_SLUGS).map(([tab, slug]) => [slug, tab as Tab]),
) as Record<string, Tab>;

function initialTab(): Tab {
  if (typeof window === "undefined") return "Executive Summary";
  const slug = new URLSearchParams(window.location.search).get("tab");
  return (slug && SLUG_TO_TAB[slug]) || "Executive Summary";
}

/* ------------------------------ Data ------------------------------ */

type Level = 1 | 2 | 3 | 4 | null;

type Source =
  | "Interview"
  | "CRM Review"
  | "Leadership Workshop"
  | "Data Review"
  | "Process Audit"
  | "Leadership Interview";

type Evidence = { text: string; source: Source };

type Benchmark = "Bottom Quartile" | "Median" | "Top Quartile";

type Pillar = {
  name: string;
  short: string;
  level: Level;
  status: string; // "Critical" | "Developing" | "Functional" | "Optimized" | "Augment"
  icon: LucideIcon;
  measures: string;
  benchmark: Benchmark;
  evidence: Evidence[];
  intervention: string;
};

const PILLARS: Pillar[] = [
  {
    name: "CS Organizational Design",
    short: "Org Design",
    level: 2,
    status: "Developing",
    icon: Users,
    measures:
      "How CS roles, ownership, capacity, and operating cadence are structured to deliver retention and expansion outcomes.",
    benchmark: "Median",
    evidence: [
      { text: "CS team exists but roles blur between support and success", source: "Interview" },
      { text: "Account ownership is informal and capacity is unmodeled", source: "Process Audit" },
      { text: "No documented operating cadence or QBR rhythm", source: "Process Audit" },
      { text: "Escalations handled reactively rather than by a defined motion", source: "Interview" },
    ],
    intervention:
      "Define CS roles and segment-based coverage, model capacity to book of business, and install a weekly operating cadence.",
  },
  {
    name: "Customer Data & Signal Infrastructure",
    short: "Data & Signal",
    level: 1,
    status: "Critical",
    icon: Activity,
    measures:
      "Whether customer health, usage, and risk signals are captured systematically and surfaced to the people who act on them.",
    benchmark: "Bottom Quartile",
    evidence: [
      { text: "Health score exists but is manually maintained", source: "CRM Review" },
      { text: "Customer risk identified through escalations and gut feel", source: "Leadership Interview" },
      { text: "No systematic product usage data feeding account management", source: "Data Review" },
      { text: "Leadership cannot see real-time retention risk without manual reporting", source: "Leadership Workshop" },
    ],
    intervention:
      "Implement automated health scoring, trigger-based risk alerts, and a weekly customer risk review.",
  },
  {
    name: "Customer Journey Architecture",
    short: "Journey",
    level: 2,
    status: "Developing",
    icon: Layers,
    measures:
      "Whether the customer lifecycle — onboarding, adoption, renewal, expansion — is defined, repeatable, and instrumented.",
    benchmark: "Bottom Quartile",
    evidence: [
      { text: "Onboarding is ad hoc and CSM-dependent", source: "Process Audit" },
      { text: "No defined adoption milestones or time-to-value targets", source: "Data Review" },
      { text: "Renewal motion starts late and varies by rep", source: "CRM Review" },
      { text: "Expansion is opportunistic, not journey-driven", source: "Interview" },
    ],
    intervention:
      "Architect a milestone-based onboarding journey, define time-to-value targets, and standardize a pre-renewal motion.",
  },
  {
    name: "Revenue Retention & Expansion Performance",
    short: "Retention & Expansion",
    level: 3,
    status: "Functional",
    icon: TrendingUp,
    measures:
      "Gross/net retention, expansion contribution, and the commercial accountability of the CS function.",
    benchmark: "Top Quartile",
    evidence: [
      { text: "Gross retention is healthy for the segment", source: "Data Review" },
      { text: "Net retention is positive but expansion is inconsistent", source: "Data Review" },
      { text: "Renewals close, though often late and unforecasted", source: "CRM Review" },
      { text: "Expansion lacks a repeatable CSQL process", source: "Process Audit" },
    ],
    intervention:
      "Formalize CSQL and expansion playbooks, add renewal forecasting, and tie CS to net-retention targets.",
  },
  {
    name: "CS-to-GTM Alignment",
    short: "CS-to-GTM",
    level: 2,
    status: "Developing",
    icon: Target,
    measures:
      "How well CS, Sales, Product, and Marketing share signals, ownership, and feedback across the revenue lifecycle.",
    benchmark: "Median",
    evidence: [
      { text: "Handoffs from Sales to CS are inconsistent", source: "CRM Review" },
      { text: "Customer insight rarely reaches Product or Marketing", source: "Interview" },
      { text: "No shared definition of healthy vs at-risk accounts", source: "Leadership Workshop" },
      { text: "Expansion ownership contested between CS and Sales", source: "Leadership Interview" },
    ],
    intervention:
      "Establish a shared account-health definition, formal handoff SLAs, and a recurring CS-to-GTM feedback loop.",
  },
  {
    name: "Leadership & Talent Readiness",
    short: "Leadership",
    level: null,
    status: "Augment",
    icon: Sparkles,
    measures:
      "Whether CS leadership and talent can execute and sustain the operating model being built.",
    benchmark: "Median",
    evidence: [
      { text: "Capable leader, but stretched across support and success", source: "Leadership Interview" },
      { text: "Team skews reactive; limited operations and analytics capacity", source: "Interview" },
      { text: "No dedicated CS Ops function today", source: "Process Audit" },
      { text: "Strong domain knowledge, thin process discipline", source: "Leadership Workshop" },
    ],
    intervention:
      "Augment with fractional CS Ops and operator coaching through the 90-day build; hire dedicated CS Ops on graduation.",
  },
];

const LEVEL_LABEL: Record<number, string> = {
  1: "Critical",
  2: "Developing",
  3: "Functional",
  4: "Optimized",
};

function levelTone(level: Level): string {
  if (level === null) return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
  if (level <= 1) return "text-rose-300 bg-rose-500/10 border-rose-400/30";
  if (level === 2) return "text-amber-300 bg-amber-500/10 border-amber-400/30";
  if (level === 3) return "text-emerald-300 bg-emerald-500/10 border-emerald-400/30";
  return "text-emerald-200 bg-emerald-500/15 border-emerald-400/40";
}

function statusText(p: Pillar): string {
  return p.level === null
    ? "Augment"
    : `Level ${p.level} · ${LEVEL_LABEL[p.level]}`;
}

function SourceTag({ source }: { source: Source }) {
  return (
    <span className="ml-0.5 inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-px text-[10px] font-medium text-slate-400 align-middle whitespace-nowrap">
      {source}
    </span>
  );
}

const BENCHMARK_STEPS: Benchmark[] = ["Bottom Quartile", "Median", "Top Quartile"];

function PeerBenchmark({ value }: { value: Benchmark }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-1.5">
        Peer Benchmark
      </p>
      <div className="grid grid-cols-3 gap-1">
        {BENCHMARK_STEPS.map((s) => {
          const active = s === value;
          return (
            <div
              key={s}
              className={`rounded-md border px-2 py-1 text-center text-[10px] font-medium leading-tight ${
                active
                  ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                  : "border-white/5 bg-slate-900/40 text-slate-500"
              }`}
            >
              {s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TIERS = [
  { min: 5, max: 8, label: "Immediate Intervention", tone: "rose" },
  { min: 9, max: 12, label: "Structured Build", tone: "amber" },
  { min: 13, max: 16, label: "Optimization", tone: "emerald" },
  { min: 17, max: 20, label: "Scale & Exit Readiness", tone: "cyan" },
] as const;

const CURRENT_TIER = TIERS.find(
  (t) => COMPOSITE >= t.min && COMPOSITE <= t.max,
)!;

const TOP_ACTIONS = [
  {
    title: "Implement automated health scoring",
    detail: "Replace the manually maintained score with a signal-driven model.",
    pillar: "Data & Signal",
  },
  {
    title: "Stand up trigger-based risk alerts + weekly risk review",
    detail: "Surface at-risk accounts in real time, not via escalation.",
    pillar: "Data & Signal",
  },
  {
    title: "Architect a repeatable onboarding journey",
    detail: "Define milestones and time-to-value targets across the lifecycle.",
    pillar: "Journey",
  },
  {
    title: "Build a structured pre-renewal motion",
    detail: "Start renewals earlier with a defined, forecastable playbook.",
    pillar: "Journey",
  },
  {
    title: "Establish CSQL / expansion + CS-to-GTM feedback loop",
    detail: "Make expansion repeatable and route customer signal back to GTM.",
    pillar: "CS-to-GTM",
  },
];

const FOCUS_AREAS = [
  {
    name: "Health scoring",
    desc: "Automated, signal-driven health model replacing manual tracking.",
    icon: Activity,
  },
  {
    name: "Onboarding journey",
    desc: "Milestone-based onboarding with explicit time-to-value targets.",
    icon: Layers,
  },
  {
    name: "Pre-renewal motion",
    desc: "Earlier, forecastable renewal playbook with defined triggers.",
    icon: Calendar,
  },
  {
    name: "CSQL / expansion process",
    desc: "Repeatable expansion qualification and handoff to commercial.",
    icon: TrendingUp,
  },
  {
    name: "CS-to-GTM feedback loop",
    desc: "Shared health definitions and recurring signal exchange with GTM.",
    icon: Target,
  },
];

const PLAN_WEEKS = [
  {
    span: "Days 0–30 · Diagnose & instrument",
    items: [
      "Stand up automated health scoring v1 from existing data",
      "Define healthy vs at-risk account criteria with leadership",
      "Launch the weekly customer risk review cadence",
    ],
  },
  {
    span: "Days 31–60 · Build the journey",
    items: [
      "Ship milestone-based onboarding with time-to-value targets",
      "Design the pre-renewal motion and renewal forecast",
      "Pilot CSQL / expansion qualification with CS + Sales",
    ],
  },
  {
    span: "Days 61–90 · Operationalize & hand off",
    items: [
      "Formalize CS-to-GTM feedback loop and handoff SLAs",
      "Tie CS to net-retention targets and reporting",
      "Graduation plan: hire CS Ops, retire manual reporting",
    ],
  },
];

const BOARD_CURRENT_STATE = [
  "The company is successfully retaining customers today, but relies heavily on individual heroics and manual processes.",
  "Customer risk, onboarding progress, and renewal readiness are not consistently visible to leadership.",
  "Without additional instrumentation and operating structure, retention performance may become harder to sustain as the company scales.",
];

const BOARD_NEXT_STEP =
  "Implement a 90-day structured build focused on health scoring, onboarding architecture, renewal forecasting, and CS-to-GTM alignment.";

/* --------------------------- shared atoms --------------------------- */

function ScoreBar() {
  const pct = ((COMPOSITE - 5) / (COMPOSITE_MAX - 5)) * 100;
  return (
    <div className="w-full">
      <div className="relative">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full">
          <div className="flex-1 bg-rose-500/40" />
          <div className="flex-1 bg-amber-500/40" />
          <div className="flex-1 bg-emerald-500/40" />
          <div className="flex-1 bg-cyan-500/40" />
        </div>
        <div
          className="absolute -top-1 -translate-x-1/2"
          style={{ left: `${pct}%` }}
        >
          <div className="w-1 h-4.5 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.15)]" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {TIERS.map((t) => {
          const active = t.label === CURRENT_TIER.label;
          return (
            <div
              key={t.label}
              className={`rounded-lg border px-2 py-2 ${
                active
                  ? "border-amber-400/40 bg-amber-500/10"
                  : "border-white/5 bg-slate-900/40"
              }`}
            >
              <p
                className={`text-[11px] font-semibold ${
                  active ? "text-amber-200" : "text-slate-400"
                }`}
              >
                {t.min}–{t.max}
              </p>
              <p
                className={`text-[10px] mt-0.5 leading-tight ${
                  active ? "text-amber-100" : "text-slate-500"
                }`}
              >
                {t.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------ Executive Summary ------------------------ */

function ExecutiveSummaryTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const riskPillars = PILLARS.filter((p) => p.level !== null && p.level <= 2).sort(
    (a, b) => (a.level ?? 9) - (b.level ?? 9),
  );

  return (
    <div className="space-y-6">
      {/* Hero score */}
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/5 p-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold inline-flex items-center gap-1 justify-center text-center">
              Weighted CS Health Score
              <span title={COMPOSITE_TOOLTIP} className="inline-flex cursor-help">
                <Info className="w-3 h-3 text-slate-500" />
              </span>
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-white">{COMPOSITE}</span>
              <span className="text-xl text-slate-500">/ {COMPOSITE_MAX}</span>
            </div>
            <span className="mt-3 inline-flex items-center rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
              {CURRENT_TIER.label}
            </span>
            <p className="mt-2 text-xs text-slate-400">90-day build program</p>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold mb-3">
              Engagement score band
            </p>
            <ScoreBar />
          </div>
        </div>
      </div>

      {/* Why this matters + expected outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-300" />
            <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
              Why This Matters
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-2">If left unaddressed:</p>
          <ul className="space-y-1.5">
            {WHY_IT_MATTERS.map((w) => (
              <li key={w} className="text-sm text-slate-200 flex gap-2">
                <span className="text-rose-400/70 mt-px">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-1">
              Recommended Action
            </p>
            <p className="text-sm font-semibold text-white">90-Day Structured Build</p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
              Expected Outcomes
            </h3>
          </div>
          <ul className="space-y-2">
            {EXPECTED_OUTCOMES.map((o) => (
              <li key={o} className="text-sm text-slate-200 flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 shrink-0 mt-px" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Highest-risk + top actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highest risk pillars */}
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-300" />
            <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
              Highest-Risk Pillars
            </h3>
          </div>
          <div className="space-y-2.5">
            {riskPillars.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2.5"
              >
                <span className="text-sm text-slate-200">{p.name}</span>
                <span
                  className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${levelTone(p.level)}`}
                >
                  {statusText(p)}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate("Pillar Scores")}
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            View all pillar scores
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top 5 actions */}
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-cyan-300" />
            <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
              Top 5 Recommended Actions
            </h3>
          </div>
          <ol className="space-y-2.5">
            {TOP_ACTIONS.map((a, i) => (
              <li
                key={a.title}
                className="flex gap-3 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2.5"
              >
                <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[11px] font-semibold text-slate-300">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Recommendation callout */}
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
          <span className="font-semibold text-white">Engagement recommendation:</span>{" "}
          a {CURRENT_TIER.label.toLowerCase()} — a 90-day build program on a weekly
          operating rhythm — to move from reactive CS execution to a signal-driven,
          commercially accountable retention engine.
        </p>
      </div>
    </div>
  );
}

/* --------------------------- Pillar Scores --------------------------- */

function PillarScoresTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {PILLARS.map((p) => {
        const Icon = p.icon;
        return (
          <div
            key={p.name}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <Icon className="w-4 h-4 text-slate-300" />
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug pt-1">
                  {p.name}
                </h3>
              </div>
              <span
                className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${levelTone(p.level)}`}
              >
                {statusText(p)}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-1">
                  What this measures
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{p.measures}</p>
              </div>
              <PeerBenchmark value={p.benchmark} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-1.5">
                  Key evidence
                </p>
                <ul className="space-y-1.5">
                  {p.evidence.slice(0, 3).map((e) => (
                    <li key={e.text} className="text-xs text-slate-400 flex gap-2">
                      <span className="text-slate-600 mt-px">•</span>
                      <span>
                        {e.text} <SourceTag source={e.source} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-1">
                Recommended intervention
              </p>
              <p className="text-xs font-medium text-slate-200 inline-flex items-start gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                {p.intervention}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------- Evidence Review --------------------------- */

function EvidenceReviewTab() {
  const [open, setOpen] = useState<string | null>(PILLARS[1].name);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400 max-w-3xl">
        Evidence captured from customer data, operator interviews, and operating
        artifacts — organized by pillar with the recommended fix.
      </p>
      {PILLARS.map((p) => {
        const Icon = p.icon;
        const expanded = open === p.name;
        return (
          <div
            key={p.name}
            className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden"
          >
            <button
              onClick={() => setOpen(expanded ? null : p.name)}
              data-testid={`evidence-${p.short.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-white">{p.name}</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${levelTone(p.level)}`}
                >
                  {statusText(p)}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
            {expanded && (
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-2.5">
                    Evidence
                  </p>
                  <ul className="space-y-2">
                    {p.evidence.map((e) => (
                      <li key={e.text} className="text-xs text-slate-300 flex gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-px" />
                        <span>
                          {e.text} <SourceTag source={e.source} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300/80 font-semibold mb-2.5">
                    Recommended fix
                  </p>
                  <p className="text-xs text-slate-200 leading-relaxed flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 shrink-0 mt-px" />
                    <span>{p.intervention}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------- Engagement Plan --------------------------- */

function EngagementPlanTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Recommended Tier", value: CURRENT_TIER.label, icon: Target },
          { label: "Duration", value: "90 days", icon: Calendar },
          { label: "Operating Cadence", value: "Weekly rhythm", icon: Activity },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-400">{s.label}</p>
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Focus areas */}
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
        <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold mb-4">
          Focus Areas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {FOCUS_AREAS.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.name}
                className="rounded-lg border border-white/5 bg-slate-900/40 p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-white">{f.name}</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 90-day timeline */}
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
        <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold mb-4">
          90-Day Operating Plan
        </h3>
        <div className="space-y-4">
          {PLAN_WEEKS.map((w) => (
            <div key={w.span} className="flex gap-4">
              <div className="shrink-0 w-1 rounded-full bg-cyan-500/30" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-cyan-200 mb-2">{w.span}</p>
                <ul className="space-y-1.5">
                  {w.items.map((i) => (
                    <li key={i} className="text-xs text-slate-300 flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 shrink-0 mt-px" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Board-Ready Output --------------------------- */

function BoardOutputTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { toast } = useToast();

  const buttons: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    primary?: boolean;
  }[] = [
    {
      label: "Export Board Summary",
      icon: Download,
      primary: true,
      onClick: () =>
        toast({
          title: "Board summary exported",
          description: "A 1-page executive PDF has been prepared (demo).",
        }),
    },
    {
      label: "Generate 90-Day Plan",
      icon: FileText,
      onClick: () => onNavigate("Engagement Plan"),
    },
    {
      label: "View Source Evidence",
      icon: ClipboardList,
      onClick: () => onNavigate("Evidence Review"),
    },
    {
      label: "Compare Against Portfolio Benchmark",
      icon: BarChart3,
      onClick: () =>
        toast({
          title: "Benchmark comparison",
          description:
            "This company scores below the portfolio median on signal infrastructure (demo).",
        }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-cyan-300" />
          <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
            Executive Narrative
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span
            title={COMPOSITE_TOOLTIP}
            className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200 cursor-help"
          >
            {COMPOSITE} / {COMPOSITE_MAX} · {CURRENT_TIER.label}
            <Info className="w-3 h-3 opacity-60" />
          </span>
          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-300">
            90-day build program
          </span>
        </div>
        <div className="space-y-4 max-w-3xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-2">
              Current State
            </p>
            <div className="space-y-2.5">
              {BOARD_CURRENT_STATE.map((para) => (
                <p key={para} className="text-base text-slate-200 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </div>
          <div className="pt-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-2">
              Recommended Next Step
            </p>
            <p className="text-base text-slate-200 leading-relaxed">{BOARD_NEXT_STEP}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
        <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold mb-4">
          Board Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {buttons.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.label}
                onClick={b.onClick}
                data-testid={`board-${b.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  b.primary
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
          CS Rescue is not replacing CRM or CS tooling. It is an operator-led
          diagnostic and intelligence layer that turns customer data, interviews, and
          operating evidence into a prioritized value creation plan.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- Page ------------------------------- */

export default function CSHealthScorecard() {
  const [tab, setTab] = useState<Tab>(initialTab);

  const selectTab = (t: Tab) => {
    setTab(t);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", TAB_SLUGS[t]);
      window.history.replaceState({}, "", url);
    }
  };

  return (
    <div className="min-h-screen bg-[#070912] text-slate-200">
      <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1300px] mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  CS Rescue · CS Health Scorecard
                </h1>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                  Illustrative demo data
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Operator-led CS diagnostic for PE operating partners &amp; portfolio
                leaders
              </p>
            </div>
            <div className="text-xs text-slate-500 shrink-0">
              Diagnostic · June 2026
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-cyan-400/15 bg-cyan-500/[0.04] px-4 py-2.5">
            <p className="text-xs text-slate-300 leading-relaxed">{PRODUCT_BANNER}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <span className="font-semibold uppercase tracking-[0.16em] text-cyan-300/90">
              CS Rescue Diagnostic
            </span>
            <span className="text-slate-600">—</span>
            {DIAGNOSTIC_STEPS.map((s, i) => (
              <span key={s} className="inline-flex items-center gap-2 text-slate-400">
                <span>{s}</span>
                {i < DIAGNOSTIC_STEPS.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                )}
              </span>
            ))}
          </div>

          <nav className="flex flex-wrap gap-1 mt-5">
            {TABS.map((t) => {
              const active = t === tab;
              return (
                <button
                  key={t}
                  onClick={() => selectTab(t)}
                  data-testid={`tab-${TAB_SLUGS[t]}`}
                  className={[
                    "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-cyan-500/15 text-cyan-200"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-[1300px] mx-auto px-6 py-8">
        {tab === "Executive Summary" && (
          <ExecutiveSummaryTab onNavigate={selectTab} />
        )}
        {tab === "Pillar Scores" && <PillarScoresTab />}
        {tab === "Evidence Review" && <EvidenceReviewTab />}
        {tab === "Engagement Plan" && <EngagementPlanTab />}
        {tab === "Board-Ready Output" && <BoardOutputTab onNavigate={selectTab} />}
      </main>

      <footer className="max-w-[1300px] mx-auto px-6 py-6 border-t border-white/10">
        <p className="text-[11px] text-slate-600">
          CS Rescue · Operator-led diagnostic &amp; intelligence layer · Composite of
          5 scored pillars (1–4) plus a qualitative leadership assessment · Illustrative
          demo data only
        </p>
      </footer>
    </div>
  );
}
