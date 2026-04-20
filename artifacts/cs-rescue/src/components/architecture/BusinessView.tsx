import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import type { ArchitectureNode, ArchitectureEdge } from "@workspace/api-client-react";
import { CLUSTER_LABELS, getNodePriority, type Persona } from "@/lib/persona";
import { cn } from "@/lib/utils";

interface BusinessViewProps {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  persona: Persona;
  simplify: boolean;
  clusterByRelevance: boolean;
  selectedId: string | null;
  hoverId: string | null;
  showDepsForId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  /** Optional set of node ids to highlight (e.g. AI Copilot recommendations). */
  highlightIds?: Set<string>;
}

type NodeWithMeta = ArchitectureNode & {
  simplifiedLabel?: string;
  clusterGroup?: string;
  microStat?: string;
  roleTag?: string;
  visibleToPersonas?: string[];
  defaultPriorityByPersona?: Record<string, string>;
};

function healthRing(score: number) {
  if (score >= 85) return { color: "#10b981", label: "Healthy" };
  if (score >= 70) return { color: "#fbbf24", label: "Warning" };
  return { color: "#f87171", label: "At Risk" };
}

function NodeIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Box;
  return <Cmp className={className} />;
}

export function BusinessView({
  nodes,
  edges,
  persona,
  simplify,
  clusterByRelevance,
  selectedId,
  hoverId,
  showDepsForId,
  onSelect,
  onHover,
  highlightIds,
}: BusinessViewProps) {
  // Compute neighbors (used for highlight on hover/selection/show-deps)
  const neighborMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!m.has(e.source)) m.set(e.source, new Set());
      if (!m.has(e.target)) m.set(e.target, new Set());
      m.get(e.source)!.add(e.target);
      m.get(e.target)!.add(e.source);
    }
    return m;
  }, [edges]);

  const focusId = selectedId ?? hoverId;
  const focusNeighbors = focusId ? neighborMap.get(focusId) ?? new Set<string>() : new Set<string>();
  const showDepsNeighbors = showDepsForId ? neighborMap.get(showDepsForId) ?? new Set<string>() : new Set<string>();

  // Group visible nodes by clusterGroup
  const clusters = useMemo(() => {
    const visible = (nodes as NodeWithMeta[]).filter((n) => getNodePriority(n, persona) !== "hidden");
    const map = new Map<string, NodeWithMeta[]>();
    for (const n of visible) {
      const key = n.clusterGroup ?? "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    // Sort each cluster: by name. If clusterByRelevance, primary nodes float to top.
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (clusterByRelevance) {
          const pa = getNodePriority(a, persona);
          const pb = getNodePriority(b, persona);
          const order = { primary: 0, secondary: 1, hidden: 2 };
          if (order[pa] !== order[pb]) return order[pa] - order[pb];
        }
        return a.name.localeCompare(b.name);
      });
    }
    // Sort cluster keys
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      if (clusterByRelevance) {
        const aHasPrimary = a[1].some((n) => getNodePriority(n, persona) === "primary");
        const bHasPrimary = b[1].some((n) => getNodePriority(n, persona) === "primary");
        if (aHasPrimary !== bHasPrimary) return aHasPrimary ? -1 : 1;
      }
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [nodes, persona, clusterByRelevance]);

  if (clusters.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        No nodes are visible for this persona.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1600px] mx-auto p-8 space-y-8">
        {clusters.map(([clusterKey, clusterNodes]) => {
          const meta = CLUSTER_LABELS[clusterKey] ?? {
            label: clusterKey,
            color: "#94a3b8",
            description: "",
          };
          const primaryCount = clusterNodes.filter((n) => getNodePriority(n, persona) === "primary").length;
          const avgHealth =
            clusterNodes.reduce((acc, n) => acc + (n.healthScore ?? 85), 0) / clusterNodes.length;
          const ring = healthRing(avgHealth);

          return (
            <section key={clusterKey} className="rounded-2xl border border-white/[0.06] bg-slate-900/30 backdrop-blur-sm overflow-hidden">
              {/* Cluster header */}
              <div
                className="px-6 py-4 flex items-center gap-4 border-b border-white/[0.06]"
                style={{
                  background: `linear-gradient(90deg, ${meta.color}10, transparent 60%)`,
                }}
              >
                <div
                  className="w-1 h-10 rounded-full"
                  style={{ background: meta.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">{meta.label}</h2>
                    {primaryCount > 0 && (
                      <span
                        className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: `${meta.color}25`, color: meta.color }}
                      >
                        {primaryCount} key
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-500 leading-none">Avg health</p>
                    <p className="text-sm font-bold leading-tight" style={{ color: ring.color }}>
                      {Math.round(avgHealth)}
                    </p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: ring.color, boxShadow: `0 0 10px ${ring.color}` }}
                  />
                </div>
              </div>

              {/* Cards grid */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {clusterNodes.map((n) => {
                  const priority = getNodePriority(n, persona);
                  const isCollapsed = simplify && priority === "secondary";
                  const isFocused = focusId === n.id;
                  const isFocusNeighbor = focusNeighbors.has(n.id);
                  const isShowDepsNeighbor = showDepsNeighbors.has(n.id);
                  const isRecommended = highlightIds?.has(n.id) ?? false;
                  const isDimmed = focusId && !isFocused && !isFocusNeighbor && !isRecommended;
                  const ringMeta = healthRing(n.healthScore ?? 85);

                  return (
                    <motion.button
                      key={n.id}
                      layout
                      onClick={() => onSelect(n.id === selectedId ? null : n.id)}
                      onMouseEnter={() => onHover(n.id)}
                      onMouseLeave={() => onHover(null)}
                      data-testid={`node-card-${n.id}`}
                      className={cn(
                        "group relative text-left rounded-xl border transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                        priority === "primary"
                          ? "border-white/15 bg-slate-900/80 hover:border-cyan-400/50"
                          : "border-white/[0.06] bg-slate-900/40 hover:border-white/20",
                        isCollapsed ? "py-2 px-3" : "p-3",
                        isFocused && "border-cyan-400/80 bg-cyan-500/10 shadow-lg shadow-cyan-500/20",
                        (isFocusNeighbor || isShowDepsNeighbor) && !isFocused && "border-purple-400/40 bg-purple-500/5",
                        isRecommended && !isFocused && "border-purple-400/80 bg-purple-500/10 shadow-lg shadow-purple-500/30 animate-pulse",
                        isDimmed && "opacity-30",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "shrink-0 rounded-md flex items-center justify-center border",
                            isCollapsed ? "w-7 h-7" : "w-9 h-9",
                          )}
                          style={{
                            background: `${meta.color}18`,
                            borderColor: `${meta.color}40`,
                            color: meta.color,
                          }}
                        >
                          <NodeIcon name={n.icon} className={isCollapsed ? "w-3.5 h-3.5" : "w-4 h-4"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={cn("font-semibold text-white truncate", isCollapsed ? "text-xs" : "text-sm")}>
                              {n.simplifiedLabel ?? n.name}
                            </p>
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: ringMeta.color, boxShadow: `0 0 6px ${ringMeta.color}` }}
                              aria-label={ringMeta.label}
                            />
                          </div>
                          {!isCollapsed && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {n.roleTag && (
                                <p className="text-[11px] text-slate-500 truncate">{n.roleTag}</p>
                              )}
                              {n.ownerTeam && (
                                <span
                                  className="text-[9px] px-1 py-px rounded bg-slate-800/80 border border-white/10 text-slate-400 truncate max-w-[110px]"
                                  title={`Owned by ${n.ownerTeam}`}
                                >
                                  {n.ownerTeam}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span className="text-[10px] font-semibold tabular-nums text-slate-300">
                            {n.healthScore ?? 85}
                          </span>
                        )}
                      </div>

                      <AnimatePresence>
                        {!isCollapsed && n.microStat && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center gap-2"
                          >
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: `${meta.color}15`, color: meta.color }}
                            >
                              {n.microStat}
                            </span>
                            {priority === "primary" && (
                              <span className="text-[9px] uppercase tracking-wider text-cyan-400/70 font-semibold ml-auto">
                                Key
                              </span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Soft glow for focus neighbors */}
                      {(isFocusNeighbor || isShowDepsNeighbor) && !isFocused && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-purple-400/30" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
