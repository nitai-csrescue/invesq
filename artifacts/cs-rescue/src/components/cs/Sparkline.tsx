import { cn } from "@/lib/utils";

interface Props {
  values: number[];
  className?: string;
  stroke?: string;
  height?: number;
}

export function Sparkline({ values, className, stroke = "currentColor", height = 32 }: Props) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = height;
  const step = w / (values.length - 1 || 1);
  const points = values.map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`).join(" ");
  const last = values[values.length - 1];
  const lastY = h - ((last - min) / range) * h;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      <circle cx={w} cy={lastY} r={1.6} fill={stroke} />
    </svg>
  );
}
