import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyHero({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 via-slate-950/60 to-slate-950/0 p-10 md:p-16",
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-3xl leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-base md:text-lg text-slate-300/90 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
