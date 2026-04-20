import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

export function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-slate-500 text-sm italic">Nothing notable.</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
