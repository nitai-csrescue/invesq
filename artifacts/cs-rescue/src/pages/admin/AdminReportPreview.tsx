import { FileText, Sparkles } from "lucide-react";
import { PillarScorecard } from "@/components/portfolio/PillarScorecard";
import { PILLARS, PILLAR_MAX, type PillarScore } from "@/data/portfolio";
import type { AdminCompanyReportData } from "@workspace/api-client-react";

function toPillarScore(value: number | string): PillarScore {
  return value === 0 || value === 1 || value === 2 ? (value as PillarScore) : null;
}

function toRecord<T>(source: Record<string, T>): Record<string, T> {
  return Object.fromEntries(PILLARS.map((p, i) => [p.id, source[`p${i + 1}`]]));
}

function formatGeneratedAt(generatedAt: string): string {
  return new Date(generatedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface AdminReportPreviewProps {
  data: AdminCompanyReportData;
}

export function AdminReportPreview({ data }: AdminReportPreviewProps) {
  const { reportData, meta } = data;
  const scores = Object.fromEntries(
    Object.entries(toRecord(reportData.scores)).map(([id, value]) => [id, toPillarScore(value)])
  );
  const evidence = toRecord(reportData.pillarEvidence);
  const compositeDisplay = meta.compositeMax > 0 ? String(meta.composite) : "—";

  return (
    <div className="space-y-4" data-testid="admin-report-preview">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary">
              <FileText className="h-3.5 w-3.5" /> Diagnostic report preview
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{reportData.companyName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{reportData.parentFund}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                {meta.tier}
              </span>
              {meta.generatedAt ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                  data-testid="badge-report-generated"
                >
                  <Sparkles className="h-3 w-3" /> AI narrative generated {formatGeneratedAt(meta.generatedAt)}
                </span>
              ) : (
                <span
                  className="inline-flex items-center rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                  data-testid="badge-report-not-generated"
                >
                  Narrative not yet generated
                </span>
              )}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 1 composite</div>
            <div className="font-mono text-4xl font-bold leading-none text-foreground">
              {compositeDisplay}
              <span className="text-base text-muted-foreground">
                {meta.compositeMax > 0 ? ` / ${meta.compositeMax}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Assessment date</div>
            <div className="mt-0.5 text-sm font-medium text-foreground">{meta.assessmentDate}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Report date</div>
            <div className="mt-0.5 text-sm font-medium text-foreground">{reportData.reportDate}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Framework</div>
            <div className="mt-0.5 text-sm font-medium text-foreground">8 pillars · 0–{PILLAR_MAX}</div>
          </div>
        </div>
      </div>

      <PillarScorecard
        scores={scores}
        compositeDisplay={compositeDisplay}
        displayMax={meta.compositeMax}
        evidence={evidence}
        className="rounded-xl border border-border bg-card p-6"
      />

      {meta.generatedAt ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-6" data-testid="admin-report-narrative">
          {reportData.execSummary.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Executive summary</h3>
              <div className="mt-2 space-y-2">
                {reportData.execSummary.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          )}

          {reportData.compositeContext && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Composite context</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{reportData.compositeContext}</p>
            </section>
          )}

          {reportData.existingSystems && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Existing systems</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{reportData.existingSystems}</p>
            </section>
          )}

          {reportData.pathForward && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Path forward</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{reportData.pathForward}</p>
            </section>
          )}

          {reportData.p6Recommendation && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">CS leadership recommendation</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{reportData.p6Recommendation}</p>
            </section>
          )}

          {reportData.gaps.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Identified gaps</h3>
              <div className="mt-2 space-y-3">
                {reportData.gaps.map((gap, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background/60 p-3">
                    <div className="text-sm font-medium text-foreground">{gap.title}</div>
                    {gap.description && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{gap.description}</p>
                    )}
                    {gap.impact && (
                      <p className="mt-1 text-sm leading-relaxed text-foreground">
                        <span className="font-medium">Impact: </span>
                        {gap.impact}
                      </p>
                    )}
                    {gap.recommendation && (
                      <p className="mt-1 text-sm leading-relaxed text-foreground">
                        <span className="font-medium">Recommendation: </span>
                        {gap.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {reportData.nextSteps.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Next steps</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                {reportData.nextSteps.map((step, i) => (
                  <li key={i} className="text-sm leading-relaxed text-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
