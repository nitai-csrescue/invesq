import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Building2,
  Loader2,
  PlusCircle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Lock,
  Trash2,
  FilePlus2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateAdminFirm,
  useCreateManualAdminFirm,
  useDeleteAdminFirm,
  useReorderAdminFirms,
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useGetAdminFirm,
  getGetAdminFirmQueryKey,
  useSetAdminFirmClearance,
  type AdminFirmSummary,
} from "@workspace/api-client-react";
import { LEGACY_FIRMS_META } from "@workspace/portfolio-engine/firms-meta";
import { isJobActive } from "@/lib/adminJobs";
import { useHiddenFirms } from "@/hooks/use-hidden-firms";
import { FirmFilterControl } from "@/components/admin/FirmFilterControl";
import {
  usePortfolioData,
} from "@/data/portfolio/PortfolioDataProvider";
import {
  getFirm,
  getFirmSummary,
  getFirmCompanies,
  PILLAR_MAX,
  type PortfolioSummary,
  type Company,
} from "@/data/portfolio";

// Hand-authored legacy tenants can never be deleted from the admin UI (the
// server also refuses with a 409); hide the delete affordance entirely.
const LEGACY_SLUGS = new Set<string>(LEGACY_FIRMS_META.map((f) => f.slug));

// ---------------------------------------------------------------------------
// Tier distribution mini-bar — small T1..T4 chips, zero-counts hidden.
// ---------------------------------------------------------------------------
const TIER_CHIP: Record<string, string> = {
  "1": "bg-emerald-500/15 text-emerald-600",
  "2": "bg-cyan-500/15 text-cyan-600",
  "3": "bg-amber-500/15 text-amber-600",
  "4": "bg-rose-500/15 text-rose-600",
};

function TierDistribution({ summary }: { summary: PortfolioSummary }) {
  const chips = summary.tierCounts.filter((t) => t.count > 0);
  if (chips.length === 0) return <span className="text-muted-foreground">--</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((t) => (
        <span
          key={t.tier.id}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            TIER_CHIP[String(t.tier.id)] ?? "bg-slate-400/15 text-slate-500"
          }`}
          title={t.tier.label}
        >
          T{t.tier.id} · {t.count}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clearance toggle — password-gated switch to flip internalOnly on a firm.
// The password is verified server-side; wrong/missing passwords return 401/503.
// ---------------------------------------------------------------------------
function ClearanceToggle({
  firmId,
  firmName,
  currentInternalOnly,
}: {
  firmId: number;
  firmName: string;
  currentInternalOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useSetAdminFirmClearance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
        setOpen(false);
        setPassword("");
        setErrorMsg(null);
        toast({
          title: "Clearance updated",
          description: `${firmName} is now ${currentInternalOnly ? "client-ready" : "internal only"}.`,
        });
      },
      onError: (err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Incorrect password -- please try again.";
        setErrorMsg(msg.includes("503") ? "CLEARANCE_ADMIN_PASSWORD is not configured on this server." : "Incorrect password -- please try again.");
      },
    },
  });

  const pending = mutation.isPending;
  const nextValue = !currentInternalOnly;

  const handleOpen = () => {
    setOpen(true);
    setPassword("");
    setErrorMsg(null);
    // Focus the input after Dialog renders
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleConfirm = () => {
    if (!password || pending) return;
    mutation.mutate({ id: firmId, data: { internalOnly: nextValue, password } });
  };

  return (
    <>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Clearance</span>
        <Switch
          checked={!currentInternalOnly}
          onCheckedChange={handleOpen}
          aria-label={currentInternalOnly ? "Mark as client-ready" : "Mark as internal only"}
        />
        <span className="text-[11px] text-muted-foreground">
          {currentInternalOnly ? "Internal only" : "Client-ready"}
        </span>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!pending) { setOpen(o); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change clearance</DialogTitle>
            <DialogDescription>
              {nextValue
                ? `Mark "${firmName}" as internal only. The client-ready pill will change to red.`
                : `Mark "${firmName}" as client-ready, removing the internal-only safety signal.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`clearance-pw-${firmId}`}>Admin password</Label>
            <Input
              id={`clearance-pw-${firmId}`}
              ref={inputRef}
              type="password"
              placeholder="Enter clearance password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              disabled={pending}
            />
            {errorMsg && (
              <p className="text-[11px] text-rose-600">{errorMsg}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={pending || !password}>
              {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Firm card — admin-API-driven identity + status, with an OPTIONAL engine
// join for diagnostic rollups. Pending / meta-less firms never reach the
// engine, so they simply render "No diagnostic yet".
// ---------------------------------------------------------------------------
function FirmCard({
  firm,
  summary,
  companies,
  onDelete,
}: {
  firm: AdminFirmSummary;
  summary: PortfolioSummary | undefined;
  companies: Company[] | undefined;
  onDelete?: () => void;
}) {
  // Prefer DB meta; fall back to the static/dynamic identity registry (legacy
  // firms carry their statusLabel/internalOnly there, not in firms.meta).
  const identity = getFirm(firm.slug);
  const statusLabel = firm.meta?.statusLabel ?? identity?.statusLabel;
  const internalOnly = firm.meta?.internalOnly ?? identity?.internalOnly ?? false;

  // Authoritative company status comes from the admin firm detail. Both the
  // engine (legacy firms include every status in the bootstrap) and the
  // list-level companyCount count excluded/candidate rows, so neither is a
  // safe source here. Only "active" companies feed the count and quick-links.
  const { data: detail } = useGetAdminFirm(firm.id, {
    query: { queryKey: getGetAdminFirmQueryKey(firm.id) },
  });
  const activeCompanies = detail?.companies.filter((c) => c.status === "active");
  const companyCount = activeCompanies ? activeCompanies.length : firm.companyCount;
  const activeSlugs = new Set(
    (activeCompanies ?? [])
      .map((c) => c.slug)
      .filter((s): s is string => !!s),
  );
  const linkedCompanies = activeCompanies
    ? (companies ?? []).filter((c) => activeSlugs.has(c.id))
    : companies ?? [];

  return (
    <div
      className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
      data-testid={`admin-firm-card-${firm.slug}`}
    >
      {/* Header: identity */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {firm.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground" title={firm.name}>
              {firm.name}
            </span>
            {internalOnly && (
              <span title="Internal only">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
          </div>
          <code className="mt-0.5 inline-block rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {firm.slug}
          </code>
        </div>
      </div>

      {/* Badges: clearance (internalOnly flag) · data source — always two pills,
          full text, no truncation. The full statusLabel rides the tooltip. */}
      <div className="mt-3 flex items-center gap-1.5">
        {internalOnly ? (
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-600"
            title={statusLabel ?? "Internal only — not cleared for external distribution"}
          >
            <Lock className="h-2.5 w-2.5 shrink-0" />
            Internal only
          </span>
        ) : (
          <span
            className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600"
            title={statusLabel ?? "Cleared for client distribution"}
          >
            Client-ready
          </span>
        )}
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-400/40 bg-slate-400/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
          Public-signal data
        </span>
      </div>

      <ClearanceToggle firmId={firm.id} firmName={firm.name} currentInternalOnly={internalOnly} />

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Companies
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-foreground">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {companyCount}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Avg composite
          </div>
          <div className="mt-0.5 font-mono text-foreground">
            {summary
              ? `${summary.avgComposite.toFixed(1)} / ${PILLAR_MAX}`
              : "--"}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Disclosed ARR
          </div>
          <div className="mt-0.5 font-mono text-foreground">
            {summary ? summary.totalArrDisplay : "--"}
          </div>
          {summary && summary.arrUndisclosedCount > 0 && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              +{summary.arrUndisclosedCount} undisclosed
            </div>
          )}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Tier mix
          </div>
          <div className="mt-1">
            {summary ? (
              <TierDistribution summary={summary} />
            ) : (
              <span className="text-muted-foreground">--</span>
            )}
          </div>
        </div>
      </div>

      {!summary && (
        <p className="mt-3 text-[11px] italic text-muted-foreground">
          No diagnostic yet.
        </p>
      )}

      {/* Assessed companies — quick links straight into each portco's portal */}
      {linkedCompanies.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Companies
          </div>
          <ul className="space-y-0.5">
            {linkedCompanies.slice(0, 5).map((company) => (
              <li key={company.id}>
                <Link
                  href={`/${firm.slug}/portfolio/${company.id}`}
                  className="group flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/50"
                  data-testid={`admin-firm-company-${company.id}`}
                >
                  <span className="truncate text-foreground group-hover:text-primary">
                    {company.name}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      TIER_CHIP[String(company.tier.id)] ?? "bg-slate-400/15 text-slate-500"
                    }`}
                    title={company.tier.label}
                  >
                    T{company.tier.id}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {linkedCompanies.length > 5 && (
            <Link
              href={`/${firm.slug}/portfolio`}
              className="mt-1 inline-block px-2 text-xs text-primary hover:underline"
              data-testid={`admin-firm-company-more-${firm.slug}`}
            >
              +{linkedCompanies.length - 5} more
            </Link>
          )}
        </div>
      )}

      {/* Spacer pushes the footer to the bottom so cards align across rows */}
      <div className="flex-1" />

      {/* Footer link → tenant portal for ready firms, recovery panel for others */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete firm"
            data-testid={`button-delete-firm-${firm.slug}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span />
        )}
        <Link
          href={firm.status === "ready" ? `/${firm.slug}/portfolio` : `/admin/firms/${firm.id}`}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          data-testid={`admin-firm-open-${firm.slug}`}
        >
          {firm.status === "ready" ? "Open portal" : "Review firm"}{" "}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create-firm form (absorbed from the former AdminHome). Toggled from the
// page header so it doesn't dominate the index.
// ---------------------------------------------------------------------------
function CreateFirmCard({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  const createFirm = useCreateAdminFirm({
    mutation: {
      onSuccess: (data) => {
        setName("");
        setWebsite("");
        toast({
          title: "Firm created",
          description: `"${data.firm.name}" is pending review. Discovery job #${data.job.id} queued.`,
        });
        onDone();
      },
      onError: (err) => {
        toast({
          title: "Failed to create firm",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const canSubmit =
    name.trim().length > 0 && website.trim().length > 0 && !createFirm.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createFirm.mutate({ data: { name: name.trim(), website: website.trim() } });
  };

  return (
    <Card className="mb-6" data-testid="card-new-firm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlusCircle className="h-4 w-4 text-primary" />
          New firm assessment
        </CardTitle>
        <CardDescription>
          Creates a firm in "pending" status and queues a discovery job that
          web-searches its current portfolio. Company selection happens in the
          firm's lens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-[1.4fr_1.4fr_auto] sm:items-end"
          data-testid="form-new-firm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="firm-name">Firm name</Label>
            <Input
              id="firm-name"
              data-testid="input-firm-name"
              placeholder="e.g. Pamlico Capital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firm-website">Firm website</Label>
            <Input
              id="firm-website"
              data-testid="input-firm-website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={!canSubmit} data-testid="button-submit-firm">
            {createFirm.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create firm
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Manual firm creation — a bare firm record with portal meta, NO discovery
// job. Companies and diagnostics are added later from the firm review screen.
// ---------------------------------------------------------------------------
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ManualFirmCard({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);

  const createManual = useCreateManualAdminFirm({
    mutation: {
      onSuccess: (firm) => {
        void queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
        toast({
          title: "Firm created",
          description: `"${firm.name}" was created without a discovery run. Open it to add companies.`,
        });
        onDone();
      },
      onError: (err) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          (err instanceof Error ? err.message : "Unexpected error");
        toast({
          title: "Failed to create firm",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  const effectiveSlug = slugTouched ? slug : slugifyName(name);
  const canSubmit =
    name.trim().length > 0 && effectiveSlug.length > 0 && !createManual.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createManual.mutate({
      data: {
        name: name.trim(),
        slug: effectiveSlug,
        ...(statusLabel.trim().length > 0 ? { statusLabel: statusLabel.trim() } : {}),
        ...(internalOnly ? { internalOnly } : {}),
      },
    });
  };

  return (
    <Card className="mb-6" data-testid="card-manual-firm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FilePlus2 className="h-4 w-4 text-primary" />
          Add firm manually
        </CardTitle>
        <CardDescription>
          Creates the firm record only -- no AI discovery run. Add companies
          and run diagnostics later from the firm's review screen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" data-testid="form-manual-firm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="manual-firm-name">Firm name</Label>
              <Input
                id="manual-firm-name"
                data-testid="input-manual-firm-name"
                placeholder="e.g. Bain Capital"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-firm-slug">URL slug</Label>
              <Input
                id="manual-firm-slug"
                data-testid="input-manual-firm-slug"
                placeholder="e.g. bain-capital"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Lowercase letters, digits, and hyphens. Becomes /{effectiveSlug || "slug"}/portfolio.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="manual-firm-status-label">Portal status label (optional)</Label>
              <Input
                id="manual-firm-status-label"
                data-testid="input-manual-firm-status-label"
                placeholder="e.g. Internal preview"
                value={statusLabel}
                onChange={(e) => setStatusLabel(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="manual-firm-internal-only"
                checked={internalOnly}
                onCheckedChange={setInternalOnly}
                data-testid="switch-manual-firm-internal-only"
              />
              <Label htmlFor="manual-firm-internal-only" className="cursor-pointer">
                Internal only
              </Label>
            </div>
          </div>
          <div>
            <Button type="submit" disabled={!canSubmit} data-testid="button-submit-manual-firm">
              {createManual.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create firm
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Reorder panel — replaces the card grid while active. Operates on the FULL
// firm list (the hide filter is ignored here so a hidden firm can't silently
// pin itself to a stale position), saves the complete order transactionally.
// ---------------------------------------------------------------------------
function ReorderPanel({
  firms,
  onDone,
}: {
  firms: AdminFirmSummary[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<AdminFirmSummary[]>(firms);

  const reorder = useReorderAdminFirms({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
        toast({ title: "Order saved", description: "Firm order updated for all admins." });
        onDone();
      },
      onError: (err) => {
        toast({
          title: "Failed to save order",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    },
  });

  const move = (index: number, delta: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });
  };

  return (
    <Card data-testid="card-reorder-firms">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-4 w-4 text-primary" />
          Reorder firms
        </CardTitle>
        <CardDescription>
          This order is saved to the database and applies for every admin.
          Hidden firms are shown here too so the full order stays consistent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {order.map((firm, i) => (
            <li
              key={firm.id}
              className="flex items-center gap-3 px-3 py-2"
              data-testid={`reorder-row-${firm.slug}`}
            >
              <span className="w-6 text-right font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {firm.name}
                <code className="ml-2 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {firm.slug}
                </code>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                data-testid={`button-move-up-${firm.slug}`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
                data-testid={`button-move-down-${firm.slug}`}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => reorder.mutate({ data: { firmIds: order.map((f) => f.id) } })}
            disabled={reorder.isPending}
            data-testid="button-save-order"
          >
            {reorder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save order
          </Button>
          <Button size="sm" variant="outline" onClick={onDone} data-testid="button-cancel-order">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminFirmsIndex() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminFirmSummary | null>(null);

  // Personal, per-browser show/hide filter (never affects other admins or
  // any tenant page).
  const { hidden, toggleFirm, showAll } = useHiddenFirms("firms");

  // Subscribe to hydration status so cards re-render once the (public)
  // portfolio bootstrap lands and getFirmSummary() can resolve.
  const { status } = usePortfolioData();
  const ready = status === "ready";

  const { data: firms, isLoading, isError } = useListAdminFirms({
    query: {
      queryKey: getListAdminFirmsQueryKey(),
      refetchInterval: (query) =>
        query.state.data?.some((f) => isJobActive(f.latestJob)) ? 4000 : false,
    },
  });

  const deleteFirm = useDeleteAdminFirm({
    mutation: {
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: getListAdminFirmsQueryKey() });
        toast({
          title: "Firm deleted",
          description: `Removed ${result.removedCompanies} companies and ${result.removedAssessments} assessments.`,
        });
        setDeleteTarget(null);
      },
      onError: (err) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          (err instanceof Error ? err.message : "Unexpected error");
        toast({ title: "Failed to delete firm", description: message, variant: "destructive" });
        setDeleteTarget(null);
      },
    },
  });

  const visibleFirms = useMemo(
    () => (firms ?? []).filter((f) => !hidden.has(f.slug)),
    [firms, hidden],
  );

  return (
    <div data-testid="admin-firms-index">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
            Internal
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Firms
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every firm tenant, with its live diagnostic rollup. Open a portal to
            work its admin lens.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FirmFilterControl
            firms={(firms ?? []).map((f) => ({ slug: f.slug, name: f.name }))}
            hidden={hidden}
            onToggle={toggleFirm}
            onShowAll={showAll}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReordering((v) => !v)}
            disabled={!firms || firms.length < 2}
            data-testid="button-toggle-reorder"
          >
            <ListOrdered className="h-4 w-4" />
            {reordering ? "Close reorder" : "Reorder"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowManual((v) => !v);
              setShowCreate(false);
            }}
            data-testid="button-toggle-manual-firm"
          >
            <FilePlus2 className="h-4 w-4" />
            {showManual ? "Close" : "Add manually"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setShowCreate((v) => !v);
              setShowManual(false);
            }}
            data-testid="button-toggle-new-firm"
          >
            <PlusCircle className="h-4 w-4" />
            {showCreate ? "Close" : "New assessment"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {showCreate && <CreateFirmCard onDone={() => setShowCreate(false)} />}
        {showManual && <ManualFirmCard onDone={() => setShowManual(false)} />}

        {isLoading && (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="text-firms-loading"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Loading firms…
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive" data-testid="text-firms-error">
            Failed to load firms.
          </p>
        )}

        {firms && firms.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No firms yet. Create one with “New assessment”.
          </p>
        )}

        {firms && firms.length > 0 && reordering && (
          <ReorderPanel firms={firms} onDone={() => setReordering(false)} />
        )}

        {firms && firms.length > 0 && !reordering && (
          <>
            {visibleFirms.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-all-firms-hidden">
                All {firms.length} firms are hidden by your filter.{" "}
                <button
                  type="button"
                  onClick={showAll}
                  className="text-primary hover:underline"
                  data-testid="button-show-all-inline"
                >
                  Show all
                </button>
              </p>
            ) : (
              <div
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                data-testid="admin-firms-grid"
              >
                {visibleFirms.map((firm) => (
                  <FirmCard
                    key={firm.id}
                    firm={firm}
                    summary={ready ? getFirmSummary(firm.slug) : undefined}
                    companies={ready ? getFirmCompanies(firm.slug) : undefined}
                    onDelete={
                      LEGACY_SLUGS.has(firm.slug) ? undefined : () => setDeleteTarget(firm)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation — spells out exactly what goes with the firm. */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent data-testid="dialog-delete-firm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the firm, its companies, every
              assessment and diagnostic report, and its job history. The
              tenant portal at /{deleteTarget?.slug}/portfolio stops resolving
              immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteFirm.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteFirm.mutate({ id: deleteTarget.id });
              }}
              data-testid="button-confirm-delete"
            >
              {deleteFirm.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete firm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
