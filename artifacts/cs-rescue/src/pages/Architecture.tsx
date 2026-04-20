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
  type ArchitectureEdge as ArchEdge,
} from "@workspace/api-client-react";
import { Activity, Layers, Heart, Network, Filter } from "lucide-react";
import { ArchitectureNodeComp, type ArchNodeData } from "@/components/architecture/ArchitectureNode";
import { Inspector } from "@/components/architecture/Inspector";
import { cn } from "@/lib/utils";

const nodeTypes = { arch: ArchitectureNodeComp };

const layerLabels: Record<string, string> = {
  lifecycle: "Lifecycle Motions",
  delivery: "Delivery & Orchestration",
  platform: "Shared Platform / Systems",
};

const layerColors: Record<string, string> = {
  lifecycle: "rgba(99, 102, 241, 0.06)",
  delivery: "rgba(59, 130, 246, 0.06)",
  platform: "rgba(6, 182, 212, 0.06)",
};

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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  const allNodes = graph?.nodes ?? [];
  const allEdges = graph?.edges ?? [];

  const visibleNodeIds = useMemo(() => {
    return new Set(
      allNodes
        .filter((n) => layerFilter === "all" || n.layer === layerFilter)
        .filter((n) => {
          if (healthFilter === "all") return true;
          const h = n.healthScore ?? 100;
          if (healthFilter === "healthy") return h >= 85;
          if (healthFilter === "warning") return h >= 70 && h < 85;
          if (healthFilter === "risk") return h < 70;
          return true;
        })
        .map((n) => n.id),
    );
  }, [allNodes, layerFilter, healthFilter]);

  const connectedToSelected = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>();
    for (const e of allEdges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [selectedId, allEdges]);

  const rfNodes: Node<ArchNodeData>[] = useMemo(() => {
    return allNodes
      .filter((n) => visibleNodeIds.has(n.id))
      .map((n) => {
        const isSelected = selectedId === n.id;
        const isConnected = connectedToSelected.has(n.id);
        const isDimmed = !!selectedId && !isSelected && !isConnected;
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
  }, [allNodes, visibleNodeIds, selectedId, connectedToSelected]);

  const rfEdges: Edge[] = useMemo(() => {
    return allEdges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => {
        const color = edgeColorByRel[e.relationshipType] ?? "#94a3b8";
        const isHighlighted =
          !selectedId || e.source === selectedId || e.target === selectedId;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: e.status === "active" && isHighlighted,
          label: e.label,
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
          labelStyle: { fill: "#cbd5e1", fontSize: 10 },
          style: {
            stroke: color,
            strokeWidth: isHighlighted ? Math.max(1.5, e.strength / 4) : 0.8,
            opacity: isHighlighted ? (e.status === "degraded" ? 0.6 : 0.85) : 0.18,
            strokeDasharray: e.status === "degraded" ? "6 4" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 14,
            height: 14,
          },
        } as Edge;
      });
  }, [allEdges, visibleNodeIds, selectedId]);

  const onNodeClick = useCallback((_: React.MouseEvent, n: Node) => {
    setSelectedId((cur) => (cur === n.id ? null : n.id));
  }, []);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

  // Clear stale selection if filters hide the selected node
  useEffect(() => {
    if (selectedId && !visibleNodeIds.has(selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, visibleNodeIds]);

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
      {/* Top KPI strip */}
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
        <div className="h-8 w-px bg-white/10" />
        <Kpi icon={<Heart className="w-3 h-3" />} label="System Health" value={`${summary?.systemHealth ?? 0}%`} accent="emerald" />
        <Kpi icon={<Layers className="w-3 h-3" />} label="Nodes" value={`${summary?.totalNodes ?? 0}`} accent="cyan" />
        <Kpi icon={<Activity className="w-3 h-3" />} label="Active Deployments" value={`${summary?.activeDeployments ?? 0}`} accent="indigo" />
        <Kpi icon={<Network className="w-3 h-3" />} label="Edges" value={`${allEdges.length}`} accent="blue" />

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <SegmentedFilter
            value={layerFilter}
            onChange={setLayerFilter}
            options={[
              { v: "all", l: "All Layers" },
              { v: "lifecycle", l: "Lifecycle" },
              { v: "delivery", l: "Delivery" },
              { v: "platform", l: "Platform" },
            ]}
          />
          <SegmentedFilter
            value={healthFilter}
            onChange={setHealthFilter}
            options={[
              { v: "all", l: "All" },
              { v: "healthy", l: "Healthy" },
              { v: "warning", l: "Warning" },
              { v: "risk", l: "At Risk" },
            ]}
          />
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        {/* Swimlane backgrounds */}
        <SwimlanesOverlay />

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
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

        <Inspector
          node={selectedNode}
          allNodes={allNodes}
          allEdges={allEdges}
          resources={resources}
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

function SegmentedFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-white/10 bg-slate-900/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          aria-label={`Filter: ${o.l}`}
          className={cn(
            "text-[11px] font-medium px-2.5 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
            value === o.v ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-white",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function SwimlanesOverlay() {
  const lanes = [
    { layer: "lifecycle", top: 30, height: 200 },
    { layer: "delivery", top: 270, height: 200 },
    { layer: "platform", top: 530, height: 380 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none z-0" style={{ transform: "translateZ(0)" }}>
      {lanes.map((l) => (
        <div
          key={l.layer}
          className="absolute left-0 right-0 border-y border-white/[0.04]"
          style={{ top: l.top, height: l.height, background: layerColors[l.layer] }}
        >
          <div className="absolute left-4 top-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-600">
            {layerLabels[l.layer]}
          </div>
        </div>
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
