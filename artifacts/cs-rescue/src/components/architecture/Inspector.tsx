import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Activity, GitBranch, Users, ChevronDown, Eye, EyeOff, AlertTriangle, TrendingUp } from "lucide-react";
import type { Persona } from "@/lib/persona";
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
  persona?: Persona;
  showDeps?: boolean;
  onToggleDeps?: () => void;
  onClose: () => void;
}

type NodeWithMeta = ArchitectureNode & {
  businessCriticality?: number;
  technicalCriticality?: number;
  microStat?: string;
  roleTag?: string;
  simplifiedLabel?: string;
  clusterGroup?: string;
};

// What sections each persona cares about most. Telemetry is shared.
const PERSONA_FOCUS: Record<Persona, { headline: string; sections: ("blockers" | "adoption" | "deps" | "resources" | "capabilities" | "risk")[] }> = {
  vp: { headline: "Executive summary", sections: ["risk", "adoption", "blockers"] },
  sales: { headline: "Sales handoff context", sections: ["blockers", "deps", "resources"] },
  "post-sales": { headline: "Implementation context", sections: ["blockers", "deps", "resources", "capabilities"] },
  cs: { headline: "Adoption & expansion", sections: ["adoption", "risk", "resources"] },
  support: { headline: "Support context", sections: ["blockers", "deps", "resources"] },
  engineering: { headline: "Full system detail", sections: ["deps", "resources", "capabilities", "risk"] },
  customer: { headline: "Your experience here", sections: ["adoption", "blockers", "deps"] },
};

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

export function Inspector({ node, allNodes, allEdges, resources, persona = "vp", showDeps, onToggleDeps, onClose }: InspectorProps) {
  const { data: metrics = [] } = useGetNodeMetrics(node?.id ?? "", {
    query: {
      queryKey: getGetNodeMetricsQueryKey(node?.id ?? ""),
      enabled: !!node,
    },
  });

  // Progressive disclosure: only "summary" + telemetry are open by default
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["telemetry"]));
  const toggle = (key: string) =>
    setOpenSections((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (!node) return null;

  const meta = node as NodeWithMeta;
  const incoming = allEdges.filter((e) => e.target === node.id);
  const outgoing = allEdges.filter((e) => e.source === node.id);
  const linkedResources = resources.filter((r) => r.linkedNodeIds.includes(node.id));
  const connectedNodes = allNodes.filter((n) =>
    [...incoming.map((e) => e.source), ...outgoing.map((e) => e.target)].includes(n.id)
  );

  const focus = PERSONA_FOCUS[persona];
  const wantSection = (k: typeof focus.sections[number]) => focus.sections.includes(k);
  const health = node.healthScore ?? 85;
  const isAtRisk = health < 70 || node.status === "degraded" || node.status === "offline";

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
              {meta.roleTag ?? node.layer}
            </p>
            <h2 className="text-lg font-bold text-white mt-0.5 truncate">{node.name}</h2>
            <p className="text-xs text-slate-400 mt-1">{node.ownerTeam} · {focus.headline}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Risk banner — VP/CS persona priority */}
          {isAtRisk && (wantSection("risk") || wantSection("blockers")) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-200">Attention needed</p>
                <p className="text-[11px] text-amber-100/70 mt-0.5">
                  Health is {health}/100 — this node is impacting downstream lifecycle.
                </p>
              </div>
            </div>
          )}

          {/* KPI chips — always */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[10px] uppercase text-slate-500">Health</p>
              <p className="text-lg font-bold text-white">{health}<span className="text-xs text-slate-500">/100</span></p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[10px] uppercase text-slate-500">Status</p>
              <p className="text-sm font-semibold text-emerald-400 capitalize mt-1">{node.status}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[10px] uppercase text-slate-500">Linked</p>
              <p className="text-lg font-bold text-white">{connectedNodes.length}<span className="text-xs text-slate-500"> systems</span></p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{node.shortDescription}</p>

          {/* Show dependencies toggle (per-node) */}
          {onToggleDeps && (
            <button
              onClick={onToggleDeps}
              aria-pressed={!!showDeps}
              data-testid="toggle-deps"
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                showDeps
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                  : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20",
              )}
            >
              {showDeps ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showDeps ? "Hide dependencies on canvas" : "Show dependencies on canvas"}
            </button>
          )}

          {/* Telemetry — collapsible */}
          {metrics.length > 0 && (
            <Section
              icon={<Activity className="w-3.5 h-3.5" />}
              title="Telemetry"
              count={metrics.length}
              open={openSections.has("telemetry")}
              onToggle={() => toggle("telemetry")}
            >
              <div className="space-y-2.5">{metrics.map(renderChart)}</div>
            </Section>
          )}

          {/* Adoption-focused section for CS/VP */}
          {wantSection("adoption") && (
            <Section
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              title="Adoption signal"
              open={openSections.has("adoption")}
              onToggle={() => toggle("adoption")}
            >
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
                {meta.microStat && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Headline</span>
                    <span className="text-white font-semibold">{meta.microStat}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Business criticality</span>
                  <span className="text-cyan-300 font-semibold">{meta.businessCriticality ?? 3}/5</span>
                </div>
              </div>
            </Section>
          )}

          {/* Linked resources */}
          {linkedResources.length > 0 && wantSection("resources") && (
            <Section
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              title="Linked resources"
              count={linkedResources.length}
              open={openSections.has("resources")}
              onToggle={() => toggle("resources")}
            >
              <div className="space-y-1.5">
                {linkedResources.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.vendor} · {r.category}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                      r.status === "connected" ? "text-emerald-300 bg-emerald-500/10" : "text-amber-300 bg-amber-500/10",
                    )}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Dependencies */}
          {connectedNodes.length > 0 && wantSection("deps") && (
            <Section
              icon={<GitBranch className="w-3.5 h-3.5" />}
              title="Dependencies"
              count={connectedNodes.length}
              open={openSections.has("deps")}
              onToggle={() => toggle("deps")}
              badge={
                <span className="text-[10px] font-medium text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  {incoming.length} upstream · {outgoing.length} downstream
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-1.5">
                {connectedNodes.map((n) => (
                  <div key={n.id} className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5">
                    <p className="text-xs font-medium text-white truncate">{n.name}</p>
                    <p className={cn("text-[10px] capitalize", layerAccent[n.layer])}>{n.layer}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Capabilities */}
          {node.capabilities?.length > 0 && wantSection("capabilities") && (
            <Section
              icon={<Users className="w-3.5 h-3.5" />}
              title="Capabilities"
              count={node.capabilities.length}
              open={openSections.has("capabilities")}
              onToggle={() => toggle("capabilities")}
            >
              <div className="flex flex-wrap gap-1.5">
                {node.capabilities.map((c) => (
                  <span key={c} className="text-[11px] text-slate-300 px-2 py-1 rounded-md border border-white/10 bg-white/[0.03]">{c}</span>
                ))}
              </div>
            </Section>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  count,
  open,
  onToggle,
  children,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-slate-900/30 overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-slate-400">{icon}</span>
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300 flex-1 text-left">
          {title}
          {count !== undefined && <span className="text-slate-500 ml-1.5">({count})</span>}
        </span>
        {badge}
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
