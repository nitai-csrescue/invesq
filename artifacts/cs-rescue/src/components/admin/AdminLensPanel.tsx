import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Mail,
  RefreshCw,
  Lightbulb,
  Database,
  Lock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useGetAdminFirm,
  getGetAdminFirmQueryKey,
  useAddAdminFirmCompany,
  useConfirmAdminFirm,
  useRefreshAdminFirm,
  useUpdateAdminFirm,
  ApiError,
  type ActiveJobConflict,
  type FirmDataAuthority,
} from "@workspace/api-client-react";
import { formatJobEta, isJobActive, jobStatusPillClass } from "@/lib/adminJobs";
import { type Firm } from "@/data/portfolio";
import ExportPanel from "@/pages/admin/ExportPanel";

// ---------------------------------------------------------------------------
// AdminLensPanel
// The authed-admin overlay for a tenant portal page. Rendered ONLY for
// authenticated admins (gated + lazy-loaded by AdminLensMount, so anonymous
// visitors never download this chunk or see any of its markup). It resolves
// the admin firm record by slug from the same tenant `firm` the portal is
// showing, then hosts the firm-review controls (company selection, add,
// confirm/re-run build, portal data-authority + require-login toggles) plus
// the report Export panel — all in a right-side drawer that floats over the
// unchanged, shared tenant page.
// ---------------------------------------------------------------------------
export default function AdminLensPanel({
  firm,
  open,
  onOpenChange,
}: {
  firm: Firm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [duplicateJobNotice, setDuplicateJobNotice] = useState<ActiveJobConflict | null>(null);

  // Resolve the numeric admin firm id from the tenant slug. No new endpoint:
  // the admin index list already carries slug → id.
  const { data: firmList } = useListAdminFirms({
    query: { queryKey: getListAdminFirmsQueryKey() },
  });
  const adminFirm = firmList?.find((f) => f.slug === firm.slug);
  const id = adminFirm?.id ?? -1;
  const hasId = id > 0;

  // Detail is only fetched while the drawer is open (admins browsing the
  // portal pay nothing until they actually open the lens).
  const { data, isLoading } = useGetAdminFirm(id, {
    query: {
      queryKey: getGetAdminFirmQueryKey(id),
      enabled: hasId && open,
      refetchInterval: (query) => (isJobActive(query.state.data?.latestJob) ? 4000 : false),
    },
  });

  useEffect(() => {
    if (open && data && !initialized) {
      setSelected(new Set(data.companies.filter((c) => c.status !== "excluded").map((c) => c.id)));
      setInitialized(true);
    }
    if (!open && initialized) {
      setInitialized(false);
      setDuplicateJobNotice(null);
    }
  }, [open, data, initialized]);

  const invalidateFirm = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminFirmQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
  };

  const addCompany = useAddAdminFirmCompany({
    mutation: {
      onSuccess: (company) => {
        setSelected((prev) => new Set(prev).add(company.id));
        setNewName("");
        setNewWebsite("");
        invalidateFirm();
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

  const handleJobConflict = (err: unknown): boolean => {
    if (err instanceof ApiError && err.status === 409 && err.data) {
      setDuplicateJobNotice(err.data as ActiveJobConflict);
      toast({
        title: "Build already in progress",
        description: "This firm already has a build job running — its status is shown below.",
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  const confirmFirm = useConfirmAdminFirm({
    mutation: {
      onSuccess: (result) => {
        invalidateFirm();
        toast({
          title: "Build queued",
          description: `"${result.firm.name}" reviewed. Build job #${result.job.id} queued — progress updates here.`,
        });
      },
      onError: (err) => {
        if (handleJobConflict(err)) return;
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
        invalidateFirm();
        toast({
          title: "Re-run queued",
          description: `Fresh diagnostic for "${result.firm.name}" queued as build job #${result.job.id}.`,
        });
      },
      onError: (err) => {
        if (handleJobConflict(err)) return;
        toast({
          title: "Failed to re-run diagnostic",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const updateFirm = useUpdateAdminFirm({
    mutation: {
      onSuccess: () => {
        invalidateFirm();
        toast({
          title: "Portal settings saved",
          description: "Takes effect on the next portal reload.",
        });
      },
      onError: (err) => {
        toast({
          title: "Failed to save settings",
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

  const handleDataAuthority = (value: FirmDataAuthority) => {
    updateFirm.mutate({ id, data: { dataAuthority: value } });
  };

  const handleRequireLogin = (checked: boolean) => {
    updateFirm.mutate({
      id,
      data: {
        meta: {
          statusLabel: data?.firm.meta?.statusLabel ?? firm.statusLabel,
          internalOnly: data?.firm.meta?.internalOnly ?? firm.internalOnly,
          requireLogin: checked,
        },
      },
    });
  };

  // Nothing to manage if this tenant slug has no admin firm record (or the
  // list hasn't loaded yet) — render no trigger at all.
  if (!hasId) return null;

  const latestJob = data?.latestJob ?? null;
  const buildRunning = latestJob?.type === "build" && isJobActive(latestJob);
  const buildFailed = latestJob?.type === "build" && latestJob.status === "failed";
  const busy = buildRunning || !!duplicateJobNotice;
  const requireLoginOn = data?.firm.meta?.requireLogin ?? firm.requireLogin ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
          data-testid="admin-lens-drawer"
        >
          <SheetHeader className="space-y-2 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              Admin Lens · {adminFirm?.name ?? firm.displayName}
            </SheetTitle>
            <SheetDescription>
              Internal controls for this firm's portal. Only you (an authenticated admin) can see this — the
              tenant page itself is unchanged and public.
            </SheetDescription>
          </SheetHeader>

          {isLoading && (
            <div
              className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
              data-testid="text-admin-lens-loading"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Loading firm…
            </div>
          )}

          {!isLoading && data && (
            <div className="mt-6 space-y-6">
              {/* Provenance & status */}
              <Card data-testid="card-lens-status">
                <CardHeader>
                  <CardTitle className="text-sm">Status &amp; provenance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Slug</span>
                    <span className="font-mono text-xs">{data.firm.slug}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Firm status</span>
                    <Badge variant="outline" className="capitalize">
                      {data.firm.status}
                    </Badge>
                  </div>
                  {data.firm.createdByEmail && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Created by</span>
                      <span className="flex items-center gap-1.5 text-xs">
                        <Mail className="h-3.5 w-3.5" />
                        {data.firm.createdByEmail}
                      </span>
                    </div>
                  )}
                  {latestJob && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Latest job</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${jobStatusPillClass(latestJob.status)}`}
                        data-testid="pill-lens-job-status"
                      >
                        {latestJob.type} · {latestJob.status}
                      </span>
                    </div>
                  )}
                  {buildRunning && (
                    <div className="flex items-center gap-3 pt-1">
                      <Progress value={latestJob?.progressPct} className="h-1.5 flex-1" />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatJobEta(latestJob?.etaSeconds ?? null)}
                      </span>
                    </div>
                  )}
                  {buildFailed && (
                    <p
                      className="flex items-center gap-1.5 pt-1 text-xs text-rose-400"
                      data-testid="text-lens-build-failed"
                    >
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      Last build failed{latestJob?.error ? `: ${latestJob.error}` : "."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Portal controls */}
              <Card data-testid="card-lens-portal-controls">
                <CardHeader>
                  <CardTitle className="text-sm">Portal controls</CardTitle>
                  <CardDescription>
                    Admin-only settings for this firm's portal. Changes persist immediately and apply on the next
                    portal reload.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lens-data-authority"
                      className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
                    >
                      <Database className="h-3.5 w-3.5" /> Data authority
                    </Label>
                    <Select
                      value={data.firm.dataAuthority}
                      onValueChange={(v) => handleDataAuthority(v as FirmDataAuthority)}
                      disabled={updateFirm.isPending}
                    >
                      <SelectTrigger id="lens-data-authority" data-testid="select-lens-data-authority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">strict — fail loudly on bad data</SelectItem>
                        <SelectItem value="best_effort">best_effort — degrade gracefully</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                    <div className="space-y-0.5">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Lock className="h-3.5 w-3.5" /> Require login
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Gate this portal behind an admin session (UI-only; bootstrap API stays public).
                      </p>
                    </div>
                    <Switch
                      checked={requireLoginOn}
                      onCheckedChange={handleRequireLogin}
                      disabled={updateFirm.isPending}
                      data-testid="switch-lens-require-login"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Duplicate-job notice */}
              {duplicateJobNotice?.job && (
                <div
                  className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
                  data-testid="banner-lens-build-conflict"
                >
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  A build is already in progress (job #{duplicateJobNotice.job.id},{" "}
                  {duplicateJobNotice.job.progressPct}%). Wait for it to finish.
                </div>
              )}

              {/* Companies */}
              <Card data-testid="card-lens-companies">
                <CardHeader>
                  <CardTitle className="text-sm">Companies</CardTitle>
                  <CardDescription>
                    Checked companies stay "active"; unchecked become "excluded" when you queue a build.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.companies.length === 0 && (
                    <p className="text-sm text-muted-foreground" data-testid="text-lens-no-companies">
                      No companies yet. Add one below.
                    </p>
                  )}
                  {data.companies.map((company) => (
                    <label
                      key={company.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card/40 px-3 py-2.5 transition-colors hover:bg-card"
                      data-testid={`row-lens-company-${company.id}`}
                    >
                      <Checkbox
                        checked={selected.has(company.id)}
                        onCheckedChange={() => toggleCompany(company.id)}
                        data-testid={`checkbox-lens-company-${company.id}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{company.website ?? "no website"}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{company.status}</span>
                    </label>
                  ))}

                  <form
                    onSubmit={handleAddCompany}
                    className="space-y-3 rounded-md border border-dashed border-border p-3"
                    data-testid="form-lens-add-company"
                  >
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <PlusCircle className="h-3.5 w-3.5 text-primary" /> Add a company
                    </p>
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                      Add a known holding discovery missed; it's included the next time you queue a build.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="lens-company-name">Company name</Label>
                      <Input
                        id="lens-company-name"
                        data-testid="input-lens-company-name"
                        placeholder="e.g. Renaissance Systems"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lens-company-website">Website</Label>
                      <Input
                        id="lens-company-website"
                        data-testid="input-lens-company-website"
                        type="url"
                        placeholder="https://example.com"
                        value={newWebsite}
                        onChange={(e) => setNewWebsite(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={!canAddCompany}
                      data-testid="button-lens-add-company"
                    >
                      {addCompany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Add company
                    </Button>
                  </form>

                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      {selected.size} of {data.companies.length} selected
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshFirm.isPending || busy}
                        data-testid="button-lens-refresh"
                      >
                        {refreshFirm.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Re-run
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleConfirm}
                        disabled={confirmFirm.isPending || busy}
                        data-testid="button-lens-confirm"
                      >
                        {confirmFirm.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {busy ? "Build running…" : "Queue build"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export */}
              <ExportPanel companies={data.companies} />
            </div>
          )}
        </SheetContent>
      </Sheet>
  );
}
