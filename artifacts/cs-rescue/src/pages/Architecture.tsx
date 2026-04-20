import { useState } from "react";
import { 
  useGetArchitectureSummary, 
  getGetArchitectureSummaryQueryKey,
  useGetArchitecture,
  getGetArchitectureQueryKey,
  useListLifecycleMotions,
  getListLifecycleMotionsQueryKey,
  ArchitectureNode,
  LifecycleMotion
} from "@workspace/api-client-react";
import { 
  Activity, 
  Server, 
  ShieldCheck, 
  Zap,
  Box,
  Layers,
  Search,
  X,
  Rocket
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Mock Icons mapping
const iconMap: Record<string, any> = {
  Server,
  ShieldCheck,
  Zap,
  Box,
  Layers,
  Activity
};

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string | number, icon: any, trend?: string }) {
  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4 flex items-start gap-4">
      <div className="p-3 bg-primary/10 text-primary rounded-lg">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold">{value}</h3>
          {trend && <span className="text-xs text-emerald-400">{trend}</span>}
        </div>
      </div>
    </div>
  );
}

function NodeCard({ 
  node, 
  onClick, 
  selected 
}: { 
  node: ArchitectureNode | LifecycleMotion, 
  onClick: () => void,
  selected: boolean
}) {
  const isNode = 'layer' in node;
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border text-left transition-all duration-300 group",
        "bg-card/40 backdrop-blur-sm hover:bg-card/80",
        selected ? "border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-border hover:border-primary/50",
        isNode ? "w-48" : "w-56"
      )}
      data-testid={`node-${node.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5"
          style={{ color: node.color || 'hsl(var(--primary))' }}
        >
          <Box className="w-5 h-5" />
        </div>
        {isNode && (node as ArchitectureNode).status && (
          <div className={cn(
            "w-2 h-2 rounded-full",
            (node as ArchitectureNode).status === 'active' ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : 
            (node as ArchitectureNode).status === 'degraded' ? "bg-amber-400" : "bg-destructive"
          )} />
        )}
      </div>
      <h4 className="font-semibold text-sm mb-1 line-clamp-1">{node.name}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2">{node.description || (node as ArchitectureNode).shortDescription}</p>
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
           style={{ boxShadow: `inset 0 0 20px ${node.color ? node.color.replace(')', ', 0.1)').replace('rgb', 'rgba') : 'rgba(var(--primary), 0.1)'}` }} 
      />
    </motion.button>
  );
}

function NodeDrawer({ 
  node, 
  onClose 
}: { 
  node: ArchitectureNode | LifecycleMotion | null, 
  onClose: () => void 
}) {
  if (!node) return null;
  const isNode = 'layer' in node;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border z-50 shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5"
              style={{ color: node.color || 'hsl(var(--primary))' }}
            >
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{node.name}</h2>
              {isNode && (
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-muted-foreground capitalize">
                  {(node as ArchitectureNode).layer} Layer
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground transition-colors" data-testid="close-drawer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm">{node.description || (node as ArchitectureNode).shortDescription}</p>
            </div>
            
            {isNode && (node as ArchitectureNode).capabilities?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {(node as ArchitectureNode).capabilities.map(cap => (
                    <span key={cap} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {node.kpis?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Metrics</h4>
                <div className="grid gap-3">
                  {node.kpis.map(kpi => (
                    <div key={kpi.label} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-sm text-muted-foreground">{kpi.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{kpi.value}</span>
                        {kpi.trend === 'up' ? (
                          <span className="text-emerald-400 text-xs">↑</span>
                        ) : kpi.trend === 'down' ? (
                          <span className="text-destructive text-xs">↓</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Architecture() {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | LifecycleMotion | null>(null);

  const { data: summary } = useGetArchitectureSummary({
    query: { queryKey: getGetArchitectureSummaryQueryKey() }
  });
  
  const { data: architecture, isLoading: isLoadingArch } = useGetArchitecture({
    query: { queryKey: getGetArchitectureQueryKey() }
  });
  
  const { data: motions, isLoading: isLoadingMotions } = useListLifecycleMotions({
    query: { queryKey: getListLifecycleMotionsQueryKey() }
  });

  const deliveryNodes = architecture?.nodes?.filter(n => n.layer === 'delivery') || [];
  const platformNodes = architecture?.nodes?.filter(n => n.layer === 'platform') || [];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Architecture View</h1>
        <p className="text-muted-foreground">Live visualization of your customer lifecycle systems and delivery infrastructure.</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="System Health" 
            value={`${summary.systemHealth}%`} 
            icon={Activity} 
            trend={summary.systemHealth > 90 ? "Optimal" : undefined}
          />
          <StatCard 
            title="Active Deployments" 
            value={summary.activeDeployments} 
            icon={Rocket} 
          />
          <StatCard 
            title="Total Nodes" 
            value={summary.totalNodes} 
            icon={Layers} 
          />
          <StatCard 
            title="Healthy Resources" 
            value={`${summary.healthyResources}/${summary.totalResources}`} 
            icon={Server} 
          />
        </div>
      )}

      <div className="relative mt-12 bg-black/20 rounded-2xl border border-border p-8 overflow-x-auto min-h-[600px]">
        {/* Layer 1: Motions */}
        <div className="mb-16 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Lifecycle Motions</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="flex justify-center gap-6 min-w-max">
            {isLoadingMotions ? (
              <div className="flex gap-6">
                {[1,2,3,4,5].map(i => <div key={i} className="w-56 h-32 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : motions?.map((motion) => (
              <NodeCard 
                key={motion.id} 
                node={motion} 
                selected={selectedNode?.id === motion.id}
                onClick={() => setSelectedNode(motion)}
              />
            ))}
          </div>
        </div>

        {/* Layer 2: Delivery */}
        <div className="mb-16 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Delivery & Orchestration</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="flex justify-center gap-6 flex-wrap max-w-5xl mx-auto">
            {isLoadingArch ? (
              <div className="flex gap-6">
                {[1,2,3].map(i => <div key={i} className="w-48 h-32 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : deliveryNodes.map((node) => (
              <NodeCard 
                key={node.id} 
                node={node} 
                selected={selectedNode?.id === node.id}
                onClick={() => setSelectedNode(node)}
              />
            ))}
          </div>
        </div>

        {/* Layer 3: Platform */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Platform Systems</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="flex justify-center gap-6 flex-wrap max-w-6xl mx-auto">
             {isLoadingArch ? (
              <div className="flex flex-wrap gap-6 justify-center">
                {[1,2,3,4,5,6].map(i => <div key={i} className="w-48 h-32 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : platformNodes.map((node) => (
              <NodeCard 
                key={node.id} 
                node={node} 
                selected={selectedNode?.id === node.id}
                onClick={() => setSelectedNode(node)}
              />
            ))}
          </div>
        </div>
      </div>

      <NodeDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}