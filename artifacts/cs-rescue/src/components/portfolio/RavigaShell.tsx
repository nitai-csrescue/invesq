import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, AlertTriangle, BarChart2, ShieldCheck, TrendingDown } from "lucide-react";
import { AskInvesq } from "@/components/portfolio/AskInvesq";
import { type Firm } from "@/data/portfolio";

// ---------------------------------------------------------------------------
// Sidebar nav definition
// ---------------------------------------------------------------------------
const NAV = [
  { href: "portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "findings", label: "Findings", icon: AlertTriangle },
  { href: "benchmarks", label: "Benchmarks", icon: BarChart2 },
  { href: "risk", label: "Risk & ROI", icon: TrendingDown },
] as const;

// ---------------------------------------------------------------------------
// Sidebar nav item — pill highlight for active state
// ---------------------------------------------------------------------------
function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof BarChart3;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "ring-1 ring-white/10 text-white"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
      }`}
      style={active ? { backgroundColor: "#2d4a6e" } : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// RavigaShell
// Dark navy sidebar (#1a2332) + light canvas (.raviga-canvas)
// Only used for slug === "raviga" pages. STG/Pamlico unchanged.
// ---------------------------------------------------------------------------
interface RavigaShellProps {
  children: ReactNode;
  firm: Firm;
}

export function RavigaShell({ children, firm }: RavigaShellProps) {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const isActive = (href: string) =>
    location === `/${firm.slug}/${href}` ||
    location.startsWith(`/${firm.slug}/${href}/`);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Dark sidebar ───────────────────────────────────────── */}
      <aside
        className="flex w-56 flex-none flex-col"
        style={{ backgroundColor: "#1a2332" }}
      >
        {/* Logo mark */}
        <div
          className="flex h-[60px] shrink-0 items-center gap-3 px-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 ring-1 ring-primary/40">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-white">INVESQ</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#4a6080" }}>
              Due Diligence
            </div>
          </div>
        </div>

        {/* Tenant / fund label */}
        <div
          className="shrink-0 px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#4a6080" }}
          >
            {firm.displayName}
          </div>
          <div className="mt-0.5 text-xs font-medium" style={{ color: "#8ba4c0" }}>
            Fund III
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-4">
          {NAV.map((item) => (
            <NavItem
              key={item.href}
              href={`/${firm.slug}/${item.href}`}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        {/* User / identity block */}
        <div
          className="shrink-0 px-4 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#2d4a6e" }}
            >
              JF
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">Jay Fox</div>
              <div className="truncate text-xs" style={{ color: "#4a6080" }}>
                Operating Partner
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Light canvas ───────────────────────────────────────── */}
      <div className="raviga-canvas flex flex-1 flex-col overflow-hidden bg-background">
        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-xl px-8 py-8">{children}</div>
        </main>

        {/* Minimal footer */}
        <footer
          className="shrink-0 border-t border-border px-8 py-3 text-center text-[11px] text-muted-foreground"
        >
          INVESQ Portfolio Intelligence · Prepared for {firm.displayName} · Phase 1
          diagnostic · Illustrative
        </footer>
      </div>

      {/* AI assistant — floats above everything */}
      <AskInvesq firm={firm} />
    </div>
  );
}
