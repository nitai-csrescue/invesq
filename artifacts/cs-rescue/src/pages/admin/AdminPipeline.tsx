import { useState } from "react";
import { Link } from "wouter";
import { Loader2, DatabaseZap, ArrowRight, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useSeedLegacyTenants,
  type AdminFirmSummary,
  type SeedLegacyTenantsResult,
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
                    href={active ? `/admin/jobs/${job.id}` : `/${firm.slug}/portfolio`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    data-testid={`link-pipeline-${firm.id}`}
                  >
                    {active ? "View job" : "Open portal"} <ArrowRight className="h-3 w-3" />
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

// ---------------------------------------------------------------------------
// Seed legacy tenants — one-time data repair (absorbed from AdminHome). Fits
// the pipeline surface as an operational/data utility.
// ---------------------------------------------------------------------------
function SeedLegacyCard() {
  const { toast } = useToast();
  const [seedResult, setSeedResult] = useState<SeedLegacyTenantsResult | null>(null);

  const seedLegacyTenants = useSeedLegacyTenants({
    mutation: {
      onSuccess: (data) => {
        setSeedResult(data);
        const seeded = data.results.filter((r) => r.status === "seeded");
        const skipped = data.results.filter((r) => r.status === "skipped");
        toast({
          title: "Legacy tenant seed complete",
          description:
            seeded.length > 0
              ? `Seeded: ${seeded.map((r) => r.slug).join(", ")}. Skipped (already present): ${skipped.length}.`
              : `All 5 legacy tenants already present — nothing to do.`,
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to seed legacy tenants",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <Card data-testid="card-seed-legacy-tenants">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DatabaseZap className="h-4 w-4 text-primary" />
          Seed legacy demo tenants
        </CardTitle>
        <CardDescription>
          One-time data repair: inserts any of the 5 legacy demo tenants (stg,
          pamlico, raviga, longarc, solen) missing from this database. Existing
          firms — including any real client firm — are left untouched. Safe to
          click more than once; already-present tenants report as skipped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          disabled={seedLegacyTenants.isPending}
          onClick={() => seedLegacyTenants.mutate()}
          data-testid="button-seed-legacy-tenants"
        >
          {seedLegacyTenants.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Seed legacy demo tenants
        </Button>

        {seedResult && (
          <div
            className="rounded-md border border-border bg-muted/40 p-4 text-sm"
            data-testid="text-seed-legacy-tenants-result"
          >
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-1 pr-4 font-medium">Slug</th>
                  <th className="pb-1 pr-4 font-medium">Status</th>
                  <th className="pb-1 pr-4 font-medium">Companies</th>
                  <th className="pb-1 pr-4 font-medium">Assessments</th>
                  <th className="pb-1 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {seedResult.results.map((r) => (
                  <tr key={r.slug} className="border-t border-border/60">
                    <td className="py-1.5 pr-4">
                      <code className="text-xs">{r.slug}</code>
                    </td>
                    <td className="py-1.5 pr-4 text-foreground">
                      {r.status === "seeded" ? "Seeded" : "Skipped"}
                    </td>
                    <td className="py-1.5 pr-4 text-foreground">{r.companiesInserted}</td>
                    <td className="py-1.5 pr-4 text-foreground">{r.assessmentsInserted}</td>
                    <td className="py-1.5 text-muted-foreground">{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
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
        Discovery and build jobs across every firm, plus data-repair utilities.
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

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Utilities</h2>
          <SeedLegacyCard />
        </section>
      </div>
    </div>
  );
}
