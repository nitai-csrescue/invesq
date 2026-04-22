import { cn } from "@/lib/utils";
import type { AccountStatus } from "@/data/accounts";

const STATUS_STYLES: Record<AccountStatus, { label: string; classes: string }> = {
  healthy: { label: "Healthy", classes: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
  watch: { label: "Watch", classes: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  "at-risk": { label: "At Risk", classes: "bg-rose-500/15 text-rose-300 border-rose-400/30" },
  churning: { label: "Churning", classes: "bg-rose-600/20 text-rose-200 border-rose-400/40" },
};

export function HealthBadge({
  status,
  score,
  size = "md",
}: {
  status: AccountStatus;
  score?: number;
  size?: "sm" | "md";
}) {
  const meta = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        meta.classes,
      )}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {meta.label}
      {score !== undefined && <span className="opacity-60">· {score}</span>}
    </span>
  );
}

export function healthScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-300";
  if (score >= 55) return "text-amber-300";
  return "text-rose-300";
}
