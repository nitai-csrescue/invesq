import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  AlertTriangle,
  BarChart2,
  ShieldCheck,
  TrendingDown,
  Database,
  ShieldAlert,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { AskInvesq } from "@/components/portfolio/AskInvesq";
import { AdminLensMount } from "@/components/admin/AdminLensMount";
import { ADMIN_NAV } from "@/components/admin/adminNav";
import { type Firm } from "@/data/portfolio";

// ---------------------------------------------------------------------------
// Sidebar nav definition
// Base nav is shared by every tenant; Risk & ROI and Data Sources remain a
// Raviga-only sandbox (live-data demo features), gated below via isRaviga.
// ---------------------------------------------------------------------------
const BASE_NAV = [
  { href: "portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "findings", label: "Findings", icon: AlertTriangle },
  { href: "benchmarks", label: "Benchmarks", icon: BarChart2 },
] as const;

const RAVIGA_ONLY_NAV = [
  { href: "risk", label: "Risk & ROI", icon: TrendingDown },
  { href: "data-sources", label: "Data Sources", icon: Database },
] as const;

type PortalNavItem = { href: string; label: string; icon: LucideIcon };

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
  icon: LucideIcon;
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

// Shared logo mark — identical dark chrome for the anon and admin sidebars.
function SidebarLogo() {
  return (
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
  );
}

// ---------------------------------------------------------------------------
// AnonSidebar
// The public tenant sidebar. This is what an anonymous visitor sees and it is
// intentionally kept byte-for-byte identical to the pre-admin-shell layout.
// ---------------------------------------------------------------------------
function AnonSidebar({
  firm,
  nav,
  isActive,
  isRaviga,
}: {
  firm: Firm;
  nav: readonly PortalNavItem[];
  isActive: (href: string) => boolean;
  isRaviga: boolean;
}) {
  return (
    <aside
      className="flex w-56 flex-none flex-col"
      style={{ backgroundColor: "#1a2332" }}
    >
      <SidebarLogo />

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
        {isRaviga && (
          <div className="mt-0.5 text-xs font-medium" style={{ color: "#8ba4c0" }}>
            Fund III
          </div>
        )}
        {firm.internalOnly && (
          <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300">
            <ShieldAlert className="h-2.5 w-2.5" /> {firm.statusLabel}
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-4">
        {nav.map((item) => (
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
  );
}

// ---------------------------------------------------------------------------
// AdminUnifiedSidebar
// Shown ONLY to an authenticated admin viewing a tenant portal. Fuses the
// internal platform nav (Firms / Pipeline / Insights, from the shared
// ADMIN_NAV) with this firm's portal nav so an operator never loses their way
// between the /admin surface and a tenant's pages. A "Back to admin" affordance
// sits up top and the admin identity + logout mirror AdminShell exactly.
// ---------------------------------------------------------------------------
function AdminUnifiedSidebar({
  firm,
  nav,
  isActive,
  location,
  email,
  onLogout,
}: {
  firm: Firm;
  nav: readonly PortalNavItem[];
  isActive: (href: string) => boolean;
  location: string;
  email: string | null;
  onLogout: () => void;
}) {
  const initials = (email ?? "?").slice(0, 2).toUpperCase();

  return (
    <aside
      className="flex w-56 flex-none flex-col"
      style={{ backgroundColor: "#1a2332" }}
      data-testid="tenant-shell-admin-sidebar"
    >
      <SidebarLogo />

      {/* Back to admin */}
      <div className="shrink-0 px-3 pt-3">
        <Link
          href="/admin"
          data-testid="link-back-to-admin"
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" /> Back to admin
        </Link>
      </div>

      {/* Nav — platform section + this firm's portal section */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          <div
            className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#4a6080" }}
          >
            Platform
          </div>
          {ADMIN_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.match(location)}
            />
          ))}
        </div>

        <div className="space-y-0.5">
          <div
            className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#4a6080" }}
          >
            {firm.displayName} portal
          </div>
          {nav.map((item) => (
            <NavItem
              key={item.href}
              href={`/${firm.slug}/${item.href}`}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
          {firm.internalOnly && (
            <span className="mx-3 mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300">
              <ShieldAlert className="h-2.5 w-2.5" /> {firm.statusLabel}
            </span>
          )}
        </div>
      </nav>

      {/* Admin identity / logout — mirrors AdminShell */}
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
              data-testid="tenant-shell-admin-email"
            >
              {email ?? "unknown"}
            </div>
            <div className="truncate text-[11px]" style={{ color: "#4a6080" }}>
              Internal
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          data-testid="tenant-shell-logout-btn"
          className="mt-3 w-full border-white/15 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
        >
          Log out
        </Button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// AdminPortalHeader
// Admin-only top bar over the light canvas. Hosts the prominent "Admin lens"
// button (replacing the old fixed bottom-left pill). The button reflects the
// drawer's open state: filled amber when open, amber outline when closed.
// ---------------------------------------------------------------------------
function AdminPortalHeader({
  firm,
  lensOpen,
  onToggleLens,
}: {
  firm: Firm;
  lensOpen: boolean;
  onToggleLens: () => void;
}) {
  return (
    <header
      className="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-card/60 px-8"
      data-testid="admin-portal-header"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
          Admin view
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium text-foreground">{firm.displayName}</span>
      </div>
      <Button
        variant={lensOpen ? "default" : "outline"}
        size="sm"
        onClick={onToggleLens}
        data-testid="button-admin-lens"
        aria-pressed={lensOpen}
        className={
          lensOpen
            ? "gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
            : "gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
        }
      >
        <ShieldCheck className="h-4 w-4" />
        Admin lens
        <span
          className={`ml-0.5 inline-flex h-1.5 w-1.5 rounded-full ${
            lensOpen ? "bg-white" : "bg-amber-500/70"
          }`}
        />
      </Button>
    </header>
  );
}

// ---------------------------------------------------------------------------
// TenantShell
// Dark navy sidebar (#1a2332) + light canvas (.raviga-canvas). Shared shell
// for every tenant's portfolio surface — never a per-firm layout fork.
// Raviga keeps two additional sandbox nav items (Risk & ROI, Data Sources);
// every other tenant sees the shared 3-item nav.
//
// Anonymous visitors get AnonSidebar (pixel-identical to the original layout,
// no admin markup). Authenticated admins get the unified admin sidebar plus a
// header hosting the Admin lens trigger; the lens drawer's open state is owned
// here and threaded down to AdminLensMount.
// ---------------------------------------------------------------------------
interface TenantShellProps {
  children: ReactNode;
  firm: Firm;
}

export function TenantShell({ children, firm }: TenantShellProps) {
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [lensOpen, setLensOpen] = useState(false);
  const isRaviga = firm.slug === "raviga";
  const nav = isRaviga ? [...BASE_NAV, ...RAVIGA_ONLY_NAV] : BASE_NAV;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const isActive = (href: string) =>
    location === `/${firm.slug}/${href}` ||
    location.startsWith(`/${firm.slug}/${href}/`);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Dark sidebar ───────────────────────────────────────── */}
      {isAuthenticated ? (
        <AdminUnifiedSidebar
          firm={firm}
          nav={nav}
          isActive={isActive}
          location={location}
          email={user?.email ?? null}
          onLogout={logout}
        />
      ) : (
        <AnonSidebar
          firm={firm}
          nav={nav}
          isActive={isActive}
          isRaviga={isRaviga}
        />
      )}

      {/* ── Light canvas ───────────────────────────────────────── */}
      <div className="raviga-canvas flex flex-1 flex-col overflow-hidden bg-background">
        {isAuthenticated && (
          <AdminPortalHeader
            firm={firm}
            lensOpen={lensOpen}
            onToggleLens={() => setLensOpen((v) => !v)}
          />
        )}

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-xl px-8 py-8">{children}</div>
        </main>

        {/* Minimal footer */}
        <footer className="shrink-0 border-t border-border px-8 py-3 text-center text-[11px] text-muted-foreground">
          INVESQ Portfolio Intelligence · Prepared for {firm.displayName} · Phase 1
          diagnostic · Illustrative
        </footer>
      </div>

      {/* AI assistant — floats above everything */}
      <AskInvesq firm={firm} />

      {/* Admin lens — renders nothing (and loads no JS) for anonymous
          visitors; only an authenticated admin sees the overlay. Open state is
          driven by the header's Admin lens button. */}
      <AdminLensMount firm={firm} open={lensOpen} onOpenChange={setLensOpen} />
    </div>
  );
}
