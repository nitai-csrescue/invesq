import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, AlertTriangle, ShieldAlert, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePersona } from "@/lib/persona";
import { getFindings, relativeTime, type Finding } from "@/lib/findings";
import type { ArchInsightKind } from "@/data/architectureInsights";

const KIND_META: Record<ArchInsightKind, { icon: React.ComponentType<{ className?: string }>; accent: string; text: string }> = {
  pain: { icon: AlertTriangle, accent: "bg-rose-400", text: "text-rose-300" },
  risk: { icon: ShieldAlert, accent: "bg-amber-400", text: "text-amber-300" },
  opportunity: { icon: TrendingUp, accent: "bg-emerald-400", text: "text-emerald-300" },
  action: { icon: Zap, accent: "bg-sky-400", text: "text-sky-300" },
};

export function RecentFindings({ limit = 6 }: { limit?: number }) {
  const { persona } = usePersona();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [findings, setFindings] = useState<Finding[]>(() => getFindings(limit));

  // Refresh whenever a new finding is appended (e.g. from AI search).
  useEffect(() => {
    const refresh = () => setFindings(getFindings(limit));
    window.addEventListener("cs-rescue:findings-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cs-rescue:findings-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [limit]);

  const onClick = (f: Finding) => {
    if (!f.nodeIds || f.nodeIds.length === 0) return;
    try {
      sessionStorage.setItem("cs-rescue:highlight", JSON.stringify({
        nodeIds: f.nodeIds,
        edgeIds: [],
        persona,
        viewMode: "business",
        reason: "AI_COPILOT",
        goal: f.text,
        ts: Date.now(),
      }));
    } catch { /* noop */ }
    toast({ title: "Highlighting related systems", description: f.text });
    navigate("/platform/architecture");
  };

  return (
    <div className="mt-5 pt-4 border-t border-white/10" data-testid="recent-findings">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
          Recent findings
        </h3>
        <span className="text-[10px] text-slate-500">— what we've learned about your system</span>
      </div>

      {findings.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-4 text-center">
          No findings yet. Ask a question above or wait for the system to surface patterns.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {findings.map((f) => {
            const meta = KIND_META[f.kind];
            const Icon = meta.icon;
            const interactive = (f.nodeIds?.length ?? 0) > 0;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onClick(f)}
                  disabled={!interactive}
                  data-testid={`finding-${f.id}`}
                  className={cn(
                    "group w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg border border-transparent",
                    "bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-colors",
                    "disabled:opacity-60 disabled:cursor-default disabled:hover:bg-white/[0.02]",
                  )}
                >
                  {/* Accent strip */}
                  <span className={cn("w-0.5 self-stretch rounded-full shrink-0 mt-0.5", meta.accent)} aria-hidden />
                  <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", meta.text)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-slate-200 leading-snug">{f.text}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-slate-500">{relativeTime(f.ts)}</span>
                      {f.sources && f.sources.length > 0 && (
                        <>
                          <span className="text-[10px] text-slate-600">·</span>
                          {f.sources.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 border border-white/10 text-slate-400"
                            >
                              {s}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  {interactive && (
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
