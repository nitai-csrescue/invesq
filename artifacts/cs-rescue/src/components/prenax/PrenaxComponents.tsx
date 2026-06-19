import { ReactNode } from "react";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { HealthBand, bandLabel } from "@/data/prenax";

export function HealthBadge({ band, className = "" }: { band: HealthBand; className?: string }) {
  const colors = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  const icons = {
    green: <CheckCircle2 className="w-3 h-3 mr-1.5" />,
    amber: <AlertCircle className="w-3 h-3 mr-1.5" />,
    red: <AlertTriangle className="w-3 h-3 mr-1.5" />,
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[band]} ${className}`}>
      {icons[band]}
      {bandLabel[band]}
    </span>
  );
}

export function ScoreRing({ score, band, size = 64, strokeWidth = 6 }: { score: number, band: HealthBand, size?: number, strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const colors = {
    green: "stroke-emerald-500",
    amber: "stroke-amber-500",
    red: "stroke-rose-500",
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colors[band]} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-200">
        {score}
      </span>
    </div>
  );
}

export function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return <span className="inline-flex items-center text-emerald-400 text-xs font-medium"><ArrowUpRight className="w-3 h-3 mr-0.5"/>{delta}</span>;
  }
  if (delta < 0) {
    return <span className="inline-flex items-center text-rose-400 text-xs font-medium"><ArrowDownRight className="w-3 h-3 mr-0.5"/>{Math.abs(delta)}</span>;
  }
  return <span className="inline-flex items-center text-slate-500 text-xs font-medium"><Minus className="w-3 h-3 mr-0.5"/>{delta}</span>;
}

export function MiniSparkline({ data, color }: { data: number[], color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={[min - 5, max + 5]} hide />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode, className?: string }) {
  return (
    <div className={`bg-[#0f1526] border border-slate-800/60 rounded-xl overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  );
}
