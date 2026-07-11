import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Building2, GitBranch, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// AdminShell
// The internal platform shell — deliberately mirrors the tenant portal's
// dark-navy sidebar (#1a2332) + light canvas so admins move between the
// internal index and a tenant's lens without a jarring chrome change. This is
// the ONE place /admin/* chrome is defined; it is never the client-facing demo
// Shell (Sidebar + Header).
// ---------------------------------------------------------------------------
const NAV = [
  {
    href: "/admin",
    label: "Firms",
    icon: Building2,
    match: (loc: string) => loc === "/admin" || loc.startsWith("/admin/firms"),
  },
  {
    href: "/admin/pipeline",
    label: "Pipeline",
    icon: GitBranch,
    match: (loc: string) =>
      loc === "/admin/pipeline" || loc.startsWith("/admin/jobs"),
  },
  {
    href: "/admin/insights",
    label: "Insights",
    icon: Sparkles,
    match: (loc: string) => loc === "/admin/insights",
  },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Building2;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      data-testid={`admin-nav-${label.toLowerCase()}`}
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

export function AdminShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

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
            <div
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "#4a6080" }}
            >
              Platform Admin
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-4">
          {NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.match(location)}
            />
          ))}
        </nav>

        {/* Identity / logout block */}
        <div
          className="shrink-0 px-4 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#2d4a6e" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-xs font-medium text-white"
                data-testid="admin-shell-user-email"
              >
                {user?.email ?? "unknown"}
              </div>
              <div className="truncate text-[11px]" style={{ color: "#4a6080" }}>
                Internal
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            data-testid="admin-shell-logout-btn"
            className="mt-3 w-full border-white/15 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
          >
            Log out
          </Button>
        </div>
      </aside>

      {/* ── Light canvas ───────────────────────────────────────── */}
      <div className="raviga-canvas flex flex-1 flex-col overflow-hidden bg-background">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-xl px-8 py-8">{children}</div>
        </main>
        <footer className="shrink-0 border-t border-border px-8 py-3 text-center text-[11px] text-muted-foreground">
          INVESQ Platform · Internal operational due-diligence console
        </footer>
      </div>
    </div>
  );
}
