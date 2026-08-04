import { Activity, Building2, GitBranch, Layers, Plug, Sparkles, FileText, TrendingUp, type LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// ADMIN_NAV — the single source of truth for the internal platform nav
// (Firms / Pipeline / Insights). Shared by AdminShell (the /admin surface) and
// TenantShell's unified admin sidebar so the two never drift. Kept in its own
// tiny module (not exported from AdminShell) so the public tenant portal does
// not pull the whole AdminShell component into the anonymous bundle.
// ---------------------------------------------------------------------------
export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (loc: string) => boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Firms",
    icon: Building2,
    match: (loc) => loc === "/admin" || loc.startsWith("/admin/firms"),
  },
  {
    href: "/admin/pipeline",
    label: "Pipeline",
    icon: GitBranch,
    match: (loc) => loc === "/admin/pipeline" || loc.startsWith("/admin/jobs"),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: FileText,
    match: (loc) => loc === "/admin/reports" || loc.startsWith("/admin/reports/"),
  },
  {
    href: "/admin/tiers",
    label: "Tiers",
    icon: Layers,
    match: (loc) => loc === "/admin/tiers",
  },
  {
    href: "/admin/outcomes",
    label: "Outcomes",
    icon: TrendingUp,
    match: (loc) => loc === "/admin/outcomes",
  },
  {
    href: "/admin/backengine",
    label: "BackEngine",
    icon: Plug,
    match: (loc) => loc === "/admin/backengine",
  },
  {
    href: "/admin/insights",
    label: "Insights",
    icon: Sparkles,
    match: (loc) => loc === "/admin/insights",
  },
  {
    href: "/admin/health",
    label: "Health",
    icon: Activity,
    match: (loc) => loc === "/admin/health",
  },
];
