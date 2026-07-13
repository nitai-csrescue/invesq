import { Link } from "wouter";
import { Loader2, ArrowRight, GitBranch } from "lucide-react";
import {
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  type AdminFirmSummary,
} from "@workspace/api-client-react";
import { isJobActive, jobStatusPillClass, formatJobEta } from "@/lib/adminJobs";

// ---------------------------------------------------------------------------
// Build queue — every firm with a discovery/build job, active ones first.
// Read-only surface; the actual re-run controls live in each firm's lens.
// ---------------------------------------------------------------------------
function BuildQueue({ firms }: { firms: AdminFirmSummary[] }) {
  const withJobs = firms
    .filter((f) => f.latestJob)
    .sort((a, b) => {
      const aActive = isJobActive(a.latestJob) ? 1 : 0;
      const bActive = isJobActive(b.latestJob) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (b.latestJob?.id ?? 0) - (a.latestJob?.id ?? 0);
    });

  if (withJobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="text-pipeline-empty">
        No discovery or build jobs yet.
      </p>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      data-testid="table-pipeline"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card">
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Firm
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Job
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Progress
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              ETA
            </th>
            <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Open
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {withJobs.map((firm) => {
            const job = firm.latestJob!;
            const active = isJobActive(job);
            return (
              <tr
                key={firm.id}
                className="bg-card/40 transition-colors hover:bg-card"
                data-testid={`row-pipeline-${firm.id}`}
              >
                <td className="px-5 py-4">
                  <span className="font-medium text-foreground">{firm.name}</span>
                  <code className="ml-2 rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {firm.slug}
                  </code>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{job.type}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${jobStatusPillClass(job.status)}`}
                  >
                    {active && <Loader2 className="h-3 w-3 animate-spin" />}
                    {job.status}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-foreground">
                  {active ? `${job.progressPct}%` : "—"}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {active ? formatJobEta(job.etaSeconds) : "—"}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={
                      active
                        ? `/admin/jobs/${job.id}`
                        : firm.status === "ready"
                          ? `/${firm.slug}/portfolio`
                          : `/admin/firms/${firm.id}`
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    data-testid={`link-pipeline-${firm.id}`}
                  >
                    {active ? "View job" : firm.status === "ready" ? "Open portal" : "Review firm"}{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPipeline() {
  const { data: firms, isLoading, isError } = useListAdminFirms({
    query: {
      queryKey: getListAdminFirmsQueryKey(),
      refetchInterval: (query) =>
        query.state.data?.some((f) => isJobActive(f.latestJob)) ? 4000 : false,
    },
  });

  return (
    <div data-testid="admin-pipeline-page">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
        Internal
      </div>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
        <GitBranch className="h-5 w-5 text-primary" />
        Pipeline
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Discovery and build jobs across every firm.
      </p>

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Build queue</h2>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">Failed to load jobs.</p>
          )}
          {firms && <BuildQueue firms={firms} />}
        </section>
      </div>
    </div>
  );
}
