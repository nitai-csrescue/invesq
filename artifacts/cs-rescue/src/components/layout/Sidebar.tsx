import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Radio,
  Workflow,
  CheckSquare,
  BarChart3,
  Plug,
  Settings,
  Network,
  Sparkles,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { href: string; icon: typeof LayoutDashboard; label: string; testId: string; }
interface NavGroup { label: string; items: NavItem[]; }

const groups: NavGroup[] = [
  {
    label: "Product",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
      { href: "/accounts", icon: Users, label: "Accounts", testId: "nav-accounts" },
      { href: "/signals", icon: Radio, label: "Signals", testId: "nav-signals" },
      { href: "/playbooks", icon: Workflow, label: "Playbooks", testId: "nav-playbooks" },
      { href: "/actions", icon: CheckSquare, label: "Actions", testId: "nav-actions" },
      { href: "/reports", icon: BarChart3, label: "Reports", testId: "nav-reports" },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/integrations", icon: Plug, label: "Integrations", testId: "nav-integrations" },
      { href: "/settings", icon: Settings, label: "Settings", testId: "nav-settings" },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/platform/architecture", icon: Network, label: "Architecture", testId: "nav-architecture" },
      { href: "/platform/ai-copilot", icon: Sparkles, label: "AI Copilot", testId: "nav-ai-copilot" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-16 lg:w-64 h-screen flex flex-col border-r border-white/10 bg-slate-950/80 backdrop-blur-sm fixed top-0 left-0 z-40 transition-all duration-300">
      <Link
        href="/dashboard"
        className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/10 group"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <LifeBuoy className="h-5 w-5 text-white" />
        </div>
        <span className="hidden lg:block ml-3 font-bold text-lg tracking-tight text-white">CS Rescue</span>
      </Link>

      <nav className="flex-1 py-5 px-3 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="hidden lg:block px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all relative group",
                      active
                        ? "bg-cyan-500/10 text-cyan-200"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                    data-testid={item.testId}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r-full" />
                    )}
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="hidden lg:block font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  );
}
