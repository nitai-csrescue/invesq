import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface Props {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  right?: ReactNode;
}

export function SectionHeader({ title, subtitle, viewAllHref, viewAllLabel, right }: Props) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="text-xs font-medium text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
        >
          {viewAllLabel ?? "View all"} <ArrowRight className="w-3 h-3" />
        </Link>
      ) : right}
    </div>
  );
}
