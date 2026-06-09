import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  CheckCircle2,
  Circle,
  Clock,
  RefreshCw,
  Send,
  Calendar,
  AlertCircle,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ---------------------------------------------------------------- *
 * CS Rescue · CEATI Operating Review — self-contained demo page.
 * Illustrative demo data only. Read-only intelligence layer.
 * ---------------------------------------------------------------- */

const DATA_SOURCES = [
  "HubSpot",
  "Mixpanel",
  "Webex",
  "Teams",
  "Research Portal",
  "Event Platform",
];

const TABS = ["Actions", "Overview", "Risk", "Growth", "Account Brief"] as const;
type Tab = (typeof TABS)[number];

const PRODUCT_BANNER =
  "CS Rescue transforms activity across HubSpot, Teams, Webex, Research Portal, and CEATI systems into prioritized actions and executive briefings. Powered by BackEngine integrations and AI reasoning.";

const HEALTH_TOOLTIP =
  "Composite score based on participation, event attendance, research engagement, stakeholder activity, and program breadth.";

const READINESS_TOOLTIP =
  "Readiness score based on cross-program engagement, benchmark consumption, initiative signals, and peer-pattern similarity.";

const TAB_SLUGS: Record<Tab, string> = {
  Overview: "overview",
  Risk: "risk",
  Growth: "growth",
  "Account Brief": "account-brief",
  Actions: "actions",
};
const SLUG_TO_TAB = Object.fromEntries(
  Object.entries(TAB_SLUGS).map(([tab, slug]) => [slug, tab as Tab]),
) as Record<string, Tab>;

function initialTab(): Tab {
  if (typeof window === "undefined") return "Actions";
  const slug = new URLSearchParams(window.location.search).get("tab");
  return (slug && SLUG_TO_TAB[slug]) || "Actions";
}

/* -------------------------- shared atoms -------------------------- */

function SourceTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300">
      {label}
    </span>
  );
}

function HealthPill({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/30"
      : score >= 55
        ? "text-amber-300 bg-amber-500/10 border-amber-400/30"
        : "text-rose-300 bg-rose-500/10 border-rose-400/30";
  return (
    <span
      title={HEALTH_TOOLTIP}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold cursor-help ${tone}`}
    >
      {score}
      <Info className="w-3 h-3 opacity-60" />
    </span>
  );
}

/* ----------------------------- Overview ----------------------------- */

const METRICS: {
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaTone: string;
  icon: LucideIcon;
  sub: string;
  tip?: string;
}[] = [
  {
    label: "Member Health Score",
    value: "72",
    unit: "/100",
    delta: "+3 vs last week",
    deltaTone: "text-emerald-300",
    icon: Activity,
    sub: "Portfolio average across 157 utilities",
    tip: HEALTH_TOOLTIP,
  },
  {
    label: "Value Realization",
    value: "68",
    unit: "%",
    delta: "+2 pts MoM",
    deltaTone: "text-emerald-300",
    icon: TrendingUp,
    sub: "Members capturing program value",
  },
  {
    label: "Expansion Opportunities",
    value: "23",
    unit: "",
    delta: "8 high-confidence",
    deltaTone: "text-cyan-300",
    icon: Target,
    sub: "Cross-program signals detected",
  },
  {
    label: "Priority Utilities",
    value: "11",
    unit: "",
    delta: "3 critical · 8 watch",
    deltaTone: "text-rose-300",
    icon: AlertTriangle,
    sub: "Health score below threshold",
  },
];

const WHAT_CHANGED: { text: string; dir: "up" | "down" }[] = [
  { text: "Northshore expansion readiness increased", dir: "up" },
  { text: "Summit Cyber Security interest detected", dir: "up" },
  { text: "Cascade sponsor departed", dir: "down" },
  { text: "Meridian engagement declined", dir: "down" },
];

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-slate-400 inline-flex items-center gap-1">
                  {m.label}
                  {m.tip && (
                    <span title={m.tip} className="inline-flex cursor-help">
                      <Info className="w-3 h-3 text-slate-500" />
                    </span>
                  )}
                </p>
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{m.value}</span>
                <span className="text-base text-slate-500">{m.unit}</span>
              </div>
              <p className={`text-xs font-medium mt-1.5 ${m.deltaTone}`}>{m.delta}</p>
              <p className="text-[11px] text-slate-500 mt-2">{m.sub}</p>
            </div>
          );
        })}
      </div>

      {/* What Changed This Week */}
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
        <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold mb-4">
          What Changed This Week?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHAT_CHANGED.map((c) => {
            const up = c.dir === "up";
            const Icon = up ? TrendingUp : TrendingDown;
            return (
              <div
                key={c.text}
                className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2.5"
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${up ? "text-emerald-300" : "text-rose-300"}`}
                />
                <span className="text-sm text-slate-200">{c.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Executive Summary */}
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-300 font-semibold">
            AI Executive Summary
          </h3>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
          Portfolio health improved this week, but risk is concentrated in 11
          utilities. Cascade Power and Meridian Grid show sponsor-change plus
          declining research engagement, while Northshore Hydro is the strongest
          cross-program expansion opportunity.
        </p>
      </div>

      {/* Data sources */}
      <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
            Data Sources
          </span>
          <div className="flex flex-wrap gap-2">
            {DATA_SOURCES.map((s) => (
              <SourceTag key={s} label={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Risk ------------------------------- */

interface RiskUtility {
  name: string;
  health: number;
  trend: number;
  action: string;
  signals: { label: string; detail: string; source: string }[];
}

const RISK_UTILITIES: RiskUtility[] = [
  {
    name: "Cascade Power Authority",
    health: 41,
    trend: -14,
    action: "Schedule executive re-engagement this week",
    signals: [
      { label: "Executive sponsor changed", detail: "VP Operations departed Apr 2026", source: "HubSpot" },
      { label: "Event attendance ↓ 58%", detail: "3 of last 7 events missed (90d)", source: "Event Platform" },
      { label: "Research portal logins ↓ 71%", detail: "Avg 1.2/mo vs 4.1 baseline", source: "Research Portal" },
      { label: "Program participation 2 → 1", detail: "Withdrew from T&D working group", source: "Mixpanel" },
    ],
  },
  {
    name: "Meridian Grid Services",
    health: 48,
    trend: -9,
    action: "Send value recap and book QBR",
    signals: [
      { label: "Research portal use ↓ 62%", detail: "Last login 47 days ago", source: "Research Portal" },
      { label: "No touchpoints in 30 days", detail: "0 Webex / Teams meetings", source: "Webex · Teams" },
      { label: "Reduced program participation", detail: "Active in 2 of 5 enrolled", source: "Event Platform" },
    ],
  },
  {
    name: "Lakeshore Energy",
    health: 52,
    trend: -6,
    action: "Trigger renewal check-in",
    signals: [
      { label: "No QBR in 9 months", detail: "Last touch: Sept 2025", source: "HubSpot" },
      { label: "Skipped Generation Summit", detail: "Event attendance ↓ 34%", source: "Event Platform" },
      { label: "No new report access 60d", detail: "Research downloads flat", source: "Research Portal" },
    ],
  },
];

function RiskTab() {
  const [open, setOpen] = useState<string | null>(RISK_UTILITIES[0].name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white tracking-tight">
          Priority Utilities
        </h2>
        <span className="text-xs text-slate-500">Ranked by non-renewal risk</span>
      </div>

      <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-200">
          <span className="font-semibold text-white">AI risk pattern:</span> Cascade
          and Meridian share the highest-confidence non-renewal pattern — sponsor
          change followed by a ≥60% drop in research portal use within 90 days. Based
          on benchmark patterns and illustrative demo data.
        </p>
      </div>

      {RISK_UTILITIES.map((u) => {
        const expanded = open === u.name;
        return (
          <div
            key={u.name}
            className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden"
          >
            <button
              onClick={() => setOpen(expanded ? null : u.name)}
              data-testid={`risk-${u.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="w-full text-left p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">{u.name}</h3>
                  <HealthPill score={u.health} />
                  <span className="text-xs font-medium text-rose-300">
                    ▼ {Math.abs(u.trend)} pts
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  <span className="text-cyan-300 font-medium">Recommended:</span>{" "}
                  {u.action}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {expanded && (
              <div className="px-5 pb-5 pt-1 border-t border-white/5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-3 mt-3">
                  Source evidence
                </p>
                <div className="space-y-2">
                  {u.signals.map((sig, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200">{sig.label}</p>
                        <p className="text-xs text-slate-500">{sig.detail}</p>
                      </div>
                      <SourceTag label={sig.source} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Growth ------------------------------ */

const GROWTH: {
  utility: string;
  program: string;
  score: number;
  why: string;
  action: string;
  evidence: string[];
}[] = [
  {
    utility: "Northshore Hydro",
    program: "Asset Management",
    score: 92,
    why: "Attended 6 of 7 T&D events and downloaded the asset lifecycle benchmark twice",
    action: "Introduce Asset Management program",
    evidence: [
      "Attended 6 of last 7 T&D events",
      "Downloaded Asset Lifecycle benchmark twice",
      "Viewed Asset Management content",
      "Similar utilities expanded into this program",
    ],
  },
  {
    utility: "Summit Energy Co-op",
    program: "Cyber Security",
    score: 88,
    why: "OT/IT initiative signals and QBR upcoming",
    action: "Include Cyber Security in QBR",
    evidence: [
      "OT/IT modernization initiative announced",
      "Attended 2 Cyber Security webinars",
      "QBR scheduled within 30 days",
      "Peer utilities in cohort enrolled in Cyber Security",
    ],
  },
  {
    utility: "Cascade Power Authority",
    program: "Power Quality",
    score: 84,
    why: "Reliability questions surfacing in research portal",
    action: "Send Power Quality case study",
    evidence: [
      "Reliability questions raised in research portal",
      "Downloaded Power Quality benchmark twice",
      "Searched outage-reduction content",
      "Peer PNW utilities active in Power Quality",
    ],
  },
  {
    utility: "Pinecrest Utilities",
    program: "Distribution Engineering",
    score: 81,
    why: "Peer cohort actively attending working groups",
    action: "Invite to next working group",
    evidence: [
      "Peer cohort actively attending working groups",
      "Viewed Distribution Engineering content 3×",
      "Asked about working group eligibility",
      "Enrolled peers expanded into this program",
    ],
  },
];

function GrowthTab() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-5 flex items-start gap-3">
        <Target className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
          <span className="font-semibold text-white">8 utilities</span> are actively
          engaging with content outside their enrolled programs. These members
          demonstrate stronger participation breadth and higher expansion potential.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.3fr_1.2fr_0.6fr_2fr_1.4fr] gap-4 px-5 py-3 border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
          <span>Utility</span>
          <span>Recommended Program</span>
          <span>Readiness</span>
          <span>Why Now</span>
          <span>Suggested Action</span>
        </div>
        <div className="divide-y divide-white/5">
          {GROWTH.map((g) => {
            const expanded = open === g.utility;
            return (
              <div key={g.utility}>
                <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1.2fr_0.6fr_2fr_1.4fr] gap-2 md:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="text-sm font-semibold text-white">{g.utility}</div>
                  <div className="text-sm text-cyan-300">{g.program}</div>
                  <div>
                    <span
                      title={READINESS_TOOLTIP}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 cursor-help"
                    >
                      {g.score}
                      <Info className="w-3 h-3 opacity-60" />
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">{g.why}</div>
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs font-medium text-slate-200 inline-flex items-start gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      {g.action}
                    </div>
                    <button
                      onClick={() => setOpen(expanded ? null : g.utility)}
                      data-testid={`why-score-${g.utility.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors w-fit"
                    >
                      Why this score?
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="px-5 pb-4">
                    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-2.5">
                        Why this score
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {g.evidence.map((e, i) => (
                          <li key={i} className="text-xs text-slate-300 flex gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 shrink-0 mt-px" />
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
          Utilities engaging across multiple CEATI programs are more likely to renew
          and expand. CS Rescue flags adjacent program interest before it becomes an
          explicit sales conversation.
        </p>
      </div>
    </div>
  );
}

/* --------------------------- Account Brief --------------------------- */

const STAKEHOLDERS = [
  { name: "Maria Chen", role: "VP Engineering", note: "Strong T&D engagement, attended 3 of last 4 events", tone: "emerald", badge: "Champion" },
  { name: "David Park", role: "Director, Operations", note: "Quiet for 47 days — primary risk signal", tone: "amber", badge: "Decision Maker" },
  { name: "Andre Silva", role: "Manager, Grid Reliability", note: "Active in Power Quality clinic discussions", tone: "emerald", badge: "Influencer" },
  { name: "(vacant)", role: "VP Operations", note: "Former exec sponsor departed Apr 2026", tone: "rose", badge: "Executive Sponsor" },
];

const ACTIVITY = [
  "3 missed events — Generation Summit, T&D forum, Power Quality clinic",
  "2 research portal logins — both by Maria Chen, viewed reliability reports",
  "1 unanswered Teams thread — renewal timing question (5 days)",
  "Renewal in 4 months — decision committee not yet identified",
];

const BRIEF_RISKS = [
  "Sponsor vacuum at exec level — VP Operations unfilled since April",
  "Withdrew from T&D working group — historically a leading non-renewal signal",
  "Decision committee not identified ahead of renewal",
];

const BRIEF_OPPS = [
  "Power Quality program fit (readiness 84) — team downloaded PQ benchmark twice",
  "Asset lifecycle benchmarking aligns with their 2027 capital plan",
  "Peer cohort referral — 3 PNW utilities renewed at premium tier",
];

const TALKING_POINTS = [
  "Acknowledge the leadership transition; offer to brief a new VP of Operations",
  "Lead with reliability data — peer PNW utilities have reduced outages through Power Quality programs",
  "Frame Asset Management as support for their 2027 capital plan, not an upsell",
  "Avoid renewal pricing — sponsor isn't identified yet",
];

const BRIEF_ACTIONS = [
  { action: "Schedule exec intro with Maria Chen", meta: "This week · Patricia" },
  { action: "Send PNW reliability case study", meta: "Today · CS team" },
  { action: "Invite David Park to Power Quality clinic", meta: "Next 14 days" },
  { action: "Build renewal stakeholder map", meta: "Before July 1" },
];

const toneRing: Record<string, string> = {
  emerald: "border-emerald-400/30",
  amber: "border-amber-400/30",
  rose: "border-rose-400/30",
};

const badgeStyles: Record<string, string> = {
  "Executive Sponsor": "text-violet-300 bg-violet-500/10 border-violet-400/30",
  Champion: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  Influencer: "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
  "Decision Maker": "text-amber-300 bg-amber-500/10 border-amber-400/30",
};

function BriefColumn({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
      <h3 className={`text-xs uppercase tracking-[0.16em] font-semibold mb-3 ${accent}`}>
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-300 leading-relaxed flex gap-2">
            <span className="text-slate-600 mt-px">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountBriefTab() {
  const { toast } = useToast();
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerated(true);
    toast({
      title: "Briefing refreshed",
      description: "Cascade Power Authority — 90-second briefing refreshed.",
    });
    window.setTimeout(() => setGenerated(false), 1600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`rounded-xl border bg-slate-950/40 p-6 transition-all ${
          generated ? "border-cyan-400/60 ring-1 ring-cyan-400/30" : "border-white/10"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white">Cascade Power Authority</h2>
              <span
                title={HEALTH_TOOLTIP}
                className="inline-flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300 cursor-help"
              >
                Health 41 · At Risk
                <Info className="w-3 h-3 opacity-60" />
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1.5">
              Pacific Northwest · Member since 2017 · Enrolled in 4 programs
            </p>
            <p className="text-xs text-slate-500 mt-1">Next touchpoint: Thu 10:00 AM</p>
          </div>
          <button
            onClick={handleGenerate}
            data-testid="refresh-briefing"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/25 transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${generated ? "animate-spin" : ""}`} />
            Refresh Briefing
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-4 py-3">
          <p className="text-sm text-cyan-100">
            “30–60 minutes of account prep reduced to a 90-second briefing.”
          </p>
        </div>
      </div>

      {/* Stakeholders + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
          <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-3">
            Stakeholders
          </h3>
          <div className="space-y-3">
            {STAKEHOLDERS.map((s) => (
              <div
                key={s.name}
                className={`rounded-lg border bg-slate-900/40 p-3 ${toneRing[s.tone]}`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-sm font-semibold text-white">{s.name}</span>
                  <span className="text-xs text-slate-500">· {s.role}</span>
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badgeStyles[s.badge]}`}
                  >
                    {s.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{s.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
          <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-400/80 font-semibold mb-3">
            Recent Activity (30 days)
          </h3>
          <ul className="space-y-2.5">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="text-sm text-slate-300 leading-relaxed flex gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Risks + opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BriefColumn title="Risks" items={BRIEF_RISKS} accent="text-rose-300" />
        <BriefColumn title="Opportunities" items={BRIEF_OPPS} accent="text-emerald-300" />
      </div>

      {/* Talking points + next actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BriefColumn title="Suggested Talking Points" items={TALKING_POINTS} accent="text-cyan-300" />
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
          <h3 className="text-xs uppercase tracking-[0.16em] text-cyan-300 font-semibold mb-3">
            Recommended Next Actions
          </h3>
          <ul className="space-y-2.5">
            {BRIEF_ACTIONS.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2.5"
              >
                <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-200">{a.action}</p>
                  <p className="text-xs text-slate-500">{a.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Actions ------------------------------ */

type Status = "Not Started" | "In Progress" | "Done";
const STATUS_CYCLE: Status[] = ["Not Started", "In Progress", "Done"];

const statusStyles: Record<Status, string> = {
  "Not Started": "text-slate-400 bg-white/5 border-white/10",
  "In Progress": "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
  Done: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
};

const impactStyles: Record<string, string> = {
  High: "text-rose-300 bg-rose-500/10 border-rose-400/30",
  Medium: "text-amber-300 bg-amber-500/10 border-amber-400/30",
  Low: "text-slate-300 bg-white/5 border-white/10",
};

interface ActionItem {
  action: string;
  why: string;
  owner: string;
  due: string;
  impact: "High" | "Medium" | "Low";
  status: Status;
}

const INITIAL_ACTIONS: ActionItem[] = [
  { action: "Re-engage Cascade Power Authority", why: "Health score dropped 14 points and sponsor changed", owner: "Patricia", due: "This week", impact: "High", status: "Not Started" },
  { action: "Introduce Asset Management to Northshore Hydro", why: "Strongest expansion signal in portfolio", owner: "Hailey", due: "7 days", impact: "High", status: "Not Started" },
  { action: "Prepare Summit Energy QBR", why: "Cyber Security readiness at 88", owner: "Patricia", due: "Jun 16", impact: "Medium", status: "In Progress" },
  { action: "Investigate declining T&D attendance", why: "Attendance down across 6 utilities", owner: "Hailey + Program Lead", due: "14 days", impact: "Medium", status: "Not Started" },
  { action: "Validate 4 borderline health scores", why: "Human review recommended before automated outreach", owner: "Patricia", due: "Friday", impact: "Low", status: "Not Started" },
];

function ActionsTab() {
  const { toast } = useToast();
  const [actions, setActions] = useState<ActionItem[]>(INITIAL_ACTIONS);

  const cycleStatus = (idx: number) => {
    setActions((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(a.status) + 1) % STATUS_CYCLE.length];
        return { ...a, status: next };
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-white tracking-tight">
          What Matters This Week
        </h2>
      </div>

      {actions.map((a, idx) => {
        const StatusIcon =
          a.status === "Done" ? CheckCircle2 : a.status === "In Progress" ? Clock : Circle;
        return (
          <div
            key={a.action}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-5"
          >
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-md bg-white/5 text-xs font-semibold text-slate-400 shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">{a.action}</h3>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${impactStyles[a.impact]}`}
                  >
                    {a.impact} impact
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">{a.why}</p>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {a.owner}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {a.due}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => cycleStatus(idx)}
                    data-testid={`status-${idx}`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${statusStyles[a.status]}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {a.status}
                  </button>
                  <button
                    onClick={() =>
                      toast({
                        title: "Synced to HubSpot",
                        description: `Task created: ${a.action}`,
                      })
                    }
                    data-testid={`sync-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-white/20 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Sync to HubSpot Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Page ------------------------------- */

export default function Ceati() {
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
      {/* Global header */}
      <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1300px] mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  CS Rescue · CEATI Operating Review
                </h1>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                  Illustrative demo data
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Weekly membership intelligence powered by BackEngine + AI reasoning
              </p>
            </div>
            <div className="text-xs text-slate-500 shrink-0">Week of June 8, 2026</div>
          </div>

          {/* Persistent product banner */}
          <div className="mt-4 rounded-lg border border-cyan-400/15 bg-cyan-500/[0.04] px-4 py-2.5">
            <p className="text-xs text-slate-300 leading-relaxed">{PRODUCT_BANNER}</p>
          </div>

          {/* Tabs */}
          <nav className="flex flex-wrap gap-1 mt-5">
            {TABS.map((t) => {
              const active = t === tab;
              return (
                <button
                  key={t}
                  onClick={() => selectTab(t)}
                  data-testid={`tab-${t.toLowerCase().replace(/[^a-z]+/g, "-")}`}
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
        {tab === "Overview" && <OverviewTab />}
        {tab === "Risk" && <RiskTab />}
        {tab === "Growth" && <GrowthTab />}
        {tab === "Account Brief" && <AccountBriefTab />}
        {tab === "Actions" && <ActionsTab />}
      </main>

      <footer className="max-w-[1300px] mx-auto px-6 py-6 border-t border-white/10">
        <p className="text-[11px] text-slate-600">
          CS Rescue Intelligence Engine · Read-only intelligence layer powered by
          BackEngine integrations and AI reasoning · Sources: HubSpot · Mixpanel ·
          Webex · Teams · Research Portal · Event Platform
        </p>
      </footer>
    </div>
  );
}
