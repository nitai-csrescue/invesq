import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle, ShieldAlert, TrendingUp, Zap, Sparkles, Building2, User,
  Search, ArrowRight, Network, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePersona } from "@/lib/persona";
import {
  filterArchInsights,
  type ArchInsight,
  type ArchInsightKind,
  type ArchInsightScope,
} from "@/data/architectureInsights";
import { searchInsights, SEARCH_SUGGESTIONS } from "@/lib/insightSearch";
import { addFinding } from "@/lib/findings";
import { RecentFindings } from "@/components/dashboard/RecentFindings";

const DEFAULT_VISIBLE = 4;

const KIND_META: Record<ArchInsightKind, {
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof COLORS;
  label: string;
}> = {
  // Pain → warning, Risk → shield, Opportunity → growth, Action → bolt
  pain: { icon: AlertTriangle, color: "rose", label: "Pain" },
  risk: { icon: ShieldAlert, color: "amber", label: "Risk" },
  opportunity: { icon: TrendingUp, color: "emerald", label: "Opportunity" },
  action: { icon: Zap, color: "sky", label: "Action" },
};

const COLORS = {
  rose: { iconBg: "bg-rose-500/15", text: "text-rose-300", accent: "bg-rose-400", chip: "bg-rose-500/15 text-rose-300" },
  amber: { iconBg: "bg-amber-500/15", text: "text-amber-300", accent: "bg-amber-400", chip: "bg-amber-500/15 text-amber-300" },
  emerald: { iconBg: "bg-emerald-500/15", text: "text-emerald-300", accent: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300" },
  sky: { iconBg: "bg-sky-500/15", text: "text-sky-300", accent: "bg-sky-400", chip: "bg-sky-500/15 text-sky-300" },
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
      goal: insight.headline ?? insight.title,
      ts: Date.now(),
    }));
  } catch {
    /* sessionStorage may be unavailable */
  }
  navigate("/platform/architecture");
}

export function DashboardInsights() {
  const { persona, customerAccountId } = usePersona();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [scope, setScope] = useState<ArchInsightScope>("company");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const allFeedInsights = useMemo(
    () => filterArchInsights({
      persona,
      scope,
      accountId: scope === "customer" ? customerAccountId : null,
    }),
    [persona, scope, customerAccountId],
  );

  const visibleInsights = showAll ? allFeedInsights : allFeedInsights.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = allFeedInsights.length - DEFAULT_VISIBLE;

  const searchResult = useMemo(
    () => (submittedQuery ? searchInsights(submittedQuery, persona) : null),
    [submittedQuery, persona],
  );

  const onCardClick = (insight: ArchInsight) => {
    toast({
      title: "Highlighting related systems",
      description: insight.headline ?? insight.title,
    });
    handoffToArchitecture(insight, persona, navigate);
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmittedQuery(q);
    // Append the top result to the Findings ledger so the user has a record
    // of what they asked about. We deliberately do NOT store the question
    // itself as a chat turn — only the structured insight that came back.
    const top = searchInsights(q, persona).insights[0];
    if (top) {
      addFinding({
        kind: top.kind,
        text: `Surfaced from your question: ${top.headline ?? top.title}.`,
        sources: top.sources?.slice(0, 2),
        nodeIds: top.nodeIds,
      });
    }
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
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">
              What matters now
            </p>
            <h2 className="text-base font-bold text-white leading-tight mt-1">
              {scope === "company"
                ? "What needs your attention right now"
                : "Top issues and opportunities for this customer"}
            </h2>
          </div>
        </div>
        <ScopeToggle value={scope} onChange={(s) => { setScope(s); setShowAll(false); }} />
      </div>

      {/* Insight feed */}
      {allFeedInsights.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-6 text-center">
          No insights for this persona / scope. Try switching personas or scope.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {visibleInsights.map((ins) => (
              <InsightCard
                key={ins.id}
                insight={ins}
                onClick={() => onCardClick(ins)}
              />
            ))}
          </div>

          {hiddenCount > 0 && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                data-testid="insights-toggle-all"
                className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
              >
                {showAll ? (
                  <>Show fewer <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>View all insights ({allFeedInsights.length}) <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Recent Findings — short documentation layer (NOT a chat history) */}
      <RecentFindings />

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
                  onView={() => onCardClick(ins)}
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
  const headline = insight.headline ?? insight.title;
  return (
    <button
      onClick={onClick}
      data-testid={`dashboard-insight-${insight.id}`}
      className={cn(
        "group relative text-left rounded-xl border border-white/10 bg-slate-900/60 p-3 pl-4 transition-all overflow-hidden",
        "hover:bg-slate-900/90 hover:-translate-y-0.5 hover:border-white/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
      )}
    >
      {/* Left accent bar — strongest signal of insight type */}
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", c.accent)} aria-hidden />

      {/* Icon + type label + severity chip */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", c.iconBg, c.text)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className={cn("text-[10px] uppercase font-semibold tracking-wider", c.text)}>
          {meta.label}
        </span>
        {insight.severity === "high" && (
          <span className={cn("ml-auto text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded", c.chip)}>
            High
          </span>
        )}
      </div>

      {/* Headline (insight-first, short) */}
      <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
        {headline}
      </p>

      {/* Supporting metric */}
      {insight.metric && (
        <p className={cn("text-[11px] font-bold tabular-nums mt-1", c.text)}>{insight.metric}</p>
      )}

      {/* Affected scope chip */}
      {insight.affected && (
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <Network className="w-2.5 h-2.5" />
          {insight.affected}
        </p>
      )}

      {/* CTA */}
      <div className="mt-3 pt-2 border-t border-white/[0.06]">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 group-hover:text-cyan-200">
          See why <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function ResultCard({ insight, onView }: { insight: ArchInsight; onView: () => void }) {
  const meta = KIND_META[insight.kind];
  const c = COLORS[meta.color];
  const Icon = meta.icon;
  const headline = insight.headline ?? insight.title;
  return (
    <div
      className="relative rounded-lg border border-white/10 bg-slate-950/60 p-3 pl-4 overflow-hidden"
      data-testid={`ai-search-result-${insight.id}`}
    >
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", c.accent)} aria-hidden />
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn("w-5 h-5 rounded flex items-center justify-center", c.iconBg, c.text)}>
          <Icon className="w-3 h-3" />
        </div>
        <span className={cn("text-[10px] uppercase font-semibold tracking-wider", c.text)}>
          {meta.label} · {insight.severity}
        </span>
      </div>
      <p className="text-sm font-semibold text-white leading-snug mb-1">
        {headline}
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
            <Network className="w-3 h-3" /> Explore in Architecture
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
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Scope</span>
      <div
        role="radiogroup"
        aria-label="Insight scope"
        className="inline-flex items-center rounded-lg border border-white/15 bg-slate-900/80 p-1 shadow-sm"
      >
        {(["company", "customer"] as const).map((s) => {
          const Icon = s === "company" ? Building2 : User;
          const active = value === s;
          return (
            <button
              key={s}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(s)}
              data-testid={`scope-${s}`}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                active
                  ? "bg-cyan-500/25 text-cyan-100 shadow-inner"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {s === "company" ? "Company" : "Customer"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
