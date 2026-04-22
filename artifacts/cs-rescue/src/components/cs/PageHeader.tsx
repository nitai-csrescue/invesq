import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, actions, eyebrow }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-400/80 font-semibold mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
