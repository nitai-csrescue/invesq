import { useRoute, Link } from "wouter";
import { Loader2, Timer, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGetJob, getGetJobQueryKey } from "@workspace/api-client-react";
import { jobStatusPillClass, formatJobEta, isJobActive } from "@/lib/adminJobs";

export default function JobStatus() {
  const [, params] = useRoute("/admin/jobs/:id");
  const id = Number(params?.id);

  const { data: job, isLoading, isError } = useGetJob(id, {
    query: {
      queryKey: getGetJobQueryKey(id),
      enabled: Number.isInteger(id) && id > 0,
      refetchInterval: (query) => (isJobActive(query.state.data) ? 4000 : false),
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
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${jobStatusPillClass(job.status)}`}
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
              {formatJobEta(job.etaSeconds)}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground border-t border-border pt-4">
              <dt>Target</dt>
              <dd className="text-foreground">#{job.targetId}</dd>
              <dt>Job ID</dt>
              <dd className="text-foreground">#{job.id}</dd>
            </dl>

            {job.type === "build" && job.status === "completed" && (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                data-testid="banner-job-ready"
              >
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Build complete. Firm is ready.
                </p>
                <Link
                  href={`/admin/firms/${job.targetId}`}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  data-testid="link-view-firm"
                >
                  View firm <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {job.status === "failed" && (
              <div
                className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
                data-testid="banner-job-failed"
              >
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{job.error ?? "Job failed with no error detail."}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
