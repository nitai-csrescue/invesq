import { Fragment, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useListAdminTierSummary,
  getListAdminTierSummaryQueryKey,
  useListAdminTierDisputes,
  getListAdminTierDisputesQueryKey,
  useListAdminTierAudit,
  getListAdminTierAuditQueryKey,
  useListAdminFirms,
  getListAdminFirmsQueryKey,
  useUpdateAdminCompanyTier2,
  useUpdateAdminCompanyTier3,
  useCreateAdminTierDispute,
  useResolveAdminTierDispute,
  type TierSummaryRow,
  type ListAdminTierSummaryParams,
} from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// AdminTiers — CQ-37 tiered confidence model summary. One paginated,
// sortable, filterable table of every company across every tenant:
//   Tier 1 (INVESQ Initial Scan)      — derived, complete when Phase 1
//                                        assessments exist
//   Tier 2 (Portco Telemetry)         — x/4 connectors, per-connector
//                                        drill-in
//   Tier 3 (Portco Validation)        — CQ-12 vocabulary, admin-settable
// plus the pending Tier 3 dispute count awaiting review. Server-side
// pagination (25/page) so this scales to many tenants/companies.
// Tiers are INDEPENDENT — no column implies another.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const CONNECTORS = [
  { key: "backengine", label: "BackEngine" },
  { key: "crm", label: "CRM" },
  { key: "conversation_intelligence", label: "Conversation Intelligence" },
  { key: "product_telemetry", label: "Product Telemetry" },
] as const;

const CONNECTOR_STATUSES = ["not_connected", "partial", "connected"] as const;
const TIER3_OPTIONS = [
  { value: "unconfirmed", label: "Unconfirmed" },
  { value: "portco_confirmed", label: "Portco-Confirmed" },
  { value: "pe_confirmed", label: "PE-Confirmed" },
] as const;

function tier3Label(value: string): string {
  return TIER3_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function Tier3Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unconfirmed: "bg-slate-100 text-slate-600",
    portco_confirmed: "bg-blue-100 text-blue-700",
    pe_confirmed: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
      data-testid={`badge-tier3-${status}`}
    >
      {tier3Label(status)}
    </span>
  );
}

function connectorStatusLabel(s: string): string {
  if (s === "connected") return "Connected";
  if (s === "partial") return "Partial";
  return "Not connected";
}

type SortBy = NonNullable<ListAdminTierSummaryParams["sortBy"]>;

function RowDetail({ row, onMutated }: { row: TierSummaryRow; onMutated: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeProposed, setDisputeProposed] = useState<string>("");

  const disputesQuery = useListAdminTierDisputes(
    { companyId: row.companyId },
    { query: { queryKey: getListAdminTierDisputesQueryKey({ companyId: row.companyId }) } },
  );
  const auditQuery = useListAdminTierAudit(row.companyId, {
    query: { queryKey: getListAdminTierAuditQueryKey(row.companyId) },
  });

  const refreshAll = () => {
    onMutated();
    void queryClient.invalidateQueries({
      queryKey: getListAdminTierDisputesQueryKey({ companyId: row.companyId }),
    });
    void queryClient.invalidateQueries({ queryKey: getListAdminTierAuditQueryKey(row.companyId) });
  };

  const tier2Mutation = useUpdateAdminCompanyTier2({
    mutation: {
      onSuccess: refreshAll,
      onError: () => toast({ title: "Failed to update connector status", variant: "destructive" }),
    },
  });
  const tier3Mutation = useUpdateAdminCompanyTier3({
    mutation: {
      onSuccess: refreshAll,
      onError: () => toast({ title: "Failed to update Tier 3 status", variant: "destructive" }),
    },
  });
  const disputeMutation = useCreateAdminTierDispute({
    mutation: {
      onSuccess: () => {
        setDisputeReason("");
        setDisputeProposed("");
        refreshAll();
        toast({ title: "Dispute flagged for review (no value was changed)" });
      },
      onError: () => toast({ title: "Failed to flag dispute", variant: "destructive" }),
    },
  });
  const resolveMutation = useResolveAdminTierDispute({
    mutation: {
      onSuccess: refreshAll,
      onError: (err: unknown) =>
        toast({
          title: "Failed to resolve dispute",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        }),
    },
  });

  const pendingDisputes = (disputesQuery.data ?? []).filter((d) => d.status === "pending");
  const resolvedDisputes = (disputesQuery.data ?? []).filter((d) => d.status !== "pending");

  return (
    <div className="grid gap-6 bg-slate-50 p-4 lg:grid-cols-3" data-testid={`row-detail-${row.companyId}`}>
      {/* Tier 2 per-connector breakdown */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tier 2 — Portco Telemetry ({row.tier2.connectedCount}/{row.tier2.totalCount} connected)
        </div>
        <div className="space-y-2">
          {CONNECTORS.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700">{c.label}</span>
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                value={row.tier2[c.key]}
                disabled={tier2Mutation.isPending}
                data-testid={`select-tier2-${row.companyId}-${c.key}`}
                onChange={(e) =>
                  tier2Mutation.mutate({
                    companyId: row.companyId,
                    data: { connector: c.key, status: e.target.value as (typeof CONNECTOR_STATUSES)[number] },
                  })
                }
              >
                {CONNECTOR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {connectorStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Tier 3 + dispute entry */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tier 3 — Portco Validation
        </div>
        <select
          className="mb-4 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          value={row.tier3Status}
          disabled={tier3Mutation.isPending}
          data-testid={`select-tier3-${row.companyId}`}
          onChange={(e) =>
            tier3Mutation.mutate({
              companyId: row.companyId,
              data: { status: e.target.value as (typeof TIER3_OPTIONS)[number]["value"] },
            })
          }
        >
          {TIER3_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Flag a dispute (never changes the value)
        </div>
        <textarea
          className="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          rows={2}
          placeholder="Dispute reason (required)"
          value={disputeReason}
          data-testid={`input-dispute-reason-${row.companyId}`}
          onChange={(e) => setDisputeReason(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            value={disputeProposed}
            data-testid={`select-dispute-proposed-${row.companyId}`}
            onChange={(e) => setDisputeProposed(e.target.value)}
          >
            <option value="">No proposed value</option>
            {TIER3_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Proposes: {o.label}
              </option>
            ))}
          </select>
          <button
            className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            disabled={disputeReason.trim().length < 3 || disputeMutation.isPending}
            data-testid={`button-flag-dispute-${row.companyId}`}
            onClick={() =>
              disputeMutation.mutate({
                companyId: row.companyId,
                data: {
                  field: "tier3_status",
                  reason: disputeReason.trim(),
                  proposedValue: disputeProposed || null,
                },
              })
            }
          >
            Flag dispute
          </button>
        </div>

        {pendingDisputes.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Pending review ({pendingDisputes.length})
            </div>
            {pendingDisputes.map((d) => (
              <div key={d.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
                <div className="text-slate-700">
                  <span className="font-medium">{d.field}</span>: {d.reason}
                  {d.proposedValue ? ` (proposes ${tier3Label(d.proposedValue)})` : ""}
                </div>
                <div className="mt-1.5 flex gap-2">
                  <button
                    className="rounded bg-emerald-600 px-2 py-0.5 font-medium text-white disabled:opacity-50"
                    disabled={resolveMutation.isPending || (!d.proposedValue && d.field === "tier3_status")}
                    title={
                      !d.proposedValue && d.field === "tier3_status"
                        ? "No proposed value — set Tier 3 manually, then reject with a note"
                        : "Apply the proposed correction (writes an audit row)"
                    }
                    data-testid={`button-apply-dispute-${d.id}`}
                    onClick={() =>
                      resolveMutation.mutate({ disputeId: d.id, data: { action: "apply" } })
                    }
                  >
                    Apply
                  </button>
                  <button
                    className="rounded bg-slate-500 px-2 py-0.5 font-medium text-white disabled:opacity-50"
                    disabled={resolveMutation.isPending}
                    data-testid={`button-reject-dispute-${d.id}`}
                    onClick={() =>
                      resolveMutation.mutate({ disputeId: d.id, data: { action: "reject" } })
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {resolvedDisputes.length > 0 && (
          <div className="mt-3 text-xs text-slate-400">
            {resolvedDisputes.length} resolved dispute{resolvedDisputes.length === 1 ? "" : "s"} on record
          </div>
        )}
      </div>

      {/* Audit trail */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Audit trail (append-only)
        </div>
        {auditQuery.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (auditQuery.data ?? []).length === 0 ? (
          <div className="text-xs text-slate-400">No tier changes recorded yet.</div>
        ) : (
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1" data-testid={`audit-list-${row.companyId}`}>
            {(auditQuery.data ?? []).map((a) => (
              <div key={a.id} className="rounded border border-slate-200 bg-white p-2 text-xs">
                <div className="font-medium text-slate-700">
                  {a.field}: {a.oldValue ?? "—"} → {a.newValue ?? "—"}
                </div>
                <div className="text-slate-500">
                  {a.editor} · {new Date(a.createdAt).toLocaleString()}
                  {a.disputeId ? ` · dispute #${a.disputeId}` : ""}
                </div>
                {a.note && <div className="mt-0.5 text-slate-500">{a.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTiers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("company");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [firmSlug, setFirmSlug] = useState<string>("");
  const [tier3Filter, setTier3Filter] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const params: ListAdminTierSummaryParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      sortBy,
      sortDir,
      ...(firmSlug ? { firmSlug } : {}),
      ...(tier3Filter ? { tier3Status: tier3Filter as never } : {}),
    }),
    [offset, sortBy, sortDir, firmSlug, tier3Filter],
  );

  const summaryQuery = useListAdminTierSummary(params, {
    query: { queryKey: getListAdminTierSummaryQueryKey(params), placeholderData: (p) => p },
  });
  const firmsQuery = useListAdminFirms({
    query: { queryKey: getListAdminFirmsQueryKey() },
  });

  const invalidateSummary = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/admin/tier-summary"] });
    void queryClient.invalidateQueries({ queryKey: getListAdminTierSummaryQueryKey(params) });
  };

  const data = summaryQuery.data;
  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleSort = (key: SortBy) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setOffset(0);
  };

  const SortHeader = ({ label, k }: { label: string; k: SortBy }) => (
    <button
      className="inline-flex items-center gap-1 font-medium"
      onClick={() => toggleSort(k)}
      data-testid={`sort-${k}`}
    >
      {label}
      {sortBy === k ? (
        sortDir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  // NOTE: no AdminShell wrapper here — ProtectedRoute in App.tsx already
  // wraps every /admin route in AdminShell; nesting it double-renders the nav.
  return (
    <div className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Layers className="h-5 w-5 text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900" data-testid="heading-tiers">
            Confidence Tiers
          </h1>
        </div>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">
          Tier 1 (INVESQ Initial Scan) · Tier 2 (Portco Telemetry Integration) · Tier 3 (Portco
          Validation). Tiers are independent — any combination is valid. Disputes are flagged for
          review and never change a value until an admin applies them; every change writes an audit
          row.
        </p>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            value={firmSlug}
            data-testid="filter-tenant"
            onChange={(e) => {
              setFirmSlug(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All tenants</option>
            {(firmsQuery.data ?? []).map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            value={tier3Filter}
            data-testid="filter-tier3"
            onChange={(e) => {
              setTier3Filter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All Tier 3 statuses</option>
            {TIER3_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {summaryQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        {summaryQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load the tier summary.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <Table data-testid="table-tier-summary">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>
                      <SortHeader label="Company" k="company" />
                    </TableHead>
                    <TableHead>
                      <SortHeader label="Tenant" k="tenant" />
                    </TableHead>
                    <TableHead>Tier 1</TableHead>
                    <TableHead>
                      <SortHeader label="Tier 2" k="tier2" />
                    </TableHead>
                    <TableHead>
                      <SortHeader label="Tier 3" k="tier3" />
                    </TableHead>
                    <TableHead>
                      <SortHeader label="Pending disputes" k="disputes" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows ?? []).map((row) => (
                    <Fragment key={row.companyId}>
                      <TableRow
                        className="cursor-pointer"
                        data-testid={`row-company-${row.companyId}`}
                        onClick={() =>
                          setExpanded((e) => (e === row.companyId ? null : row.companyId))
                        }
                      >
                        <TableCell>
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform ${expanded === row.companyId ? "rotate-180" : ""}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {row.companyName}
                          {row.companyStatus !== "active" && (
                            <span className="ml-2 text-xs text-slate-400">({row.companyStatus})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">{row.firmName}</TableCell>
                        <TableCell>
                          {row.tier1Complete ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Pending scan</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {row.tier2.connectedCount}/{row.tier2.totalCount} connected
                        </TableCell>
                        <TableCell>
                          <Tier3Badge status={row.tier3Status} />
                        </TableCell>
                        <TableCell>
                          {row.pendingDisputes > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                              <ShieldAlert className="h-3.5 w-3.5" /> {row.pendingDisputes}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded === row.companyId && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            <RowDetail row={row} onMutated={invalidateSummary} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div data-testid="text-pagination-info">
                {total === 0
                  ? "No companies"
                  : `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total} companies`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 disabled:opacity-40"
                  disabled={offset === 0}
                  data-testid="button-prev-page"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span data-testid="text-page">
                  Page {page} / {pageCount}
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 disabled:opacity-40"
                  disabled={offset + PAGE_SIZE >= total}
                  data-testid="button-next-page"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
  );
}
