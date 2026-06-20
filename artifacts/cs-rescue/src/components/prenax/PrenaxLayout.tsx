import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Table2, Building2, Scale } from "lucide-react";
import { FEATURED_AT_RISK_ID } from "@/data/prenax";

const NAV = [
  { href: "/prenax", label: "Overview", icon: LayoutDashboard, match: (l: string) => l === "/prenax" },
  { href: "/prenax/portfolio", label: "Portfolio", icon: Table2, match: (l: string) => l.startsWith("/prenax/portfolio") },
  { href: `/prenax/customers/${FEATURED_AT_RISK_ID}`, label: "Account", icon: Building2, match: (l: string) => l.startsWith("/prenax/customers") },
  { href: "/prenax/methodology", label: "Methodology", icon: Scale, match: (l: string) => l.startsWith("/prenax/methodology") },
];

export function PrenaxLayout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col">
      <header className="sticky top-0 z-30 bg-[#0a0f1c]/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded text-white shadow-lg shadow-indigo-900/20">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">Prenax</span>
          <span className="hidden sm:inline text-slate-500 font-medium ml-3 border-l border-slate-700 pl-3">
            Customer Health Intelligence
          </span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-6 text-sm font-medium">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(loc);
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-2 transition-colors ${
                  active ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-slate-800/60 px-6 py-4 text-center text-xs text-slate-600">
        Prenax Customer Health Intelligence · Phase 1 diagnostic · Illustrative data on Salesforce Service Cloud
      </footer>
    </div>
  );
}
