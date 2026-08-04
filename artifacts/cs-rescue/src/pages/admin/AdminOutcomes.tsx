import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, TrendingUp, Trash2 } from "lucide-react";
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
  useGetAdminCompanyOutcomes,
  getGetAdminCompanyOutcomesQueryKey,
  useUpdateAdminCompanyOutcomeMetrics,
  useCreateAdminOutcomeIntervention,
  useDeleteAdminOutcomeIntervention,
  type OutcomeMetricsSnapshot,
} from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// AdminOutcomes — Data Moat action #3 (Outcome Data). INTERNAL-ONLY entry and
// edit surface for per-company retention outcomes (GRR/NRR at entry and at
// the 90-day / 180-day / annual milestones) plus a structured interventions
// log (pillar, action, date, owner).
//
// This data must NEVER render on any tenant-facing page, client report, or
// exported PDF (standing rule: no real GRR/NRR in client-facing material).
// Server-side the routes live under /api/admin (requireAdminAuth); this page
// sits behind the same ProtectedRoute + AdminShell as the rest of /admin.
// Company list reuses the paginated cross-tenant tier summary endpoint.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const METRIC_FIELDS = [
  { key: "grrEntry", label: "GRR @ entry" },
  { key: "nrrEntry", label: "NRR @ entry" },
  { key: "grr90d", label: "GRR @ 90d" },
  { key: "nrr90d", label: "NRR @ 90d" },
  { key: "grr180d", label: "GRR @ 180d" },
  { key: "nrr180d", label: "NRR @ 180d" },
  { key: "grrAnnual", label: "GRR @ annual" },
  { key: "nrrAnnual", label: "NRR @ annual" },
] as const;
type MetricKey = (typeof METRIC_FIELDS)[number]["key"];

const PILLARS = [
  { value: "org_design", label: "Org Design" },
  { value: "onboarding", label: "Onboarding" },
  { value: "health_scoring", label: "Health Scoring" },
  { value: "renewal_expansion", label: "Renewal & Expansion" },
] as const;

function pillarLabel(value: string): string {
  return PILLARS.find((p) => p.value === value)?.label ?? value;
}

function fmt(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${v}%`;
}

// ── Per-company drill-in ────────────────────────────────────────────────────

function OutcomeEditor({ companyId }: { companyId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useGetAdminCompanyOutcomes(companyId);
  const [draft, setDraft] = useState<Record<MetricKey, string> | null>(null);
  const [form, setForm] = useState({ pillar: "org_design", action: "", occurredOn: "", owner: "" });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminCompanyOutcomesQueryKey(companyId) });

  const saveMetrics = useUpdateAdminCompanyOutcomeMetrics({
    mutation: {
      onSuccess: () => {
        setDraft(null);
        invalidate();
        toast({ title: "Outcome metrics saved" });
      },
      onError: (e: unknown) =>
        toast({ title: "Save failed", description: String((e as Error)?.message ?? e), variant: "destructive" }),
    },
  });
  const addIntervention = useCreateAdminOutcomeIntervention({
    mutation: {
      onSuccess: () => {
        setForm({ pillar: "org_design", action: "", occurredOn: "", owner: "" });
        invalidate();
        toast({ title: "Intervention logged" });
      },
      onError: (e: unknown) =>
        toast({ title: "Log failed", description: String((e as Error)?.message ?? e), variant: "destructive" }),
    },
  });
  const removeIntervention = useDeleteAdminOutcomeIntervention({
    mutation: {
      onSuccess: invalidate,
      onError: (e: unknown) =>
        toast({ title: "Delete failed", description: String((e as Error)?.message ?? e), variant: "destructive" }),
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading outcomes…
      </div>
    );
  }
  if (error || !data) {
    return <div className="p-4 text-sm text-destructive">Failed to load outcome data.</div>;
  }

  const metrics = data.metrics as OutcomeMetricsSnapshot;
  const values: Record<MetricKey, string> =
    draft ??
    (Object.fromEntries(
      METRIC_FIELDS.map((f) => [f.key, metrics[f.key] === null || metrics[f.key] === undefined ? "" : String(metrics[f.key])]),
    ) as Record<MetricKey, string>);

  const onSave = () => {
    const body: Record<string, number | null> = {};
    for (const f of METRIC_FIELDS) {
      const raw = values[f.key].trim();
      if (raw === "") {
        body[f.key] = null;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 200) {
        toast({ title: `${f.label}: must be a number between 0 and 200`, variant: "destructive" });
        return;
      }
      body[f.key] = n;
    }
    saveMetrics.mutate({ companyId, data: body });
  };

  return (
    <div className="space-y-6 p-4" data-testid={`outcome-editor-${companyId}`}>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Retention outcomes (internal only — never client-facing)</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METRIC_FIELDS.map((f) => (
            <label key={f.key} className="block text-xs text-muted-foreground">
              {f.label}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={200}
                step="0.1"
                placeholder="—"
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                value={values[f.key]}
                onChange={(e) => setDraft({ ...values, [f.key]: e.target.value })}
                data-testid={`input-${f.key}-${companyId}`}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={draft === null || saveMetrics.isPending}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          data-testid={`button-save-metrics-${companyId}`}
        >
          {saveMetrics.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save metrics
        </button>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Interventions log</h4>
        {data.interventions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interventions logged yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Action taken</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.interventions.map((iv) => (
                <TableRow key={iv.id}>
                  <TableCell className="whitespace-nowrap text-sm">{iv.occurredOn}</TableCell>
                  <TableCell className="text-sm">{pillarLabel(iv.pillar)}</TableCell>
                  <TableCell className="text-sm">{iv.action}</TableCell>
                  <TableCell className="text-sm">{iv.owner}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label="Delete intervention"
                      onClick={() => removeIntervention.mutate({ interventionId: iv.id })}
                      className="text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-intervention-${iv.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={form.pillar}
            onChange={(e) => setForm({ ...form, pillar: e.target.value })}
            data-testid={`select-pillar-${companyId}`}
          >
            {PILLARS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border bg-background px-2 py-1.5 text-sm sm:col-span-2"
            placeholder="Action taken"
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
            data-testid={`input-action-${companyId}`}
          />
          <input
            type="date"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={form.occurredOn}
            onChange={(e) => setForm({ ...form, occurredOn: e.target.value })}
            data-testid={`input-date-${companyId}`}
          />
          <input
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            placeholder="Owner"
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            data-testid={`input-owner-${companyId}`}
          />
        </div>
        <button
          type="button"
          onClick={() =>
            addIntervention.mutate({
              companyId,
              data: {
                pillar: form.pillar as (typeof PILLARS)[number]["value"],
                action: form.action.trim(),
                occurredOn: form.occurredOn,
                owner: form.owner.trim(),
              },
            })
          }
          disabled={
            addIntervention.isPending || !form.action.trim() || !form.occurredOn || !form.owner.trim()
          }
          className="mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          data-testid={`button-add-intervention-${companyId}`}
        >
          {addIntervention.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Log intervention
        </button>
      </div>
    </div>
  );
}

// ── Summary row (collapsed view shows entry/annual snapshot) ────────────────

function CompanyRow({
  companyId,
  companyName,
  firmName,
  open,
  onToggle,
}: {
  companyId: number;
  companyName: string;
  firmName: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle} data-testid={`row-company-${companyId}`}>
        <TableCell className="font-medium">{companyName}</TableCell>
        <TableCell className="text-muted-foreground">{firmName}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{open ? "editing" : "open to view"}</TableCell>
        <TableCell>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30 p-0">
            <OutcomeEditor companyId={companyId} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AdminOutcomes() {
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isLoading } = useListAdminTierSummary({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    sortBy: "company",
    sortDir: "asc",
  });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Outcomes</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Internal outcome tracking (Data Moat action #3): entry and milestone GRR/NRR plus the
        interventions log. This data is admin-only and never appears on tenant pages, client
        reports, or exported PDFs.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading companies…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>GRR / NRR @ entry</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((row) => (
                <CompanyRow
                  key={row.companyId}
                  companyId={row.companyId}
                  companyName={row.companyName}
                  firmName={row.firmName}
                  open={openId === row.companyId}
                  onToggle={() => setOpenId(openId === row.companyId ? null : row.companyId)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} companies · page {page + 1} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border p-1.5 disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md border p-1.5 disabled:opacity-40"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
