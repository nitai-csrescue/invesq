import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ShieldCheck,
  Loader2,
  ChevronDown,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Lock,
  Database,
  Info,
  Mail,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useGetAdminFirm,
  getGetAdminFirmQueryKey,
  getGetAdminCompanyReportDataQueryKey,
  useGetAdminCompanyReportData,
  useAddAdminFirmCompany,
  useConfirmAdminFirm,
  useRefreshAdminFirm,
  useUpdateAdminFirm,
  ApiError,
  type ActiveJobConflict,
  type FirmDataAuthority,
} from "@workspace/api-client-react";
import { formatJobEta, isJobActive, jobStatusPillClass } from "@/lib/adminJobs";
import { deriveReportStatus } from "@/lib/reportStatus";
import { type Firm } from "@/data/portfolio";

// ---------------------------------------------------------------------------
// CompanyReportPill
// On a company page, surfaces the current report lifecycle status (None /
// Draft / k of N signed / Validated / Shipped) as a compact pill. Resolves the
// company slug to its numeric id via the same admin resolve endpoint D1's
// PortcoReportWorkflow uses, then reads the cache-only report-data workflow.
// Any resolve/fetch failure (incl. a 404 for a company with no assessment)
// degrades silently to "No report".
// ---------------------------------------------------------------------------
function CompanyReportPill({
  firmSlug,
  companySlug,
}: {
  firmSlug: string;
  companySlug: string;
}) {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCompanyId(null);
    setResolveError(false);
    fetch(
      `/api/admin/companies/resolve?firmSlug=${encodeURIComponent(firmSlug)}&companySlug=${encodeURIComponent(companySlug)}`,
      { credentials: "include" },
    )
      .then((r) => r.json())
      .then((body: { companyId?: number }) => {
        if (cancelled) return;
        if (body.companyId) setCompanyId(body.companyId);
        else setResolveError(true);
      })
      .catch(() => {
        if (!cancelled) setResolveError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [firmSlug, companySlug]);

  const { data, isError } = useGetAdminCompanyReportData(companyId ?? 0, {
    query: {
      queryKey:
        companyId != null ? getGetAdminCompanyReportDataQueryKey(companyId) : [],
      enabled: companyId != null,
      retry: false,
    },
  });

  if (companyId == null && !resolveError) return null;

  const status = deriveReportStatus(resolveError || isError ? null : data);

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
      data-testid="pill-admin-report-status"
      title={`Report status: ${status.label}`}
    >
      Report · {status.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TenantAdminBar
// The single slim top bar shown to an authenticated admin viewing any tenant
// portal page (rendered in the shell's authed 60px header slot; lazy-loaded
// and auth-gated by AdminBarMount so anonymous visitors ship zero admin JS).
//
// It replaces the former "Admin lens" button + right-side drawer entirely.
// Left: an ADMIN VIEW context label (+ report-status pill on a company page,
// + a live build chip while a job runs). Right: ONE context-aware "Admin
// actions" menu. Company selection is intentionally gone — navigation is the
// portfolio page + firm-card links, and Queue build confirms every
// non-excluded company. Add company / Queue build / Provenance open modals
// (not a second bar/drawer).
// ---------------------------------------------------------------------------
export default function TenantAdminBar({ firm }: { firm: Firm }) {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [provOpen, setProvOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  // Company context: /:firmSlug/portfolio/:companySlug(/...). The bare
  // /portfolio index (and every other firm-scoped page) is "firm context".
  const base = `/${firm.slug}/portfolio/`;
  const companyTail = location.startsWith(base) ? location.slice(base.length) : "";
  const companySlug = companyTail ? companyTail.split("/")[0] : null;
  const isCompanyPage = !!companySlug;

  // Resolve the numeric admin firm id from the tenant slug (the admin index
  // already carries slug -> id; no new endpoint).
  const { data: firmList } = useListAdminFirms({
    query: { queryKey: getListAdminFirmsQueryKey() },
  });
  const adminFirm = firmList?.find((f) => f.slug === firm.slug);
  const id = adminFirm?.id ?? -1;
  const hasId = id > 0;

  const { data } = useGetAdminFirm(id, {
    query: {
      queryKey: getGetAdminFirmQueryKey(id),
      enabled: hasId,
      refetchInterval: (query) =>
        isJobActive(query.state.data?.latestJob) ? 4000 : false,
    },
  });

  const invalidateFirm = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminFirmQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
  };

  const handleJobConflict = (err: unknown): boolean => {
    if (err instanceof ApiError && err.status === 409 && err.data) {
      const conflict = err.data as ActiveJobConflict;
      toast({
        title: "Build already in progress",
        description: `A build is already running (job #${conflict.job?.id ?? "?"}). Wait for it to finish.`,
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  const addCompany = useAddAdminFirmCompany({
    mutation: {
      onSuccess: (company) => {
        setNewName("");
        setNewWebsite("");
        setAddOpen(false);
        invalidateFirm();
        toast({
          title: "Company added",
          description: `"${company.name}" added. It's included the next time you queue a build.`,
        });
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
        setQueueOpen(false);
        invalidateFirm();
        toast({
          title: "Build queued",
          description: `"${result.firm.name}" reviewed. Build job #${result.job.id} queued.`,
        });
      },
      onError: (err) => {
        setQueueOpen(false);
        if (handleJobConflict(err)) return;
        toast({
          title: "Failed to queue build",
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

  const latestJob = data?.latestJob ?? null;
  const buildRunning = latestJob?.type === "build" && isJobActive(latestJob);
  const busy = buildRunning || confirmFirm.isPending || refreshFirm.isPending;
  const requireLoginOn =
    data?.firm.meta?.requireLogin ?? firm.requireLogin ?? false;
  const dataAuthority = data?.firm.dataAuthority ?? "best_effort";
  const nonExcluded = (data?.companies ?? []).filter(
    (c) => c.status !== "excluded",
  );

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWebsite.trim() || addCompany.isPending) return;
    addCompany.mutate({
      id,
      data: { name: newName.trim(), website: newWebsite.trim() },
    });
  };

  const handleQueueBuild = () => {
    confirmFirm.mutate({ id, data: { companyIds: nonExcluded.map((c) => c.id) } });
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

  const handleDataAuthority = (value: string) => {
    updateFirm.mutate({ id, data: { dataAuthority: value as FirmDataAuthority } });
  };

  return (
    <header
      className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card/60 px-8"
      data-testid="admin-portal-header"
    >
      {/* Context — ADMIN VIEW · firm, + status pill / build chip */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
          Admin view
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="truncate font-medium text-foreground">
          {adminFirm?.name ?? firm.displayName}
        </span>

        {isCompanyPage && hasId && (
          <CompanyReportPill firmSlug={firm.slug} companySlug={companySlug} />
        )}

        {buildRunning && (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-600"
            data-testid="chip-admin-build-progress"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Build {latestJob?.progressPct ?? 0}% · {formatJobEta(latestJob?.etaSeconds ?? null)}
          </span>
        )}
      </div>

      {/* Single context-aware actions menu */}
      {hasId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-admin-actions"
              className="shrink-0 gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin actions
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs">
              {isCompanyPage ? "Company actions" : "Firm actions"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={busy}
              onSelect={() => refreshFirm.mutate({ id })}
              data-testid="menu-admin-rerun"
            >
              <RefreshCw className="h-4 w-4" /> Re-run diagnostic
            </DropdownMenuItem>

            {!isCompanyPage && (
              <>
                <DropdownMenuItem
                  onSelect={() => setAddOpen(true)}
                  data-testid="menu-admin-add-company"
                >
                  <PlusCircle className="h-4 w-4" /> Add company
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={busy || nonExcluded.length === 0}
                  onSelect={() => setQueueOpen(true)}
                  data-testid="menu-admin-queue-build"
                >
                  <CheckCircle2 className="h-4 w-4" /> Queue build
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={requireLoginOn}
              disabled={updateFirm.isPending}
              onCheckedChange={handleRequireLogin}
              data-testid="menu-admin-require-login"
            >
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Require login
              </span>
            </DropdownMenuCheckboxItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-testid="menu-admin-data-authority">
                <Database className="h-4 w-4" /> Data authority
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={dataAuthority}
                  onValueChange={handleDataAuthority}
                >
                  <DropdownMenuRadioItem value="strict">
                    Strict (fail loudly)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="best_effort">
                    Best effort (degrade)
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => setProvOpen(true)}
              data-testid="menu-admin-provenance"
            >
              <Info className="h-4 w-4" /> Provenance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Add company modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-testid="dialog-admin-add-company">
          <DialogHeader>
            <DialogTitle>Add a company</DialogTitle>
            <DialogDescription>
              Add a known holding discovery missed. It's included the next time
              you queue a build.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCompany} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bar-company-name">Company name</Label>
              <Input
                id="bar-company-name"
                data-testid="input-admin-company-name"
                placeholder="e.g. Renaissance Systems"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bar-company-website">Website</Label>
              <Input
                id="bar-company-website"
                data-testid="input-admin-company-website"
                type="url"
                placeholder="https://example.com"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!newName.trim() || !newWebsite.trim() || addCompany.isPending}
                data-testid="button-admin-add-company-submit"
              >
                {addCompany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Queue build confirm */}
      <AlertDialog open={queueOpen} onOpenChange={setQueueOpen}>
        <AlertDialogContent data-testid="dialog-admin-queue-build">
          <AlertDialogHeader>
            <AlertDialogTitle>Queue an AI diagnostic build?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs a fresh AI diagnostic for all {nonExcluded.length}{" "}
              non-excluded {nonExcluded.length === 1 ? "company" : "companies"} in{" "}
              {adminFirm?.name ?? firm.displayName}. Progress shows in this bar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQueueBuild}
              data-testid="button-admin-queue-build-confirm"
            >
              Queue build
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Provenance modal */}
      <Dialog open={provOpen} onOpenChange={setProvOpen}>
        <DialogContent data-testid="dialog-admin-provenance">
          <DialogHeader>
            <DialogTitle>Status &amp; provenance</DialogTitle>
            <DialogDescription>
              Internal record for {adminFirm?.name ?? firm.displayName}'s portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-xs">{data?.firm.slug ?? firm.slug}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Firm status</span>
              <Badge variant="outline" className="capitalize">
                {data?.firm.status ?? "--"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Data authority</span>
              <Badge variant="outline" className="capitalize">
                {dataAuthority.replace("_", " ")}
              </Badge>
            </div>
            {data?.firm.createdByEmail && (
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
            {latestJob?.type === "build" && latestJob.status === "failed" && (
              <p className="flex items-center gap-1.5 pt-1 text-xs text-rose-500">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                Last build failed{latestJob.error ? `: ${latestJob.error}` : "."}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
