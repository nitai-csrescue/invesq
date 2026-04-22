// Archived from primary nav on 2026-04-22. Kept for reuse — not routed.
import { useState } from "react";
import { 
  useListDeployments, 
  getListDeploymentsQueryKey,
} from "@workspace/api-client-react";
import { 
  Rocket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: 'pre_sales', label: 'Pre-Sales' },
  { id: 'contracting', label: 'Contracting' },
  { id: 'implementation', label: 'Implementation' },
  { id: 'csm', label: 'CSM' },
  { id: 'support', label: 'Support' }
];

export default function Deployments() {
  const { data: deployments = [], isLoading } = useListDeployments(undefined, {
    query: { queryKey: getListDeploymentsQueryKey() }
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeDeployment = deployments.find(d => d.id === selectedId) || deployments[0];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading deployments...</div>;
  }

  return (
    <div className="space-y-8 pb-10 p-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Deployment Workspace</h1>
          <p className="text-muted-foreground">Track and orchestrate active customer lifecycles.</p>
        </div>
        
        {deployments.length > 0 && (
          <div className="w-full md:w-80">
            <Select value={activeDeployment?.id || ''} onValueChange={setSelectedId}>
              <SelectTrigger className="bg-card border-border" data-testid="select-deployment">
                <SelectValue placeholder="Select deployment" />
              </SelectTrigger>
              <SelectContent>
                {deployments.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        d.healthScore > 80 ? "bg-emerald-400" :
                        d.healthScore > 50 ? "bg-amber-400" : "bg-destructive"
                      )} />
                      {d.name} ({d.accountName})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {activeDeployment ? (
        <>
          {/* Progress Tracker */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -translate-y-1/2 rounded-full" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500" 
                style={{ 
                  width: `${(STAGES.findIndex(s => s.id === activeDeployment.stage) / (STAGES.length - 1)) * 100}%` 
                }} 
              />
              
              <div className="relative flex justify-between">
                {STAGES.map((stage, idx) => {
                  const currentIdx = STAGES.findIndex(s => s.id === activeDeployment.stage);
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  
                  return (
                    <div key={stage.id} className="flex flex-col items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        isCompleted ? "bg-primary border-primary text-primary-foreground" :
                        isCurrent ? "bg-card border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" :
                        "bg-card border-border text-muted-foreground"
                      )}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
                         isCurrent ? <PlayCircle className="w-5 h-5" /> : 
                         <Clock className="w-5 h-5" />}
                      </div>
                      <span className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Score */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-medium text-muted-foreground mb-6">Deployment Health</h3>
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" className="stroke-white/5" strokeWidth="8" fill="none" />
                  <circle 
                    cx="80" cy="80" r="70" 
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      activeDeployment.healthScore > 80 ? "stroke-emerald-400" :
                      activeDeployment.healthScore > 50 ? "stroke-amber-400" : "stroke-destructive"
                    )}
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray="439.8"
                    strokeDashoffset={439.8 - (439.8 * activeDeployment.healthScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{activeDeployment.healthScore}</span>
                  <span className="text-xs text-muted-foreground">Score</span>
                </div>
              </div>
            </div>

            {/* Workstreams */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h3 className="font-medium mb-6">Active Workstreams</h3>
              <div className="space-y-4">
                {activeDeployment.workstreams?.map(ws => (
                  <div key={ws.id} className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{ws.name}</span>
                      <span className="text-xs text-muted-foreground">{ws.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          ws.status === 'active' ? "bg-primary" :
                          ws.status === 'completed' ? "bg-emerald-400" : "bg-muted"
                        )}
                        style={{ width: `${ws.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!activeDeployment.workstreams?.length && (
                  <p className="text-sm text-muted-foreground">No active workstreams.</p>
                )}
              </div>
            </div>

            {/* Blockers */}
            <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6">
              <h3 className="font-medium mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Active Blockers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeDeployment.blockers?.filter(b => b.status !== 'resolved').map(blocker => (
                  <div key={blocker.id} className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded font-medium",
                        blocker.severity === 'critical' ? "bg-destructive text-destructive-foreground" :
                        blocker.severity === 'high' ? "bg-orange-500 text-white" :
                        "bg-amber-500 text-white"
                      )}>
                        {blocker.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">{blocker.owner}</span>
                    </div>
                    <p className="text-sm">{blocker.description}</p>
                  </div>
                ))}
                {(!activeDeployment.blockers || activeDeployment.blockers.filter(b => b.status !== 'resolved').length === 0) && (
                  <p className="text-sm text-muted-foreground col-span-full">No active blockers.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground">
          No deployments available.
        </div>
      )}
    </div>
  );
}