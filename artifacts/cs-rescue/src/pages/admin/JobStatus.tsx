import { useRoute, Link } from "wouter";
import { Loader2, Timer } from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGetJob, getGetJobQueryKey } from "@workspace/api-client-react";

const STATUS_STYLES: Record<string, string> = {
  queued: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  running: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

function statusPillClass(status: string) {
  return STATUS_STYLES[status] ?? "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function formatEta(etaSeconds: number | null): string {
  if (etaSeconds === null) return "ETA unknown";
  if (etaSeconds <= 0) return "Finishing up…";
  if (etaSeconds < 60) return `~${etaSeconds}s remaining`;
  const minutes = Math.round(etaSeconds / 60);
  return `~${minutes} min remaining`;
}

export default function JobStatus() {
  const [, params] = useRoute("/admin/jobs/:id");
  const id = Number(params?.id);

  const { data: job, isLoading, isError } = useGetJob(id, {
    query: {
      queryKey: getGetJobQueryKey(id),
      enabled: Number.isInteger(id) && id > 0,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 4000;
      },
    },
  });

  return (
    <div className="p-6 max-w-[800px] mx-auto" data-testid="admin-job-status-page">
      <PageHeader
        eyebrow="Internal"
        title={`Job #${params?.id ?? ""}`}
        subtitle="Polls every few seconds until the job finishes."
        actions={
          <Link
            href="/admin/firms"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to firms
          </Link>
        }
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-job-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading job…
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive" data-testid="text-job-error">
          Job not found.
        </p>
      )}

      {job && (
        <Card data-testid="card-job-status">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize">{job.type} job</CardTitle>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusPillClass(job.status)}`}
                data-testid="text-job-status"
              >
                {job.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-mono text-foreground" data-testid="text-job-progress-pct">
                  {job.progressPct}%
                </span>
              </div>
              <Progress value={job.progressPct} data-testid="progress-job" />
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-job-eta">
              <Timer className="h-3.5 w-3.5" />
              {formatEta(job.etaSeconds)}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground border-t border-border pt-4">
              <dt>Target</dt>
              <dd className="text-foreground">#{job.targetId}</dd>
              <dt>Job ID</dt>
              <dd className="text-foreground">#{job.id}</dd>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
