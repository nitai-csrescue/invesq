import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle, TrendingUp, Activity, Sparkles, Building2, User,
  Search, ArrowRight, Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/lib/persona";
import {
  filterArchInsights,
  type ArchInsight,
  type ArchInsightKind,
  type ArchInsightScope,
} from "@/data/architectureInsights";
import { searchInsights, SEARCH_SUGGESTIONS } from "@/lib/insightSearch";

const KIND_META: Record<ArchInsightKind, {
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof COLORS;
  label: string;
}> = {
  risk: { icon: AlertTriangle, color: "rose", label: "Risk" },
  pain: { icon: Activity, color: "amber", label: "Pain Point" },
  opportunity: { icon: TrendingUp, color: "emerald", label: "Opportunity" },
  action: { icon: Sparkles, color: "cyan", label: "Action" },
};

const COLORS = {
  rose: { iconBg: "bg-rose-500/15", text: "text-rose-300", ring: "ring-rose-400/40", selBorder: "border-rose-400/70", selBg: "bg-rose-500/10" },
  amber: { iconBg: "bg-amber-500/15", text: "text-amber-300", ring: "ring-amber-400/40", selBorder: "border-amber-400/70", selBg: "bg-amber-500/10" },
  emerald: { iconBg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-emerald-400/40", selBorder: "border-emerald-400/70", selBg: "bg-emerald-500/10" },
  cyan: { iconBg: "bg-cyan-500/15", text: "text-cyan-300", ring: "ring-cyan-400/40", selBorder: "border-cyan-400/70", selBg: "bg-cyan-500/10" },
} as const;

/** Writes an architecture-handoff payload and navigates so Architecture
 *  page picks it up via the existing `cs-rescue:highlight` sessionStorage hook. */
function handoffToArchitecture(insight: ArchInsight, persona: string, navigate: (to: string) => void) {
  try {
    sessionStorage.setItem("cs-rescue:highlight", JSON.stringify({
      nodeIds: insight.nodeIds,
      edgeIds: insight.edgeIds ?? [],
      persona,
      viewMode: "business",
      reason: "AI_COPILOT",
      goal: insight.title,
      ts: Date.now(),
    }));
  } catch {
    /* sessionStorage may be unavailable */
  }
  navigate("/platform/architecture");
}

export function DashboardInsights() {
  const { persona } = usePersona();
  const [, navigate] = useLocation();
  const [scope, setScope] = useState<ArchInsightScope>("company");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const feedInsights = useMemo(
    () => filterArchInsights({ persona, scope, accountId: null }),
    [persona, scope],
  );

  const searchResult = useMemo(
    () => (submittedQuery ? searchInsights(submittedQuery, persona) : null),
    [submittedQuery, persona],
  );

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmittedQuery(q);
  };

  const onClear = () => {
    setQuery("");
    setSubmittedQuery(null);
  };

  return (
    <section
      className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"
      data-testid="dashboard-insights"
    >
      {/* Header row with scope toggle */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">
              What matters now
            </p>
            <p className="text-sm font-bold text-white leading-tight mt-0.5">
              {feedInsights.length === 0
                ? "No insights for this view"
                : `Top ${feedInsights.length} ${feedInsights.length === 1 ? "insight" : "insights"} for ${scope === "company" ? "the company" : "this customer"}`}
            </p>
          </div>
        </div>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>

      {/* Insight feed */}
      {feedInsights.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-6 text-center">
          No insights for this persona / scope. Try switching personas or scope.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {feedInsights.map((ins) => (
            <InsightCard
              key={ins.id}
              insight={ins}
              onClick={() => handoffToArchitecture(ins, persona, navigate)}
            />
          ))}
        </div>
      )}

      {/* AI search */}
      <div className="mt-5 pt-4 border-t border-white/10" data-tour="ai-search">
        <form onSubmit={onSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your customers — e.g. “What is the biggest risk right now?”"
            data-testid="ai-search-input"
            aria-label="Ask AI about your customers"
            className="w-full pl-10 pr-24 py-2.5 rounded-lg bg-slate-900/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {submittedQuery && (
              <button
                type="button"
                onClick={onClear}
                data-testid="ai-search-clear"
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              data-testid="ai-search-submit"
              disabled={!query.trim()}
              className="text-[11px] font-medium px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Ask
            </button>
          </div>
        </form>

        {/* Suggestion chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mr-1">Try:</span>
          {SEARCH_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setQuery(s); setSubmittedQuery(s); }}
              data-testid={`ai-search-suggestion-${s.slice(0, 12)}`}
              className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-slate-900/60 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search results */}
        {searchResult && (
          <div className="mt-4 rounded-xl border border-purple-400/30 bg-purple-500/5 p-4" data-testid="ai-search-results">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <p className="text-[11px] uppercase tracking-wider font-semibold text-purple-200">
                Answer
              </p>
              <p className="text-xs text-slate-300 truncate">{searchResult.summary}</p>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 italic">
              You asked: “{searchResult.query}”
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResult.insights.map((ins) => (
                <ResultCard
                  key={ins.id}
                  insight={ins}
                  onView={() => handoffToArchitecture(ins, persona, navigate)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function InsightCard({ insight, onClick }: { insight: ArchInsight; onClick: () => void }) {
  const meta = KIND_META[insight.kind];
  const c = COLORS[meta.color];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      data-testid={`dashboard-insight-${insight.id}`}
      className={cn(
        "text-left rounded-xl border border-white/10 bg-slate-900/60 p-3 transition-all",
        "hover:bg-slate-900/90 hover:-translate-y-0.5 hover:border-cyan-400/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", c.iconBg, c.text)}>
          <Icon className="w-3 h-3" />
        </div>
        <span className={cn("text-[10px] uppercase font-semibold tracking-wider", c.text)}>
          {meta.label}
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded",
            insight.severity === "high" && "bg-rose-500/15 text-rose-300",
            insight.severity === "medium" && "bg-amber-500/15 text-amber-300",
            insight.severity === "low" && "bg-slate-500/20 text-slate-300",
          )}
        >
          {insight.severity}
        </span>
      </div>
      <p className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-1">
        {insight.title}
      </p>
      {insight.metric && (
        <p className={cn("text-[11px] font-bold tabular-nums", c.text)}>{insight.metric}</p>
      )}
      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-snug">
        {insight.body}
      </p>
      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Network className="w-2.5 h-2.5" />
          {insight.nodeIds.length} components
        </span>
        <span className="flex items-center gap-1 text-cyan-300 group-hover:underline">
          View in Architecture <ArrowRight className="w-2.5 h-2.5" />
        </span>
      </div>
    </button>
  );
}

function ResultCard({ insight, onView }: { insight: ArchInsight; onView: () => void }) {
  const meta = KIND_META[insight.kind];
  const c = COLORS[meta.color];
  const Icon = meta.icon;
  return (
    <div
      className="rounded-lg border border-white/10 bg-slate-950/60 p-3"
      data-testid={`ai-search-result-${insight.id}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn("w-5 h-5 rounded flex items-center justify-center", c.iconBg, c.text)}>
          <Icon className="w-2.5 h-2.5" />
        </div>
        <span className={cn("text-[10px] uppercase font-semibold tracking-wider", c.text)}>
          {meta.label} · {insight.severity}
        </span>
      </div>
      <p className="text-sm font-semibold text-white leading-snug mb-1">
        {insight.title}
      </p>
      {insight.metric && (
        <p className={cn("text-[11px] font-bold tabular-nums mb-1", c.text)}>{insight.metric}</p>
      )}
      <p className="text-[11px] text-slate-400 leading-snug line-clamp-3">
        {insight.body}
      </p>

      {insight.sources && insight.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {insight.sources.map((s) => (
            <span
              key={s}
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 border border-white/10 text-slate-300"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onView}
          data-testid={`ai-search-view-${insight.id}`}
          className="flex-1 flex items-center justify-between gap-2 text-[11px] font-medium px-2.5 py-1.5 rounded bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Network className="w-3 h-3" /> View in Architecture
          </span>
          <ArrowRight className="w-3 h-3" />
        </button>
        {insight.cta && (
          <Link
            href={insight.cta.href}
            data-testid={`ai-search-cta-${insight.id}`}
            className="text-[11px] font-medium px-2.5 py-1.5 rounded border border-white/10 bg-slate-900/60 text-slate-200 hover:border-white/30 transition-colors"
          >
            {insight.cta.label.length > 22 ? "Next step →" : insight.cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function ScopeToggle({ value, onChange }: { value: ArchInsightScope; onChange: (s: ArchInsightScope) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Insight scope"
      className="inline-flex items-center rounded-md border border-white/10 bg-slate-900/60 p-0.5 shrink-0"
    >
      {(["company", "customer"] as const).map((s) => {
        const Icon = s === "company" ? Building2 : User;
        return (
          <button
            key={s}
            role="radio"
            aria-checked={value === s}
            onClick={() => onChange(s)}
            data-testid={`scope-${s}`}
            className={cn(
              "text-[11px] font-medium px-2.5 py-1 rounded transition-colors flex items-center gap-1.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
              value === s ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-white",
            )}
          >
            <Icon className="w-3 h-3" />
            {s === "company" ? "Company" : "Customer"}
          </button>
        );
      })}
    </div>
  );
}
