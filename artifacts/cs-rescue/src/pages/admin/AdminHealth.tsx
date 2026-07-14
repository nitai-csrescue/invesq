import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  useGetAdminSystemHealth,
  getGetAdminSystemHealthQueryKey,
  type SystemHealthFirmIssue,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

const SEVERITY_STYLES = {
  broken: {
    row: "border-rose-200 bg-rose-50",
    badge: "border-rose-300 bg-rose-100 text-rose-700",
    icon: XCircle,
    iconClass: "text-rose-500",
  },
  needs_action: {
    row: "border-amber-200 bg-amber-50",
    badge: "border-amber-300 bg-amber-100 text-amber-700",
    icon: AlertTriangle,
    iconClass: "text-amber-500",
  },
};

const ISSUE_DESCRIPTIONS: Record<SystemHealthFirmIssue["issue"], string> = {
  discovery_empty:
    "Discovery completed but found zero companies. Admin must enter companies manually and re-run.",
  discovery_failed:
    "Discovery job failed with an error. Open the firm panel to retry.",
  build_failed:
    "Build (Claude scoring) job failed. Open the firm panel to retry.",
  ready_no_active_companies:
    "Firm is marked ready but has no active companies, so the tenant portal 404s.",
  pending_no_job:
    "Firm is pending with no discovery job. Something went wrong at creation.",
  candidate_review_needed:
    "Discovery found candidate companies waiting for admin confirmation before build.",
};

function IssueRow({ issue }: { issue: SystemHealthFirmIssue }) {
  const style = SEVERITY_STYLES[issue.severity];
  const Icon = style.icon;
  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 ${style.row}`}
      data-testid={`health-issue-${issue.firmId}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{issue.firmName}</span>
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {issue.slug}
          </code>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
          >
            {issue.severity === "broken" ? "Broken" : "Needs action"}
          </span>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            {issue.firmStatus}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-foreground">{issue.issueLabel}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {ISSUE_DESCRIPTIONS[issue.issue]}
        </p>
        {issue.lastJobType && (
          <p className="mt-1 text-xs text-muted-foreground">
            Last job: <span className="font-mono">{issue.lastJobType}</span> &rarr;{" "}
            <span className="font-mono">{issue.lastJobStatus}</span>
            {" "}
            &middot; {issue.companyCount} non-excluded company(-ies)
          </p>
        )}
      </div>
      <Link
        href={issue.recoveryUrl}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        data-testid={`health-issue-link-${issue.firmId}`}
      >
        Open panel <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export default function AdminHealth() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, dataUpdatedAt } = useGetAdminSystemHealth({
    query: {
      queryKey: getGetAdminSystemHealthQueryKey(),
      refetchInterval: 60_000,
    },
  });

  const broken = data?.issues.filter((i) => i.severity === "broken") ?? [];
  const needsAction = data?.issues.filter((i) => i.severity === "needs_action") ?? [];
  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div data-testid="admin-health-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
            Internal
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            System Health
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live audit of all firm pipeline states. Broken firms block the tenant
            portal; firms needing action require admin intervention before a
            Republish.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: getGetAdminSystemHealthQueryKey(),
            })
          }
          data-testid="button-health-refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking system health…
        </div>
      )}

      {isError && (
        <p className="mt-8 text-sm text-destructive" data-testid="health-error">
          Failed to load health report. Ensure the API server is running.
        </p>
      )}

      {data && (
        <div className="mt-6 space-y-6">
          {/* Summary bar */}
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            data-testid="health-summary"
          >
            {[
              { label: "Total firms", value: data.summary.total, color: "text-foreground" },
              {
                label: "Healthy",
                value: data.summary.healthy,
                color: "text-emerald-600",
              },
              {
                label: "Needs action",
                value: data.summary.needsAction,
                color: data.summary.needsAction > 0 ? "text-amber-600" : "text-muted-foreground",
              },
              {
                label: "Broken",
                value: data.summary.broken,
                color: data.summary.broken > 0 ? "text-rose-600" : "text-muted-foreground",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </div>
                <div className={`mt-1 text-2xl font-semibold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* All healthy state */}
          {data.ok && data.summary.needsAction === 0 && (
            <div
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
              data-testid="health-all-clear"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-800">All firms healthy</p>
                <p className="text-sm text-emerald-700">
                  No firms are in a stuck or broken state. Safe to Republish.
                </p>
              </div>
            </div>
          )}

          {/* Pre-publish warning */}
          {(broken.length > 0 || needsAction.length > 0) && (
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                broken.length > 0
                  ? "border-rose-200 bg-rose-50"
                  : "border-amber-200 bg-amber-50"
              }`}
              data-testid="health-prepublish-warning"
            >
              <AlertTriangle
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  broken.length > 0 ? "text-rose-500" : "text-amber-500"
                }`}
              />
              <div>
                <p
                  className={`font-semibold ${
                    broken.length > 0 ? "text-rose-800" : "text-amber-800"
                  }`}
                >
                  {broken.length > 0
                    ? `${broken.length} broken firm(s): do not Republish`
                    : `${needsAction.length} firm(s) need attention before Republish`}
                </p>
                <p
                  className={`mt-0.5 text-sm ${
                    broken.length > 0 ? "text-rose-700" : "text-amber-700"
                  }`}
                >
                  {broken.length > 0
                    ? "Broken firms will cause tenant portal 404s in production. Resolve all broken states before publishing."
                    : "These firms are stalled in the pipeline. Consider resolving them before publishing so they are not stuck in production."}
                </p>
              </div>
            </div>
          )}

          {/* Broken issues */}
          {broken.length > 0 && (
            <section data-testid="health-section-broken">
              <h2 className="mb-3 text-sm font-semibold text-rose-700">
                Broken ({broken.length})
              </h2>
              <div className="space-y-3">
                {broken.map((issue) => (
                  <IssueRow key={issue.firmId} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {/* Needs action issues */}
          {needsAction.length > 0 && (
            <section data-testid="health-section-needs-action">
              <h2 className="mb-3 text-sm font-semibold text-amber-700">
                Needs action ({needsAction.length})
              </h2>
              <div className="space-y-3">
                {needsAction.map((issue) => (
                  <IssueRow key={issue.firmId} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {updatedLabel && (
            <p className="text-xs text-muted-foreground">
              Last checked at {updatedLabel} &middot; auto-refreshes every 60s
            </p>
          )}
        </div>
      )}
    </div>
  );
}
