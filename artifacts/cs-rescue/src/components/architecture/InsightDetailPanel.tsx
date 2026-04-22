import { Link } from "wouter";
import { X, Sparkles, ArrowRight, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArchInsight } from "@/data/architectureInsights";
import type { ArchitectureNode } from "@workspace/api-client-react";

interface InsightDetailPanelProps {
  insight: ArchInsight | null;
  nodes: ArchitectureNode[];
  onClose: () => void;
  onFocusNode: (id: string) => void;
}

export function InsightDetailPanel({ insight, nodes, onClose, onFocusNode }: InsightDetailPanelProps) {
  if (!insight) return null;

  const related = insight.nodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is ArchitectureNode => Boolean(n));

  const copilotHref = insight.copilotPrompt
    ? `/platform/ai-copilot?prompt=${encodeURIComponent(insight.copilotPrompt)}${
        insight.accountId ? `&accountId=${insight.accountId}` : ""
      }&autoRun=1`
    : "/platform/ai-copilot";

  return (
    <aside
      data-testid="insight-detail-panel"
      className="absolute top-0 right-0 h-full w-[380px] bg-slate-950/95 border-l border-white/10 backdrop-blur-md z-20 flex flex-col shadow-2xl"
    >
      <div className="px-5 py-4 border-b border-white/10 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-[10px] uppercase font-semibold tracking-wider mb-1",
            insight.kind === "risk" && "text-rose-300",
            insight.kind === "pain" && "text-amber-300",
            insight.kind === "opportunity" && "text-emerald-300",
            insight.kind === "action" && "text-cyan-300",
          )}>
            {insight.kind} · {insight.severity} severity
          </p>
          <h3 className="text-sm font-bold text-white leading-snug">{insight.title}</h3>
          {insight.metric && (
            <p className="text-base font-bold text-white tabular-nums mt-1.5">{insight.metric}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close insight panel"
          data-testid="insight-detail-close"
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <p className="text-sm text-slate-300 leading-relaxed">{insight.body}</p>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Related architecture ({related.length})
            </p>
          </div>
          <div className="space-y-1.5">
            {related.length === 0 && (
              <p className="text-xs text-slate-500 italic">No matching architecture nodes.</p>
            )}
            {related.map((n) => (
              <button
                key={n.id}
                onClick={() => onFocusNode(n.id)}
                data-testid={`insight-related-${n.id}`}
                className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-white/10 bg-slate-900/60 hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{n.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {n.layer} · health {n.healthScore ?? "—"}
                  </p>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {insight.cta && (
          <div>
            <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
              Recommended next step
            </p>
            <Link
              href={insight.cta.href}
              data-testid="insight-cta"
              className="flex items-center justify-between gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2.5 hover:bg-cyan-500/20 transition-colors"
            >
              <span className="text-sm font-medium text-cyan-100">{insight.cta.label}</span>
              <ArrowRight className="w-4 h-4 text-cyan-300" />
            </Link>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
            Dig deeper
          </p>
          <Link
            href={copilotHref}
            data-testid="insight-copilot"
            className="flex items-center justify-between gap-2 rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-2.5 hover:bg-purple-500/20 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-purple-100">
              <Sparkles className="w-3.5 h-3.5" />
              Open in AI Copilot
            </span>
            <ArrowRight className="w-4 h-4 text-purple-300" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
