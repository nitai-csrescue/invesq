import { useState } from "react";
import { useRoute, Redirect, Link } from "wouter";
import {
  Loader2,
  AlertTriangle,
  RefreshCcw,
  PlusCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useGetAdminFirm,
  getGetAdminFirmQueryKey,
  type AdminFirmSummary,
} from "@workspace/api-client-react";
import { isJobActive } from "@/lib/adminJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Status pill styling shared with AdminFirmsIndex
// ---------------------------------------------------------------------------
const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  reviewed: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
};

// ---------------------------------------------------------------------------
// Recovery panel — shown for any non-ready firm
// ---------------------------------------------------------------------------
function FirmRecoveryPage({ firm }: { firm: AdminFirmSummary }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [rerunCount, setRerunCount] = useState(0);
  const [buildJobId, setBuildJobId] = useState<number | null>(null);

  const { data: detail, isLoading: detailLoading } = useGetAdminFirm(firm.id, {
    query: { queryKey: getGetAdminFirmQueryKey(firm.id) },
  });
  const allCompanies = detail?.companies ?? [];
  const activeCompanies = allCompanies.filter((c) => c.status === "active");

  const latestJob = firm.latestJob;
  const isDiscoveryRunning = latestJob?.type === "discovery" && isJobActive(latestJob);
  const isBuildRunning = latestJob?.type === "build" && isJobActive(latestJob);
  const discoveryCompleted = latestJob?.type === "discovery" && latestJob.status === "completed";
  const discoveryEmpty = discoveryCompleted && activeCompanies.length === 0;
  const discoveryFailed = latestJob?.type === "discovery" && latestJob.status === "failed";
  const needsGuidance = !isDiscoveryRunning && (discoveryEmpty || discoveryFailed || !latestJob);
  const isEscalated = rerunCount > 0 && (discoveryEmpty || discoveryFailed);

  // Redirect to job status when a build starts
  if (buildJobId) return <Redirect to={`/admin/jobs/${buildJobId}`} />;
  if (isBuildRunning && latestJob) return <Redirect to={`/admin/jobs/${latestJob.id}`} />;

  // ----- mutations -----

  const rerunMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/firms/${firm.id}/rerun-discovery`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to start discovery");
      }
      return res.json();
    },
    onSuccess: () => {
      setRerunCount((c) => c + 1);
      setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/firms/${firm.id}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), website: newWebsite.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to add company");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewName("");
      setNewWebsite("");
      setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: getGetAdminFirmQueryKey(firm.id) });
    },
  });

  const buildMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/firms/${firm.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: activeCompanies.map((c) => c.id) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to start build");
      }
      return res.json() as Promise<{ job?: { id: number } }>;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
      if (data.job?.id) setBuildJobId(data.job.id);
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8" data-testid="firm-recovery-page">
      {/* Back + header */}
      <div>
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-3 w-3 rotate-180" /> Admin
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {firm.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{firm.name}</h1>
            <span className="text-xs text-muted-foreground">{firm.slug}</span>
          </div>
          <span
            className={`ml-auto rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[firm.status] ?? "border-border text-muted-foreground"}`}
          >
            {firm.status}
          </span>
        </div>
      </div>

      {/* Discovery running */}
      {isDiscoveryRunning && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
            <div>
              <p className="font-medium text-foreground">Discovery in progress</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Searching for current portfolio companies across multiple sources
                {latestJob?.progressPct ? ` — ${latestJob.progressPct}%` : "..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Guided empty / failed state */}
      {needsGuidance && (
        <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              {isEscalated ? (
                <>
                  <p className="font-medium text-foreground">
                    Automated discovery came up empty again
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The deeper review also found no qualifying companies. Manual entry is the
                    reliable next step — type the portfolio company names below and start the build.
                  </p>
                </>
              ) : discoveryFailed ? (
                <>
                  <p className="font-medium text-foreground">
                    Discovery did not complete successfully
                  </p>
                  {latestJob?.error && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {latestJob.error.slice(0, 300)}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    You can run a deeper review or add the portfolio companies manually below.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    We could not automatically identify portfolio companies for {firm.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This can happen when a firm lists its portfolio as images or logos — the names
                    are visible on screen but not readable as text. You can add them manually or run
                    a deeper multi-source review.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              size="sm"
              onClick={() => setShowAddForm((v) => !v)}
              className="gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add companies manually
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { rerunMutation.reset(); rerunMutation.mutate(); }}
              disabled={rerunMutation.isPending}
              className="gap-1.5"
            >
              {rerunMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Run a deeper review
            </Button>
          </div>
          {rerunMutation.isError && (
            <p className="text-xs text-destructive">
              {(rerunMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      {/* Inline add-company form */}
      {showAddForm && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">Add a portfolio company</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="co-name" className="text-xs">
                Company name *
              </Label>
              <Input
                id="co-name"
                placeholder="e.g. MNTN"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) addMutation.mutate();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="co-website" className="text-xs">
                Website (optional)
              </Label>
              <Input
                id="co-website"
                placeholder="https://example.com"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => { addMutation.reset(); addMutation.mutate(); }}
                disabled={!newName.trim() || addMutation.isPending}
                className="gap-1.5"
              >
                {addMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add company
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
            {addMutation.isError && (
              <p className="text-xs text-destructive">
                {(addMutation.error as Error).message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Companies ready to score */}
      {!detailLoading && activeCompanies.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">Companies ready to score</p>
          <ul className="space-y-1.5">
            {activeCompanies.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{c.name}</span>
                {c.website && (
                  <span className="text-xs text-muted-foreground">{c.website}</span>
                )}
              </li>
            ))}
          </ul>

          {!showAddForm && (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAddForm(true)}
            >
              <PlusCircle className="h-3 w-3" /> Add another company
            </button>
          )}

          <div className="pt-1">
            <Button
              onClick={() => { buildMutation.reset(); buildMutation.mutate(); }}
              disabled={buildMutation.isPending}
              className="gap-1.5"
            >
              {buildMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Build {firm.name} <ArrowRight className="h-4 w-4" />
            </Button>
            {buildMutation.isError && (
              <p className="mt-2 text-xs text-destructive">
                {(buildMutation.error as Error).message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fallback: no job, no guidance, no companies — e.g. freshly created firm */}
      {!isDiscoveryRunning && !needsGuidance && activeCompanies.length === 0 && !detailLoading && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 text-sm">
          <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">No companies yet</p>
            <p className="mt-0.5 text-muted-foreground">
              Add companies manually or wait for discovery to complete.
            </p>
          </div>
          <Button
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => setShowAddForm(true)}
          >
            <PlusCircle className="h-3.5 w-3.5" /> Add company
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FirmReviewRedirect (default export)
// Ready firms -> redirect to tenant portal (admin lens lives there).
// Non-ready firms -> guided recovery panel so admins are never dead-ended.
// ---------------------------------------------------------------------------
export default function FirmReviewRedirect() {
  const [, params] = useRoute("/admin/firms/:id");
  const id = Number(params?.id);

  const { data: firms, isLoading } = useListAdminFirms({
    query: {
      queryKey: getListAdminFirmsQueryKey(),
      // Poll while any job is active so the panel updates automatically
      refetchInterval: (query) =>
        query.state.data?.some((f) => isJobActive(f.latestJob)) ? 3000 : false,
    },
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 p-6 text-sm text-muted-foreground"
        data-testid="text-firm-redirect-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Loading firm...
      </div>
    );
  }

  const firm = firms?.find((f) => f.id === id);

  if (!firm) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Firm not found.{" "}
        <Link href="/admin" className="text-primary underline">
          Back to admin
        </Link>
      </div>
    );
  }

  // Ready firms get the full tenant portal with admin lens overlay
  if (firm.status === "ready") {
    return <Redirect to={`/${firm.slug}/portfolio`} />;
  }

  return <FirmRecoveryPage firm={firm} />;
}
