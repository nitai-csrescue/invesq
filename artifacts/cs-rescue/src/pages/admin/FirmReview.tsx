import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Loader2, PlusCircle, CheckCircle2, XCircle, Mail, Search, Lightbulb, ArrowRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAdminFirm,
  useAddAdminFirmCompany,
  useConfirmAdminFirm,
  useRefreshAdminFirm,
  getGetAdminFirmQueryKey,
  ApiError,
  type ActiveJobConflict,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatJobEta, isJobActive } from "@/lib/adminJobs";
import ExportPanel from "./ExportPanel";

export default function FirmReview() {
  const [, params] = useRoute("/admin/firms/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useGetAdminFirm(id, {
    query: {
      queryKey: getGetAdminFirmQueryKey(id),
      enabled: Number.isInteger(id) && id > 0,
      // Keep polling while this firm has a discovery or build job still in
      // flight, so the review screen (and the "N companies found" / "ready"
      // banners below) update on their own without a manual refresh.
      refetchInterval: (query) => (isJobActive(query.state.data?.latestJob) ? 4000 : false),
    },
  });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [duplicateJobNotice, setDuplicateJobNotice] = useState<ActiveJobConflict | null>(null);

  useEffect(() => {
    if (data && !initialized) {
      setSelected(new Set(data.companies.filter((c) => c.status !== "excluded").map((c) => c.id)));
      setInitialized(true);
    }
  }, [data, initialized]);

  const addCompany = useAddAdminFirmCompany({
    mutation: {
      onSuccess: (company) => {
        setSelected((prev) => new Set(prev).add(company.id));
        setNewName("");
        setNewWebsite("");
        queryClient.invalidateQueries({ queryKey: getGetAdminFirmQueryKey(id) });
        toast({ title: "Company added", description: `"${company.name}" added and pre-checked.` });
      },
      onError: (err) => {
        toast({
          title: "Failed to add company",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const confirmFirm = useConfirmAdminFirm({
    mutation: {
      onSuccess: (result) => {
        toast({
          title: "Firm reviewed",
          description: `"${result.firm.name}" marked reviewed. Build job #${result.job.id} queued.`,
        });
        navigate(`/admin/jobs/${result.job.id}`);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409 && err.data) {
          const conflict = err.data as ActiveJobConflict;
          setDuplicateJobNotice(conflict);
          toast({
            title: "Build already in progress",
            description: "This firm already has a build job running — showing its status below instead.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Failed to confirm firm",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const refreshFirm = useRefreshAdminFirm({
    mutation: {
      onSuccess: (result) => {
        toast({
          title: "Re-run queued",
          description: `Fresh diagnostic for "${result.firm.name}" queued as build job #${result.job.id}. A new assessment will be appended.`,
        });
        navigate(`/admin/jobs/${result.job.id}`);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409 && err.data) {
          const conflict = err.data as ActiveJobConflict;
          setDuplicateJobNotice(conflict);
          toast({
            title: "Build already in progress",
            description: "This firm already has a build job running — showing its status below instead.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Failed to re-run diagnostic",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const toggleCompany = (companyId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const canAddCompany = newName.trim().length > 0 && newWebsite.trim().length > 0 && !addCompany.isPending;

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddCompany) return;
    addCompany.mutate({ id, data: { name: newName.trim(), website: newWebsite.trim() } });
  };

  const handleConfirm = () => {
    setDuplicateJobNotice(null);
    confirmFirm.mutate({ id, data: { companyIds: Array.from(selected) } });
  };

  const handleRefresh = () => {
    setDuplicateJobNotice(null);
    refreshFirm.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-[900px] mx-auto flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-firm-review-loading">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading firm…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-[900px] mx-auto" data-testid="text-firm-review-error">
        <p className="text-sm text-destructive">Firm not found.</p>
        <Link href="/admin/firms" className="text-sm text-primary hover:underline mt-2 inline-block">
          ← Back to firms
        </Link>
      </div>
    );
  }

  const { firm, companies, latestJob } = data;
  const discoveryDone = latestJob?.type === "discovery" && latestJob.status === "completed";
  const discoveryRunning = latestJob?.type === "discovery" && isJobActive(latestJob);
  const discoveryFailed = latestJob?.type === "discovery" && latestJob.status === "failed";
  const buildRunning = latestJob?.type === "build" && isJobActive(latestJob);
  const buildFailed = latestJob?.type === "build" && latestJob.status === "failed";
  const conflictJob = duplicateJobNotice?.job ?? null;

  return (
    <div className="p-6 max-w-[900px] mx-auto" data-testid="admin-firm-review-page">
      <PageHeader
        eyebrow="Internal · Review"
        title={firm.name}
        subtitle={`${firm.website ?? "no website"} · slug ${firm.slug} · status ${firm.status}`}
        actions={
          <Link href="/admin/firms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            ← Back to firms
          </Link>
        }
      />

      {conflictJob && (
        <div
          className="mb-6 flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3"
          data-testid="banner-build-conflict"
        >
          <p className="flex items-center gap-2 text-sm text-amber-300">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            A build is already in progress for this firm (job #{conflictJob.id}, {conflictJob.progressPct}%). Wait for
            it to finish before confirming again.
          </p>
          <Link
            href={`/admin/jobs/${conflictJob.id}`}
            className="whitespace-nowrap text-xs text-amber-300 hover:underline"
            data-testid="link-conflict-job"
          >
            View job <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
      )}

      {!conflictJob && discoveryRunning && (
        <div className="mb-6 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-3" data-testid="banner-discovery-running">
          <p className="flex items-center gap-2 text-sm text-cyan-300">
            <Search className="h-4 w-4 shrink-0 animate-pulse" />
            Discovering this firm's real portfolio via web search…
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={latestJob.progressPct} className="h-1.5 flex-1" />
            <span className="whitespace-nowrap text-xs text-cyan-300/80">{formatJobEta(latestJob.etaSeconds)}</span>
          </div>
          <p className="mt-1 text-[11px] text-cyan-300/70">
            This page updates automatically as companies are found — no need to refresh.
          </p>
        </div>
      )}

      {!conflictJob && discoveryFailed && (
        <div
          className="mb-6 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          data-testid="banner-discovery-failed"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          Discovery failed{latestJob?.error ? `: ${latestJob.error}` : "."} You can still add companies manually below.
        </div>
      )}

      {!conflictJob && discoveryDone && firm.status === "pending" && (
        <div
          className="mb-6 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          data-testid="banner-discovery-found"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Discovery found {companies.length} compan{companies.length === 1 ? "y" : "ies"}. Review the list below,
          adjust selections, then confirm to kick off the diagnostic build.
        </div>
      )}

      {!conflictJob && buildRunning && (
        <div className="mb-6 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-3" data-testid="banner-build-running">
          <p className="flex items-center gap-2 text-sm text-cyan-300">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Diagnostic build in progress — scoring active companies across all 8 pillars…
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={latestJob.progressPct} className="h-1.5 flex-1" />
            <span className="whitespace-nowrap text-xs text-cyan-300/80">{formatJobEta(latestJob.etaSeconds)}</span>
          </div>
          <Link href={`/admin/jobs/${latestJob.id}`} className="mt-1 inline-block text-[11px] text-cyan-300/70 hover:underline">
            View job #{latestJob.id} →
          </Link>
        </div>
      )}

      {!conflictJob && buildFailed && (
        <div
          className="mb-6 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          data-testid="banner-build-failed"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          Diagnostic build failed{latestJob?.error ? `: ${latestJob.error}` : "."} Adjust the selection and confirm
          again to retry.
        </div>
      )}

      {!conflictJob && firm.status === "ready" && (
        <div
          className="mb-6 flex items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
          data-testid="banner-firm-ready"
        >
          <p className="flex items-center gap-2 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Diagnostic build complete — every active company has been scored across all 8 pillars.
          </p>
          <div className="flex items-center gap-3">
            {firm.createdByEmail && (
              <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-emerald-300/80" data-testid="text-notified-email">
                <Mail className="h-3.5 w-3.5" />
                Notified {firm.createdByEmail}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshFirm.isPending || buildRunning || !!conflictJob}
              data-testid="button-refresh-firm"
            >
              {refreshFirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Re-run diagnostic
            </Button>
          </div>
        </div>
      )}

      <Card data-testid="card-companies">
        <CardHeader>
          <CardTitle className="text-base">Companies</CardTitle>
          <CardDescription>
            Pre-checked companies will be marked "active"; unchecked companies will be marked "excluded" when you
            confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {companies.length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-no-companies">
              No companies yet. Add one below.
            </p>
          )}
          {companies.map((company) => (
            <label
              key={company.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card/40 px-4 py-3 cursor-pointer hover:bg-card transition-colors"
              data-testid={`row-company-${company.id}`}
            >
              <Checkbox
                checked={selected.has(company.id)}
                onCheckedChange={() => toggleCompany(company.id)}
                data-testid={`checkbox-company-${company.id}`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{company.name}</p>
                <p className="text-xs text-muted-foreground">{company.website ?? "no website"}</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{company.status}</span>
            </label>
          ))}

          <form onSubmit={handleAddCompany} className="rounded-md border border-dashed border-border p-4 space-y-3" data-testid="form-add-company">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <PlusCircle className="h-3.5 w-3.5 text-primary" /> Add a company
            </p>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground" data-testid="text-add-company-hint">
              <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/80" />
              Discovery only lists holdings it can verify via web search — if a known portfolio company is missing,
              add it here manually and it'll be included the next time you confirm.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  data-testid="input-company-name"
                  placeholder="e.g. Renaissance Systems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  data-testid="input-company-website"
                  type="url"
                  placeholder="https://example.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={!canAddCompany} data-testid="button-add-company">
              {addCompany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add company
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {selected.size} of {companies.length} compan{companies.length === 1 ? "y" : "ies"} selected
        </p>
        <Button
          onClick={handleConfirm}
          disabled={confirmFirm.isPending || buildRunning || !!conflictJob}
          data-testid="button-confirm-firm"
        >
          {confirmFirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {buildRunning || conflictJob ? "Build in progress…" : "Confirm & queue build"}
        </Button>
      </div>

      <div className="mt-6">
        <ExportPanel companies={companies} />
      </div>
    </div>
  );
}
