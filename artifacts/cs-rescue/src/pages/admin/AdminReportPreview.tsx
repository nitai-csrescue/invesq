import { FileText } from "lucide-react";
import { PillarScorecard } from "@/components/portfolio/PillarScorecard";
import { PILLARS, PILLAR_MAX, type PillarScore } from "@/data/portfolio";
import type { AdminCompanyReportData } from "@workspace/api-client-react";

function textToPillarScore(text: string): PillarScore {
  if (text === "NA") return null;
  const n = Number(text);
  return n === 0 || n === 1 || n === 2 ? (n as PillarScore) : null;
}

function toRecord<T>(source: Record<string, T>): Record<string, T> {
  return Object.fromEntries(PILLARS.map((p, i) => [p.id, source[`p${i + 1}`]]));
}

interface AdminReportPreviewProps {
  data: AdminCompanyReportData;
}

export function AdminReportPreview({ data }: AdminReportPreviewProps) {
  const scores = Object.fromEntries(
    Object.entries(toRecord(data.scores)).map(([id, text]) => [id, textToPillarScore(text)])
  );
  const evidence = toRecord(data.evidence);
  const compositeDisplay = data.compositeMax > 0 ? String(data.composite) : "—";

  return (
    <div className="space-y-4" data-testid="admin-report-preview">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary">
              <FileText className="h-3.5 w-3.5" /> Diagnostic report preview
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{data.companyName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.parentFund}</p>
            <span className="mt-3 inline-flex items-center rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              {data.tier}
            </span>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 1 composite</div>
            <div className="font-mono text-4xl font-bold leading-none text-foreground">
              {compositeDisplay}
              <span className="text-base text-muted-foreground">
                {data.compositeMax > 0 ? ` / ${data.compositeMax}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Assessment date</div>
            <div className="mt-0.5 text-sm font-medium text-foreground">{data.assessmentDate}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Report date</div>
            <div className="mt-0.5 text-sm font-medium text-foreground">{data.reportDate}</div>
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
        displayMax={data.compositeMax}
        evidence={evidence}
        className="rounded-xl border border-border bg-card p-6"
      />
    </div>
  );
}
