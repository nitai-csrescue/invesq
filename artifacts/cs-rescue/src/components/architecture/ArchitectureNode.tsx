import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

export interface ArchNodeData {
  label: string;
  icon: string;
  layer: "lifecycle" | "delivery" | "platform";
  status: "active" | "degraded" | "offline" | "warning";
  healthScore: number;
  ownerTeam: string;
  shortDescription: string;
  isSelected?: boolean;
  isDimmed?: boolean;
  isConnected?: boolean;
}

const layerStyles = {
  lifecycle: {
    border: "border-indigo-400/40",
    bg: "from-indigo-500/15 to-indigo-700/10",
    icon: "text-indigo-300 bg-indigo-500/15",
    glow: "shadow-[0_0_22px_rgba(99,102,241,0.35)]",
  },
  delivery: {
    border: "border-blue-400/40",
    bg: "from-blue-500/15 to-blue-700/10",
    icon: "text-blue-300 bg-blue-500/15",
    glow: "shadow-[0_0_22px_rgba(59,130,246,0.35)]",
  },
  platform: {
    border: "border-cyan-400/40",
    bg: "from-cyan-500/15 to-cyan-700/10",
    icon: "text-cyan-300 bg-cyan-500/15",
    glow: "shadow-[0_0_22px_rgba(6,182,212,0.35)]",
  },
};

const statusDot: Record<ArchNodeData["status"], string> = {
  active: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
  warning: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]",
  degraded: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.7)]",
  offline: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]",
};

function HealthRing({ score }: { score: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c * (1 - pct / 100);
  const color = pct >= 85 ? "#34d399" : pct >= 70 ? "#fbbf24" : "#f87171";
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="shrink-0">
      <circle cx="15" cy="15" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="15"
        cy="15"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 15 15)"
      />
      <text x="15" y="18" textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
        {Math.round(pct)}
      </text>
    </svg>
  );
}

function ArchitectureNodeImpl({ data }: NodeProps<ArchNodeData>) {
  const styles = layerStyles[data.layer];
  const Icon = (Icons as unknown as Record<string, React.FC<{ className?: string }>>)[data.icon] || Icons.Box;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-gradient-to-br backdrop-blur-sm transition-all w-[210px]",
        styles.border,
        styles.bg,
        data.isSelected && cn("ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950", styles.glow),
        data.isConnected && !data.isSelected && "ring-1 ring-cyan-400/50",
        data.isDimmed && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400/60 !border-0 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400/60 !border-0 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-cyan-400/60 !border-0 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-cyan-400/60 !border-0 !w-2 !h-2" />

      <div className="p-3 flex items-start gap-2.5">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", styles.icon)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", statusDot[data.status])} />
            <p className="font-semibold text-[13px] text-white leading-tight truncate">{data.label}</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{data.ownerTeam}</p>
        </div>
        <HealthRing score={data.healthScore} />
      </div>
    </div>
  );
}

export const ArchitectureNodeComp = memo(ArchitectureNodeImpl);
