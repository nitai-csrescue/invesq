import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SignalSource } from "@/services/ai/scoreSignals";
import type { BriefingItem } from "@/services/ai/generateBriefing";

interface BriefingCardProps {
  title: string;
  icon?: ReactNode;
  accent?: "cyan" | "purple" | "amber" | "emerald" | "rose" | "indigo";
  children: ReactNode;
  className?: string;
}

const ACCENTS: Record<NonNullable<BriefingCardProps["accent"]>, { dot: string; ring: string; text: string }> = {
  cyan: { dot: "bg-cyan-400", ring: "ring-cyan-500/20", text: "text-cyan-300" },
  purple: { dot: "bg-purple-400", ring: "ring-purple-500/20", text: "text-purple-300" },
  amber: { dot: "bg-amber-400", ring: "ring-amber-500/20", text: "text-amber-300" },
  emerald: { dot: "bg-emerald-400", ring: "ring-emerald-500/20", text: "text-emerald-300" },
  rose: { dot: "bg-rose-400", ring: "ring-rose-500/20", text: "text-rose-300" },
  indigo: { dot: "bg-indigo-400", ring: "ring-indigo-500/20", text: "text-indigo-300" },
};

export function BriefingCard({ title, icon, accent = "cyan", children, className }: BriefingCardProps) {
  const a = ACCENTS[accent];
  return (
    <section
      className={cn(
        "rounded-xl border border-white/10 bg-slate-900/40 p-4 ring-1",
        a.ring,
        className,
      )}
    >
      <header className="flex items-center gap-2 mb-3">
        <span className={cn("w-1.5 h-1.5 rounded-full", a.dot)} />
        {icon && <span className={cn("w-4 h-4", a.text)}>{icon}</span>}
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">{title}</h3>
      </header>
      <div className="text-sm text-slate-200 leading-relaxed">{children}</div>
    </section>
  );
}

const SOURCE_KIND_STYLE: Record<SignalSource["kind"], string> = {
  deployment: "bg-indigo-500/10 border-indigo-400/30 text-indigo-200",
  blocker: "bg-rose-500/10 border-rose-400/30 text-rose-200",
  milestone: "bg-amber-500/10 border-amber-400/30 text-amber-200",
  edge: "bg-fuchsia-500/10 border-fuchsia-400/30 text-fuchsia-200",
  node: "bg-cyan-500/10 border-cyan-400/30 text-cyan-200",
  resource: "bg-purple-500/10 border-purple-400/30 text-purple-200",
  account: "bg-emerald-500/10 border-emerald-400/30 text-emerald-200",
};

const SOURCE_KIND_LABEL: Record<SignalSource["kind"], string> = {
  deployment: "Deployment",
  blocker: "Blocker",
  milestone: "Milestone",
  edge: "Edge",
  node: "Node",
  resource: "Resource",
  account: "Account",
};

const MAX_VISIBLE_CHIPS = 3;

export function SourceChips({ sources }: { sources: SignalSource[] }) {
  if (!sources || sources.length === 0) return null;
  // Dedupe by kind+id+label
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    const key = `${s.kind}:${s.id}:${s.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const visible = unique.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = unique.slice(MAX_VISIBLE_CHIPS);
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {visible.map((s, i) => (
        <span
          key={`${s.kind}-${s.id}-${i}`}
          title={`${SOURCE_KIND_LABEL[s.kind]}: ${s.label}`}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
            SOURCE_KIND_STYLE[s.kind],
          )}
        >
          <span className="opacity-70">{SOURCE_KIND_LABEL[s.kind]}</span>
          <span className="opacity-100 truncate max-w-[160px]">{s.label}</span>
        </span>
      ))}
      {overflow.length > 0 && (
        <span
          title={overflow.map((o) => `${SOURCE_KIND_LABEL[o.kind]}: ${o.label}`).join("\n")}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-slate-800/80 border-white/10 text-slate-300"
        >
          +{overflow.length} more
        </span>
      )}
    </div>
  );
}

export function BulletList({ items }: { items: BriefingItem[] }) {
  if (!items || items.length === 0) return <p className="text-slate-500 text-sm italic">Nothing notable.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span>{it.text}</span>
            <SourceChips sources={it.sources} />
          </div>
        </li>
      ))}
    </ul>
  );
}
