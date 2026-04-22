import { cn } from "@/lib/utils";
import { Sparkles, Workflow, Hand } from "lucide-react";
import type { ActionSource } from "@/data/actions";

const META: Record<ActionSource, { label: string; Icon: typeof Sparkles; classes: string }> = {
  ai: { label: "AI", Icon: Sparkles, classes: "bg-cyan-500/15 text-cyan-200 border-cyan-400/30" },
  playbook: { label: "Playbook", Icon: Workflow, classes: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30" },
  manual: { label: "Manual", Icon: Hand, classes: "bg-slate-500/15 text-slate-300 border-slate-400/30" },
};

export function SourceBadge({ source }: { source: ActionSource }) {
  const m = META[source];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", m.classes)}>
      <m.Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}
