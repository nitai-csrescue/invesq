import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PersonaSwitcher, WorkspaceLabel } from "./PersonaSwitcher";
import { CustomerAccountPicker } from "./CustomerAccountPicker";

export function Header() {
  const { data: health } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 },
  });

  const isHealthy = health?.status === "ok" || health?.status === "healthy" || !health;

  return (
    <header className="h-16 border-b border-white/10 bg-slate-950/60 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <PersonaSwitcher />
        <WorkspaceLabel />
        <CustomerAccountPicker />
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/overview"
          className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors"
          data-testid="header-view-pitch"
        >
          View pitch <ExternalLink className="w-3 h-3" />
        </Link>
        <div
          className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 px-3 py-1.5 rounded-full border border-white/10"
          data-testid="system-health"
        >
          <div className="relative flex h-2 w-2">
            {isHealthy && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                isHealthy ? "bg-emerald-400" : "bg-rose-400",
              )}
            ></span>
          </div>
          <span>System {isHealthy ? "Healthy" : "Degraded"}</span>
        </div>
      </div>
    </header>
  );
}

/** Slim global strip used on Landing/Overview (BareLayout) so the persona switcher and workspace stay visible everywhere. */
export function BareTopBar() {
  const [location] = useLocation();
  // Demo page is its own presentation surface — keep its top bar clean
  const hideLaunchCta = location === "/launch-demo";
  return (
    <div className="border-b border-white/5 bg-slate-950/40 backdrop-blur-sm" data-testid="bare-top-bar">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!hideLaunchCta && <PersonaSwitcher compact />}
          <WorkspaceLabel />
          <CustomerAccountPicker />
        </div>
        {!hideLaunchCta && (
          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-300 hover:text-white"
            data-testid="bare-top-launch"
          >
            Launch product →
          </Link>
        )}
      </div>
    </div>
  );
}
