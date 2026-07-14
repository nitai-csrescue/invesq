import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AlertTriangle, ShieldCheck, XCircle, type LucideIcon } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV } from "./adminNav";
import {
  useGetAdminSystemHealth,
  getGetAdminSystemHealthQueryKey,
} from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// AdminShell
// The internal platform shell — deliberately mirrors the tenant portal's
// dark-navy sidebar (#1a2332) + light canvas so admins move between the
// internal index and a tenant's lens without a jarring chrome change. This is
// the ONE place /admin/* chrome is defined; it is never the client-facing demo
// Shell (Sidebar + Header).
// ---------------------------------------------------------------------------
function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
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

function HealthBanner() {
  const { data } = useGetAdminSystemHealth({
    query: {
      queryKey: getGetAdminSystemHealthQueryKey(),
      refetchInterval: 120_000,
      staleTime: 60_000,
    },
  });

  if (!data || (data.summary.broken === 0 && data.summary.needsAction === 0)) {
    return null;
  }

  const isBroken = data.summary.broken > 0;

  return (
    <div
      className={`flex shrink-0 items-center gap-3 border-b px-6 py-2.5 text-sm ${
        isBroken
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
      data-testid="admin-health-banner"
    >
      {isBroken ? (
        <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      )}
      <span>
        {isBroken
          ? `${data.summary.broken} broken firm(s): tenant portal will 404 in production. Resolve before Republish.`
          : `${data.summary.needsAction} firm(s) need attention before Republish.`}
      </span>
      <Link
        href="/admin/health"
        className={`ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium underline-offset-2 hover:underline ${
          isBroken ? "text-rose-700" : "text-amber-700"
        }`}
        data-testid="admin-health-banner-link"
      >
        View details
      </Link>
    </div>
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
          {ADMIN_NAV.map((item) => (
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
        <HealthBanner />
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
