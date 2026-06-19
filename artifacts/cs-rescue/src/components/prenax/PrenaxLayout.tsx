import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Briefcase } from "lucide-react";

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
          <span className="text-slate-500 font-medium ml-3 border-l border-slate-700 pl-3">Customer Health Intelligence</span>
        </div>
        <nav className="flex items-center gap-8 text-sm font-medium">
          <Link href="/prenax" className={`flex items-center gap-2 transition-colors ${loc === '/prenax' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <LayoutDashboard className="w-4 h-4"/> Overview
          </Link>
          <Link href="/prenax/portfolio" className={`flex items-center gap-2 transition-colors ${loc.startsWith('/prenax/portfolio') ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <Briefcase className="w-4 h-4"/> Portfolio
          </Link>
        </nav>
      </header>
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
