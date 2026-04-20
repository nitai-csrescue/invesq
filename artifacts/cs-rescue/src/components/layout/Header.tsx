import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { Activity } from "lucide-react";

export function Header() {
  const { data: health } = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: 30000,
    }
  });

  const isHealthy = health?.status === "ok" || health?.status === "healthy" || !health;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6 pl-20 lg:pl-70">
      <div></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/10" data-testid="system-health">
          <div className="relative flex h-2 w-2">
            {isHealthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-primary' : 'bg-destructive'}`}></span>
          </div>
          <span>System {isHealthy ? 'Healthy' : 'Degraded'}</span>
        </div>
      </div>
    </header>
  );
}