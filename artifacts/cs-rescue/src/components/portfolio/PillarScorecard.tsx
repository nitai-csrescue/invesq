import { PILLARS, scoreLevel } from "@/data/portfolio";
import type { PillarScore } from "@/data/portfolio";

interface PillarScorecardProps {
  scores: Record<string, PillarScore>;
  compositeDisplay: string;
  displayMax: number;
  evidence?: Partial<Record<string, string | null>>;
  className?: string;
}

export function PillarScorecard({
  scores,
  compositeDisplay,
  displayMax,
  evidence,
  className = "mt-4 rounded-xl border border-border bg-card p-6",
}: PillarScorecardProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">8-pillar scorecard</h2>
        <span className="text-xs text-muted-foreground">
          Each pillar scored 0–2 · Phase 1 unweighted · weights apply in Phase 2
        </span>
      </div>
      <div className="mt-4 divide-y divide-border">
        {PILLARS.map((p) => {
          const score = scores[p.id];
          const lvl = scoreLevel(score);
          const fill = score === null ? 0 : (score / 2) * 100;
          const note = evidence?.[p.id];
          return (
            <div
              key={p.id}
              className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    ×{p.weight.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.measures}</p>
                {note && <p className="mt-1.5 text-xs italic text-muted-foreground/80">{note}</p>}
              </div>
              <div className="flex items-center gap-3 sm:w-56 sm:justify-end">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full ${lvl.barClass} ${score === null ? "opacity-40" : ""}`}
                    style={{ width: `${score === null ? 100 : fill}%` }}
                  />
                </div>
                <span className={`w-16 text-right font-mono text-xs font-medium ${lvl.textClass}`}>
                  {score === null ? "N/A" : `${score} / 2`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 1 · unweighted</div>
          <div className="font-mono text-lg font-semibold text-foreground">
            {compositeDisplay}{" "}
            <span className="text-xs text-muted-foreground">
              {displayMax > 0 ? `/ ${displayMax}` : "Insufficient Data"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
