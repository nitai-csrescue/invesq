import { useMemo, useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
  ReactFlowProvider,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  useGetGraph,
  getGetGraphQueryKey,
  useGetArchitectureSummary,
  getGetArchitectureSummaryQueryKey,
  useListResources,
  getListResourcesQueryKey,
  type ArchitectureNode as ArchNode,
} from "@workspace/api-client-react";
import { Activity, Layers, Heart, Network, GitBranch, Boxes } from "lucide-react";
import { ArchitectureNodeComp, type ArchNodeData } from "@/components/architecture/ArchitectureNode";
import { Inspector } from "@/components/architecture/Inspector";
import { BusinessView } from "@/components/architecture/BusinessView";
import { InsightFeed } from "@/components/architecture/InsightFeed";
import { InsightDetailPanel } from "@/components/architecture/InsightDetailPanel";
import { filterArchInsights, type ArchInsight, type ArchInsightScope } from "@/data/architectureInsights";
import {
  usePersona,
  VIEW_MODES,
  type ViewMode,
  getNodePriority,
} from "@/lib/persona";
import { Sparkles as SparklesIcon, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERSONA_PAGE_COPY } from "@/lib/persona-copy";

const nodeTypes = { arch: ArchitectureNodeComp };

const edgeColorByRel: Record<string, string> = {
  data_flow: "#22d3ee",
  dependency: "#a78bfa",
  sync: "#34d399",
  composition: "#fbbf24",
  control: "#f472b6",
};

function summarizePos(node: ArchNode): { x: number; y: number } {
  const p = (node as ArchNode & { position?: { x: number; y: number } }).position;
  return p ?? { x: 0, y: 0 };
}

function ArchitectureInner() {
  const { data: graph, isLoading } = useGetGraph({
    query: { queryKey: getGetGraphQueryKey() },
  });
  const { data: summary } = useGetArchitectureSummary({
    query: { queryKey: getGetArchitectureSummaryQueryKey() },
  });
  const { data: resources = [] } = useListResources(undefined, {
    query: { queryKey: getListResourcesQueryKey() },
  });

  const { persona, setPersona, viewMode, setViewMode, simplify, setSimplify, clusterByRelevance, setClusterByRelevance } = usePersona();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showDepsForId, setShowDepsForId] = useState<string | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [highlightEdgeIds, setHighlightEdgeIds] = useState<Set<string>>(new Set());
  const [aiToast, setAiToast] = useState<string | null>(null);
  const [scope, setScope] = useState<ArchInsightScope>("company");
  const [activeInsight, setActiveInsight] = useState<ArchInsight | null>(null);

  // Feed stays stable while an insight is open — selection should not re-filter
  // the visible list (otherwise sibling insights disappear when you click one).
  const visibleInsights = useMemo(
    () => filterArchInsights({ persona, scope, accountId: null }),
    [persona, scope],
  );

  const handleSelectInsight = useCallback((ins: ArchInsight | null) => {
    setActiveInsight(ins);
    if (!ins) {
      setHighlightIds(new Set());
      setHighlightEdgeIds(new Set());
      setShowDepsForId(null);
      return;
    }
    setHighlightIds(new Set(ins.nodeIds));
    setHighlightEdgeIds(new Set(ins.edgeIds ?? []));
    // Drop hard selection so the highlight reads cleanly
    setSelectedId(null);
    // Reveal edges around the first related node
    setShowDepsForId(ins.nodeIds[0] ?? null);
  }, []);

  const allNodes = graph?.nodes ?? [];
  const allEdges = graph?.edges ?? [];

  // Persona-filtered visible nodes
  const visibleNodes = useMemo(() => {
    return allNodes.filter((n) => getNodePriority(n, persona) !== "hidden");
  }, [allNodes, persona]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  // Connected to current focus (selected has priority over hover)
  const focusId = selectedId ?? hoverId;
  const connectedToFocus = useMemo(() => {
    if (!focusId) return new Set<string>();
    const set = new Set<string>();
    for (const e of allEdges) {
      if (e.source === focusId) set.add(e.target);
      if (e.target === focusId) set.add(e.source);
    }
    return set;
  }, [focusId, allEdges]);

  // Reveal edges only on selection/hover/show-deps in dependency view; always in systems view
  const revealEdgesAlways = viewMode === "systems";

  const rfNodes: Node<ArchNodeData>[] = useMemo(() => {
    return visibleNodes.map((n) => {
      const isSelected = selectedId === n.id;
      const isConnected = connectedToFocus.has(n.id);
      const isDimmed = !!focusId && !isSelected && !isConnected;
      return {
        id: n.id,
        type: "arch",
        position: summarizePos(n),
        data: {
          label: n.name,
          icon: n.icon,
          layer: n.layer as ArchNodeData["layer"],
          status: n.status,
          healthScore: n.healthScore ?? 85,
          ownerTeam: n.ownerTeam,
          shortDescription: n.shortDescription,
          isSelected,
          isConnected,
          isDimmed,
        },
      };
    });
  }, [visibleNodes, selectedId, focusId, connectedToFocus]);

  const rfEdges: Edge[] = useMemo(() => {
    return allEdges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .filter((e) => {
        if (revealEdgesAlways) return true;
        // Dependency view: only edges touching focus or showDepsForId
        if (!focusId && !showDepsForId) return false;
        const ids = [focusId, showDepsForId].filter(Boolean) as string[];
        return ids.some((id) => e.source === id || e.target === id);
      })
      .map((e) => {
        const isAiHighlighted = highlightEdgeIds.has(e.id);
        const color = isAiHighlighted ? "#c084fc" : edgeColorByRel[e.relationshipType] ?? "#94a3b8";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: e.status === "active" || isAiHighlighted,
          label: e.label,
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
          labelStyle: { fill: isAiHighlighted ? "#e9d5ff" : "#cbd5e1", fontSize: 10 },
          style: {
            stroke: color,
            strokeWidth: isAiHighlighted ? Math.max(2.5, e.strength / 3) : Math.max(1.5, e.strength / 4),
            opacity: isAiHighlighted ? 1 : e.status === "degraded" ? 0.6 : 0.85,
            strokeDasharray: e.status === "degraded" ? "6 4" : undefined,
            filter: isAiHighlighted ? "drop-shadow(0 0 4px rgba(192,132,252,0.6))" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 14,
            height: 14,
          },
        } as Edge;
      });
  }, [allEdges, visibleNodeIds, revealEdgesAlways, focusId, showDepsForId, highlightEdgeIds]);

  const onNodeClick = useCallback((_: React.MouseEvent, n: Node) => {
    setSelectedId((cur) => (cur === n.id ? null : n.id));
    setShowDepsForId(null);
  }, []);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, n: Node) => {
    setHoverId(n.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoverId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    setShowDepsForId(null);
  }, []);

  // Clear stale state when persona/view changes hide selection
  useEffect(() => {
    if (selectedId && !visibleNodeIds.has(selectedId)) {
      setSelectedId(null);
      setShowDepsForId(null);
    }
  }, [selectedId, visibleNodeIds]);

  // Reset selection when persona changes (different focus)
  useEffect(() => {
    setSelectedId(null);
    setHoverId(null);
    setShowDepsForId(null);
    setActiveInsight(null);
    setHighlightIds(new Set());
    setHighlightEdgeIds(new Set());
  }, [persona, viewMode, scope]);

  // Consume "Open recommended view" handoff from AI Copilot.
  // We read the payload once on mount, apply persona + highlight set, and
  // clear the highlight after a few seconds so the page settles.
  useEffect(() => {
    const raw = sessionStorage.getItem("cs-rescue:highlight");
    if (!raw) return;
    const timeouts: number[] = [];
    try {
      const payload = JSON.parse(raw) as {
        nodeIds?: string[];
        edgeIds?: string[];
        resourceIds?: string[];
        persona?: string;
        viewMode?: string;
        reason?: string;
        goal?: string;
        ts?: number;
      };
      sessionStorage.removeItem("cs-rescue:highlight");

      // Stale handoffs (older than 60s) are ignored.
      if (payload.ts && Date.now() - payload.ts > 60_000) return;

      const allowedPersonas = ["vp", "sales", "post-sales", "cs", "support", "engineering", "customer"] as const;
      let landedPersona: typeof persona | null = null;
      if (
        typeof payload.persona === "string" &&
        (allowedPersonas as readonly string[]).includes(payload.persona)
      ) {
        landedPersona = payload.persona as typeof persona;
        setPersona(landedPersona);
      }
      // Always land users in Business view — that's where the highlight reads best.
      setViewMode("business");

      const ids = Array.isArray(payload.nodeIds)
        ? payload.nodeIds.filter((x): x is string => typeof x === "string")
        : [];
      const edgeIds = Array.isArray(payload.edgeIds)
        ? payload.edgeIds.filter((x): x is string => typeof x === "string")
        : [];
      if (ids.length > 0) {
        setHighlightIds(new Set(ids));
        timeouts.push(window.setTimeout(() => setHighlightIds(new Set()), 6000));
      }
      if (edgeIds.length > 0) {
        setHighlightEdgeIds(new Set(edgeIds));
        timeouts.push(window.setTimeout(() => setHighlightEdgeIds(new Set()), 8000));
      }

      if (payload.reason === "AI_COPILOT") {
        const personaLabel = landedPersona
          ? landedPersona.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : "Persona";
        const goal = typeof payload.goal === "string" ? payload.goal : "Briefing";
        setAiToast(`AI recommended (${personaLabel} • ${goal}) — ${ids.length} node${ids.length === 1 ? "" : "s"} highlighted`);
        timeouts.push(window.setTimeout(() => setAiToast(null), 5000));
      }
    } catch {
      // Ignore malformed payloads.
    }
    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
    };
    // We intentionally only run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedNode = allNodes.find((n) => n.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="animate-pulse">Loading architecture graph…</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Top control strip */}
      <div className="px-6 py-3 border-b border-white/10 bg-slate-950/60 backdrop-blur-md flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
            <Network className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500 leading-none">Architecture</p>
            <p className="text-sm font-bold text-white leading-tight">CS Rescue Map</p>
          </div>
        </div>

        <div className="hidden lg:block max-w-md text-[11px] text-slate-400 italic leading-snug border-l border-white/10 pl-4">
          {persona === "customer" && (
            <span
              data-testid="customer-experience-badge"
              className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 not-italic text-[10px] font-semibold uppercase tracking-wide align-middle"
            >
              Customer Experience View
            </span>
          )}
          {PERSONA_PAGE_COPY[persona].architecture}
        </div>

        <div className="h-8 w-px bg-white/10" />

        <Kpi icon={<Heart className="w-3 h-3" />} label="System Health" value={`${summary?.systemHealth ?? 0}%`} accent="emerald" />
        <Kpi icon={<Layers className="w-3 h-3" />} label="Visible" value={`${visibleNodes.length}/${allNodes.length}`} accent="cyan" />
        <Kpi icon={<Activity className="w-3 h-3" />} label="Deployments" value={`${summary?.activeDeployments ?? 0}`} accent="indigo" />

        <div className="ml-auto flex items-center gap-3">
          <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
          {viewMode === "business" && (
            <>
              <button
                onClick={() => setClusterByRelevance(!clusterByRelevance)}
                aria-pressed={clusterByRelevance}
                data-testid="cluster-relevance-toggle"
                title="Re-order so primary nodes for this persona float to the top"
                className={cn(
                  "text-[11px] font-medium px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                  clusterByRelevance
                    ? "bg-purple-500/15 text-purple-200 border-purple-400/40"
                    : "bg-slate-900/60 text-slate-400 border-white/10 hover:text-white",
                )}
              >
                <ListOrdered className="w-3 h-3" />
                By relevance
              </button>
              <button
                onClick={() => setSimplify(!simplify)}
                aria-pressed={simplify}
                data-testid="simplify-toggle"
                className={cn(
                  "text-[11px] font-medium px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                  simplify
                    ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/40"
                    : "bg-slate-900/60 text-slate-400 border-white/10 hover:text-white",
                )}
              >
                <SparklesIcon className="w-3 h-3" />
                Simplify
              </button>
            </>
          )}
        </div>
      </div>

      {/* Insight Feed: insight-first surface, sits above the architecture canvas */}
      <InsightFeed
        insights={visibleInsights}
        selectedId={activeInsight?.id ?? null}
        scope={scope}
        onScopeChange={setScope}
        onSelect={handleSelectInsight}
      />

      {/* AI handoff toast */}
      {aiToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-2 rounded-lg bg-slate-900/95 border border-purple-400/40 text-xs text-purple-100 shadow-lg backdrop-blur flex items-center gap-2">
          <SparklesIcon className="w-3.5 h-3.5 text-purple-300" />
          <span>{aiToast}</span>
        </div>
      )}

      {/* Main canvas */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === "business" ? (
          <BusinessView
            nodes={visibleNodes}
            edges={allEdges}
            persona={persona}
            simplify={simplify}
            clusterByRelevance={clusterByRelevance}
            selectedId={selectedId}
            hoverId={hoverId}
            showDepsForId={showDepsForId}
            onSelect={setSelectedId}
            onHover={setHoverId}
            highlightIds={highlightIds}
          />
        ) : (
          <>
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onNodeMouseEnter={onNodeMouseEnter}
              onNodeMouseLeave={onNodeMouseLeave}
              onPaneClick={onPaneClick}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.3}
              maxZoom={1.6}
              proOptions={{ hideAttribution: true }}
              className="bg-slate-950"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(148,163,184,0.18)" />
              <Controls className="!bg-slate-900/90 !border !border-white/10 !rounded-md" showInteractive={false} />
              <MiniMap
                nodeColor={(n) => {
                  const layer = (n.data as ArchNodeData)?.layer;
                  if (layer === "lifecycle") return "#6366f1";
                  if (layer === "delivery") return "#3b82f6";
                  return "#06b6d4";
                }}
                maskColor="rgba(2,6,23,0.7)"
                className="!bg-slate-900/90 !border !border-white/10 !rounded-md"
                pannable
                zoomable
              />
            </ReactFlow>

            {/* Edge legend */}
            <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-white/10 bg-slate-900/90 backdrop-blur-md px-3 py-2 flex items-center gap-3 text-[10px]">
              {Object.entries(edgeColorByRel).map(([k, c]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded-full" style={{ background: c }} />
                  <span className="text-slate-400 capitalize">{k.replace("_", " ")}</span>
                </div>
              ))}
            </div>

            {/* Hint when no edges visible */}
            {viewMode === "dependency" && !focusId && !showDepsForId && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-200 backdrop-blur-md">
                Click a node to reveal its dependencies
              </div>
            )}
          </>
        )}

        <InsightDetailPanel
          insight={activeInsight}
          nodes={allNodes}
          onClose={() => handleSelectInsight(null)}
          onFocusNode={(id) => {
            setSelectedId(id);
            setShowDepsForId(id);
          }}
        />

        <Inspector
          node={selectedNode}
          allNodes={allNodes}
          allEdges={allEdges}
          resources={resources}
          persona={persona}
          showDeps={showDepsForId === selectedId}
          onToggleDeps={() => setShowDepsForId((cur) => (cur === selectedId ? null : selectedId))}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  const accentMap: Record<string, string> = {
    emerald: "text-emerald-300 bg-emerald-500/10",
    cyan: "text-cyan-300 bg-cyan-500/10",
    indigo: "text-indigo-300 bg-indigo-500/10",
    blue: "text-blue-300 bg-blue-500/10",
  };
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-6 h-6 rounded flex items-center justify-center", accentMap[accent])}>{icon}</div>
      <div>
        <p className="text-[10px] uppercase text-slate-500 leading-none">{label}</p>
        <p className="text-sm font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ViewModeSwitcher({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const iconFor = (v: ViewMode) => {
    if (v === "business") return <Layers className="w-3 h-3" />;
    if (v === "dependency") return <GitBranch className="w-3 h-3" />;
    return <Boxes className="w-3 h-3" />;
  };
  return (
    <div className="inline-flex items-center rounded-md border border-white/10 bg-slate-900/60 p-0.5">
      {VIEW_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          aria-pressed={value === m.id}
          aria-label={m.description}
          title={m.description}
          data-testid={`view-mode-${m.id}`}
          className={cn(
            "text-[11px] font-medium px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
            value === m.id ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-white",
          )}
        >
          {iconFor(m.id)}
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function Architecture() {
  return (
    <ReactFlowProvider>
      <ArchitectureInner />
    </ReactFlowProvider>
  );
}
