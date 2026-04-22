import { Link } from "wouter";
import { Sparkles, AlertTriangle, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/lib/persona";
import type { AIInsight } from "@/data/insights";

const KIND_META = {
  risk: { Icon: AlertTriangle, classes: "from-rose-500/15 to-rose-900/10 border-rose-400/30 text-rose-200", iconColor: "text-rose-300" },
  expansion: { Icon: TrendingUp, classes: "from-emerald-500/15 to-emerald-900/10 border-emerald-400/30 text-emerald-200", iconColor: "text-emerald-300" },
  ttv: { Icon: Clock, classes: "from-amber-500/15 to-amber-900/10 border-amber-400/30 text-amber-200", iconColor: "text-amber-300" },
} as const;

export function InsightRailCard({ insight }: { insight: AIInsight }) {
  const meta = KIND_META[insight.kind];
  const { persona } = usePersona();
  const href = `/platform/ai-copilot?prompt=${encodeURIComponent(insight.prompt)}${insight.accountId ? `&accountId=${insight.accountId}` : ""}&persona=${persona}&autoRun=1`;
  return (
    <div
      data-testid={`insight-${insight.id}`}
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4 group",
        meta.classes,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-2 opacity-90">
        <Sparkles className="w-3 h-3" />
        AI Insight
      </div>
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0", meta.iconColor)}>
          <meta.Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug">{insight.title}</p>
          <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">{insight.body}</p>
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100"
            data-testid={`insight-action-${insight.id}`}
          >
            Open in AI Copilot <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
