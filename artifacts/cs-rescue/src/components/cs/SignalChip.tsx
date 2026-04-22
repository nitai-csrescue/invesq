import { cn } from "@/lib/utils";
import type { SignalCategory, SignalSeverity } from "@/data/signals";

const CATEGORY_STYLES: Record<SignalCategory, string> = {
  churn: "bg-rose-500/15 text-rose-200 border-rose-400/30",
  expansion: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  adoption: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  renewal: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30",
  support: "bg-sky-500/15 text-sky-200 border-sky-400/30",
};

const SEVERITY_DOT: Record<SignalSeverity, string> = {
  low: "bg-slate-400",
  med: "bg-amber-400",
  high: "bg-rose-400",
};

export function SignalChip({
  category,
  label,
  severity,
}: {
  category: SignalCategory;
  label: string;
  severity?: SignalSeverity;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        CATEGORY_STYLES[category],
      )}
    >
      {severity && <span className={cn("w-1.5 h-1.5 rounded-full", SEVERITY_DOT[severity])} />}
      {label}
    </span>
  );
}

export const SIGNAL_DOT: Record<SignalCategory, string> = {
  churn: "bg-rose-400",
  expansion: "bg-emerald-400",
  adoption: "bg-amber-400",
  renewal: "bg-indigo-400",
  support: "bg-sky-400",
};
