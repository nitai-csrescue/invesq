import { AlertTriangle, TrendingUp, Activity, Sparkles, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArchInsight, ArchInsightKind, ArchInsightScope } from "@/data/architectureInsights";

interface InsightFeedProps {
  insights: ArchInsight[];
  selectedId: string | null;
  scope: ArchInsightScope;
  onScopeChange: (s: ArchInsightScope) => void;
  onSelect: (insight: ArchInsight | null) => void;
}

const KIND_META: Record<ArchInsightKind, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  risk: { icon: AlertTriangle, color: "rose", label: "Risk" },
  pain: { icon: Activity, color: "amber", label: "Pain Point" },
  opportunity: { icon: TrendingUp, color: "emerald", label: "Opportunity" },
  action: { icon: Sparkles, color: "cyan", label: "Action" },
};

const COLOR_CLASSES: Record<string, { ring: string; bg: string; text: string; border: string; iconBg: string; selBorder: string; selBg: string }> = {
  rose: {
    ring: "ring-rose-400/40", bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-400/30",
    iconBg: "bg-rose-500/15", selBorder: "border-rose-400/70", selBg: "bg-rose-500/15",
  },
  amber: {
    ring: "ring-amber-400/40", bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-400/30",
    iconBg: "bg-amber-500/15", selBorder: "border-amber-400/70", selBg: "bg-amber-500/15",
  },
  emerald: {
    ring: "ring-emerald-400/40", bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-400/30",
    iconBg: "bg-emerald-500/15", selBorder: "border-emerald-400/70", selBg: "bg-emerald-500/15",
  },
  cyan: {
    ring: "ring-cyan-400/40", bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-400/30",
    iconBg: "bg-cyan-500/15", selBorder: "border-cyan-400/70", selBg: "bg-cyan-500/15",
  },
};

export function InsightFeed({ insights, selectedId, scope, onScopeChange, onSelect }: InsightFeedProps) {
  return (
    <div className="px-6 py-3 border-b border-white/10 bg-slate-950/40 backdrop-blur-md shrink-0" data-testid="arch-insight-feed">
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
            What matters now
          </p>
          <span className="text-[10px] text-slate-500">
            {insights.length === 0 ? "no insights for this view" : `${insights.length} top ${insights.length === 1 ? "insight" : "insights"}`}
          </span>
        </div>

        <ScopeToggle value={scope} onChange={onScopeChange} />
      </div>

      {insights.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-4 text-center">
          No insights for this persona / scope. Try switching personas or scope.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {insights.map((ins) => {
            const meta = KIND_META[ins.kind];
            const c = COLOR_CLASSES[meta.color];
            const Icon = meta.icon;
            const isSelected = ins.id === selectedId;
            return (
              <button
                key={ins.id}
                onClick={() => onSelect(isSelected ? null : ins)}
                data-testid={`insight-${ins.id}`}
                aria-pressed={isSelected}
                className={cn(
                  "shrink-0 snap-start text-left rounded-xl border bg-slate-900/60 p-3 w-[280px] transition-all",
                  "hover:bg-slate-900/90 hover:-translate-y-0.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                  isSelected ? cn(c.selBorder, c.selBg, "ring-2", c.ring) : "border-white/10",
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
                      ins.severity === "high" && "bg-rose-500/15 text-rose-300",
                      ins.severity === "medium" && "bg-amber-500/15 text-amber-300",
                      ins.severity === "low" && "bg-slate-500/20 text-slate-300",
                    )}
                  >
                    {ins.severity}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-1">
                  {ins.title}
                </p>
                {ins.metric && (
                  <p className={cn("text-[11px] font-bold tabular-nums", c.text)}>{ins.metric}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-snug">
                  {ins.body}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScopeToggle({ value, onChange }: { value: ArchInsightScope; onChange: (s: ArchInsightScope) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Insight scope"
      className="inline-flex items-center rounded-md border border-white/10 bg-slate-900/60 p-0.5"
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
