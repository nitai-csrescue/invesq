import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Activity, GitBranch, Users } from "lucide-react";
import {
  useGetNodeMetrics,
  getGetNodeMetricsQueryKey,
  type ArchitectureNode,
  type ArchitectureEdge,
  type Resource,
  type NodeMetricSeries,
} from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { cn } from "@/lib/utils";

interface InspectorProps {
  node: ArchitectureNode | null;
  allNodes: ArchitectureNode[];
  allEdges: ArchitectureEdge[];
  resources: Resource[];
  onClose: () => void;
}

const layerAccent: Record<string, string> = {
  lifecycle: "text-indigo-300",
  delivery: "text-blue-300",
  platform: "text-cyan-300",
};

function MiniLine({ series }: { series: NodeMetricSeries }) {
  const data = series.points.map((p, i) => ({ i, value: p.value }));
  const positive = (series.delta ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{series.metricName}</p>
        {series.delta !== undefined && (
          <span className={cn("text-[10px] font-semibold", positive ? "text-emerald-400" : "text-red-400")}>
            {positive ? "▲" : "▼"} {Math.abs(series.delta)}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-white">{series.currentValue}</p>
          <p className="text-[10px] text-slate-500">{series.unit}</p>
        </div>
        <div className="flex-1 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ series }: { series: NodeMetricSeries }) {
  const data = series.points.map((p) => ({ name: p.label ?? p.timestamp, value: p.value }));
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-2">{series.metricName}</p>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
            <Bar dataKey="value" fill="#22d3ee" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MiniRadial({ series }: { series: NodeMetricSeries }) {
  const value = series.currentValue ?? series.points[0]?.value ?? 0;
  const data = [{ name: "v", value, fill: value >= 85 ? "#10b981" : value >= 70 ? "#f59e0b" : "#ef4444" }];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{series.metricName}</p>
      <div className="h-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "rgba(255,255,255,0.06)" } as object} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-[10px] text-slate-400">{series.unit}</p>
        </div>
      </div>
    </div>
  );
}

function renderChart(series: NodeMetricSeries) {
  switch (series.chartType) {
    case "bar":
      return <MiniBar key={series.id} series={series} />;
    case "radial":
    case "donut":
      return <MiniRadial key={series.id} series={series} />;
    case "line":
    case "sparkline":
    default:
      return <MiniLine key={series.id} series={series} />;
  }
}

export function Inspector({ node, allNodes, allEdges, resources, onClose }: InspectorProps) {
  const { data: metrics = [] } = useGetNodeMetrics(node?.id ?? "", {
    query: {
      queryKey: getGetNodeMetricsQueryKey(node?.id ?? ""),
      enabled: !!node,
    },
  });

  if (!node) return null;

  const incoming = allEdges.filter((e) => e.target === node.id);
  const outgoing = allEdges.filter((e) => e.source === node.id);
  const linkedResources = resources.filter((r) => r.linkedNodeIds.includes(node.id));
  const connectedNodes = allNodes.filter((n) =>
    [...incoming.map((e) => e.source), ...outgoing.map((e) => e.target)].includes(n.id)
  );

  return (
    <AnimatePresence>
      <motion.aside
        key={node.id}
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 480, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="absolute top-0 right-0 h-full w-[440px] border-l border-white/10 bg-slate-950/95 backdrop-blur-xl z-20 overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className={cn("text-[11px] uppercase tracking-wider font-semibold", layerAccent[node.layer])}>
              {node.layer}
            </p>
            <h2 className="text-lg font-bold text-white mt-0.5 truncate">{node.name}</h2>
            <p className="text-xs text-slate-400 mt-1">{node.ownerTeam}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* KPI chips */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[10px] uppercase text-slate-500">Health</p>
              <p className="text-lg font-bold text-white">{node.healthScore ?? "—"}<span className="text-xs text-slate-500">/100</span></p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[10px] uppercase text-slate-500">Status</p>
              <p className="text-sm font-semibold text-emerald-400 capitalize mt-1">{node.status}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[10px] uppercase text-slate-500">Edges</p>
              <p className="text-lg font-bold text-white">{incoming.length + outgoing.length}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{node.shortDescription}</p>

          {/* Charts */}
          {metrics.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-400">
                <Activity className="w-3.5 h-3.5" />
                <p className="text-[11px] uppercase tracking-wider font-semibold">Telemetry</p>
              </div>
              {metrics.map(renderChart)}
            </div>
          )}

          {/* Linked resources */}
          {linkedResources.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <ExternalLink className="w-3.5 h-3.5" />
                <p className="text-[11px] uppercase tracking-wider font-semibold">Linked Resources</p>
              </div>
              <div className="space-y-1.5">
                {linkedResources.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.vendor} · {r.category}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                      r.status === "connected" ? "text-emerald-300 bg-emerald-500/10" : "text-amber-300 bg-amber-500/10"
                    )}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {connectedNodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <GitBranch className="w-3.5 h-3.5" />
                <p className="text-[11px] uppercase tracking-wider font-semibold">Dependencies ({connectedNodes.length})</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {connectedNodes.map((n) => (
                  <div key={n.id} className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5">
                    <p className="text-xs font-medium text-white truncate">{n.name}</p>
                    <p className={cn("text-[10px] capitalize", layerAccent[n.layer])}>{n.layer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {node.capabilities?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-3.5 h-3.5" />
                <p className="text-[11px] uppercase tracking-wider font-semibold">Capabilities</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {node.capabilities.map((c) => (
                  <span key={c} className="text-[11px] text-slate-300 px-2 py-1 rounded-md border border-white/10 bg-white/[0.03]">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
