import { RUBRIC_PILLARS, rubricBandMeta } from "@/data/portfolio";
import type { RubricV2Scores } from "@/data/portfolio";

interface PillarScorecardProps {
  rubric: RubricV2Scores;
  className?: string;
}

export function PillarScorecard({
  rubric,
  className = "mt-4 rounded-xl border border-border bg-card p-6",
}: PillarScorecardProps) {
  const portcoMeta = rubricBandMeta(rubric.portcoScore);
  return (
    <div className={className}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">4-pillar scorecard</h2>
        <span className="text-xs text-muted-foreground">
          Each pillar rated Low / Medium / High from external signals
        </span>
      </div>
      <div className="mt-4 divide-y divide-border">
        {RUBRIC_PILLARS.map((p) => {
          const value = rubric[p.key];
          const meta = rubricBandMeta(value);
          return (
            <div
              key={p.key}
              className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <p className="mt-1 text-xs text-muted-foreground">{p.measures}</p>
              </div>
              <div className="flex items-center gap-3 sm:w-64 sm:justify-end">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full ${meta.barClass} ${
                      value === "Insufficient Data" ? "opacity-40" : ""
                    }`}
                    style={{ width: `${meta.fillPct}%` }}
                  />
                </div>
                <span className={`w-28 text-right text-xs font-medium ${meta.textClass}`}>
                  {meta.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-border pt-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">PortCo Score</div>
          <div
            className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${portcoMeta.badgeClass}`}
          >
            {portcoMeta.label}
          </div>
        </div>
        <p className="max-w-xs text-[11px] text-muted-foreground">{portcoMeta.description}</p>
      </div>
    </div>
  );
}
