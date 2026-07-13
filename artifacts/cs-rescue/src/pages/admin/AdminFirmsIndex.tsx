import { useState } from "react";
import { Link } from "wouter";
import {
  Building2,
  Loader2,
  PlusCircle,
  ArrowRight,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateAdminFirm,
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useGetAdminFirm,
  getGetAdminFirmQueryKey,
  type AdminFirmSummary,
} from "@workspace/api-client-react";
import { isJobActive } from "@/lib/adminJobs";
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

// ---------------------------------------------------------------------------
// Status pill styling (firm lifecycle status: pending/reviewed/active/ready)
// ---------------------------------------------------------------------------
const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  reviewed: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
};

function statusPillClass(status: string) {
  return STATUS_STYLES[status] ?? "border-slate-500/30 bg-slate-500/10 text-slate-600";
}

// dataAuthority is admin-only metadata describing how much we trust a firm's
// underlying data (strict = client-supplied, best_effort = web-discovered).
function dataAuthorityLabel(v: string): string {
  return v === "strict" ? "Strict" : "Best effort";
}
function dataAuthorityClass(v: string): string {
  return v === "strict"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
    : "border-slate-400/40 bg-slate-400/10 text-slate-500";
}

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
  if (chips.length === 0) return <span className="text-muted-foreground">—</span>;
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
// Firm card — admin-API-driven identity + status, with an OPTIONAL engine
// join for diagnostic rollups. Pending / meta-less firms never reach the
// engine, so they simply render "No diagnostic yet".
// ---------------------------------------------------------------------------
function FirmCard({
  firm,
  summary,
  companies,
}: {
  firm: AdminFirmSummary;
  summary: PortfolioSummary | undefined;
  companies: Company[] | undefined;
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

      {/* Badges: lifecycle status · statusLabel · dataAuthority — one line,
          never wrapping; the variable-length statusLabel truncates + tooltips. */}
      <div className="mt-3 flex items-center gap-1.5 overflow-hidden">
        <span
          className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(firm.status)}`}
          title={`Status: ${firm.status}`}
        >
          {firm.status}
        </span>
        {statusLabel && (
          <span
            className={`inline-flex min-w-0 shrink items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              internalOnly
                ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
            title={statusLabel}
          >
            {internalOnly && <ShieldAlert className="h-2.5 w-2.5 shrink-0" />}
            <span className="truncate">{statusLabel}</span>
          </span>
        )}
        <span
          className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${dataAuthorityClass(firm.dataAuthority)}`}
          title={`Data authority: ${dataAuthorityLabel(firm.dataAuthority)}`}
        >
          {dataAuthorityLabel(firm.dataAuthority)}
        </span>
      </div>

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
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Disclosed ARR
          </div>
          <div className="mt-0.5 font-mono text-foreground">
            {summary ? summary.totalArrDisplay : "—"}
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
              <span className="text-muted-foreground">—</span>
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
      <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
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

export default function AdminFirmsIndex() {
  const [showCreate, setShowCreate] = useState(false);
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

  return (
    <div data-testid="admin-firms-index">
      <div className="flex items-start justify-between gap-4">
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
        <Button
          size="sm"
          onClick={() => setShowCreate((v) => !v)}
          data-testid="button-toggle-new-firm"
        >
          <PlusCircle className="h-4 w-4" />
          {showCreate ? "Close" : "New assessment"}
        </Button>
      </div>

      <div className="mt-6">
        {showCreate && <CreateFirmCard onDone={() => setShowCreate(false)} />}

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

        {firms && firms.length > 0 && (
          <div
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            data-testid="admin-firms-grid"
          >
            {firms.map((firm) => (
              <FirmCard
                key={firm.id}
                firm={firm}
                summary={ready ? getFirmSummary(firm.slug) : undefined}
                companies={ready ? getFirmCompanies(firm.slug) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
