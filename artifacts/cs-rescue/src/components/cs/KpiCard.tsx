import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

interface Props {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  subtitle?: string;
  sparkline?: number[];
  testId?: string;
}

const TONE: Record<string, string> = {
  positive: "text-emerald-300",
  negative: "text-rose-300",
  neutral: "text-slate-300",
};

export function KpiCard({ label, value, delta, deltaTone = "neutral", subtitle, sparkline, testId }: Props) {
  return (
    <div
      data-testid={testId}
      className="relative rounded-xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-950/40 p-4 overflow-hidden"
    >
      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">{value}</p>
        {delta && (
          <p className={cn("text-xs font-semibold mb-0.5", TONE[deltaTone])}>{delta}</p>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
      {sparkline && sparkline.length > 1 && (
        <div className={cn("mt-3", TONE[deltaTone])}>
          <Sparkline values={sparkline} height={28} />
        </div>
      )}
    </div>
  );
}
