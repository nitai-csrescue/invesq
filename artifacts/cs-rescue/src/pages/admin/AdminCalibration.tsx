import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Lock, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useListAdminTierSummary,
  useGetAdminCompanyCalibration,
  getGetAdminCompanyCalibrationQueryKey,
  useLockAdminCalibrationPrediction,
  useCreateAdminCalibrationObservation,
  useCreateAdminResolutionEvent,
  useDeleteAdminResolutionEvent,
  useGetAdminCompanyConfirmation,
  getGetAdminCompanyConfirmationQueryKey,
  useCreateAdminConfirmationRequest,
  useRevokeAdminConfirmationRequest,
} from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// AdminCalibration — Calibration Ledger (Data Moat). INTERNAL-ONLY surface
// for Predicted vs Observed vs Delta per pillar, plus Resolution Events
// (stored in the existing signals table with event_type set).
//
// - Predicted: one locked snapshot per company, derived server-side from the
//   latest scored assessment. Immutable after locking (server enforces 409).
// - Observed: entered whenever real signal arrives, from any source, with
//   its own timestamp. Partial pillar maps are fine.
// - Delta: computed server-side at read time (Observed minus Predicted).
// Never tenant-facing. Same ProtectedRoute + AdminShell as the rest of /admin.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const PILLAR_LABELS: Record<string, string> = {
  org: "Org",
  onboarding: "Onboarding",
  health: "Health",
  escalation: "Escalation",
  revenue: "Revenue",
  leadership: "Leadership",
  planning: "Planning",
  ai: "AI",
};
const PILLAR_IDS = Object.keys(PILLAR_LABELS);

const EVENT_TYPES = [
  { value: "leadership_departure", label: "CS/Sales leadership departure" },
  { value: "cs_layoffs", label: "Layoffs in CS/support" },
  { value: "rating_drop", label: "Sharp G2/Capterra rating drop" },
  { value: "funding_cs_rebuild", label: "Funding round tied to retention/CS/GTM rebuild" },
  { value: "acquisition_distress", label: "Acquisition / distressed sale / wind-down" },
] as const;

const SCORE_OPTIONS = ["", "0", "1", "2", "NA"] as const;

function fmtScore(v: string | null | undefined): string {
  return v === null || v === undefined ? "—" : v;
}

function fmtDelta(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v > 0 ? `+${v}` : String(v);
}

// ── Confirmation (Engagement Entry Step 2) ──────────────────────────────────
// Confirmation Status is companies.tier3_status (unconfirmed | portco_confirmed
// | pe_confirmed). This section shows the status + auto-flagged pillars and
// mints expiring single-purpose /confirm/{token} links for the portco CS lead
// or PE operating partner. The raw link is shown ONCE — copy it here.

const CONFIRMATION_STATUS_LABELS: Record<string, string> = {
  unconfirmed: "Unconfirmed",
  portco_confirmed: "Portco-Confirmed",
  pe_confirmed: "PE-Confirmed",
};

const RECIPIENT_ROLES = [
  { value: "portco_cs_lead", label: "Portco CS lead" },
  { value: "pe_operating_partner", label: "PE operating partner" },
] as const;

function ConfirmationSection({ companyId }: { companyId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetAdminCompanyConfirmation(companyId);
  const [role, setRole] = useState<string>("portco_cs_lead");
  const [freshLink, setFreshLink] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminCompanyConfirmationQueryKey(companyId) });

  const createRequest = useCreateAdminConfirmationRequest({
    mutation: {
      onSuccess: (res) => {
        setFreshLink(res.link);
        invalidate();
        toast({
          title: "Confirmation link created",
          description: "The link is shown once — copy and send it now.",
        });
      },
      onError: (e: unknown) =>
        toast({
          title: "Could not create link",
          description: String((e as Error)?.message ?? e),
          variant: "destructive",
        }),
    },
  });
  const revokeRequest = useRevokeAdminConfirmationRequest({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Link revoked" });
      },
      onError: (e: unknown) =>
        toast({
          title: "Revoke failed",
          description: String((e as Error)?.message ?? e),
          variant: "destructive",
        }),
    },
  });

  if (isLoading || !data) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Portco / PE confirmation</h3>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Confirmation Status:</span>
          <span
            className="rounded-full border px-2 py-0.5 text-xs font-medium"
            data-testid="badge-confirmation-status"
          >
            {CONFIRMATION_STATUS_LABELS[data.confirmationStatus] ?? data.confirmationStatus}
          </span>
          <span className="text-xs text-muted-foreground">
            (tier3_status — admin overrides via Tiers page; upgrades automatically on submission)
          </span>
        </div>

        <div>
          <span className="text-muted-foreground">Auto-flagged pillars: </span>
          {data.flaggedPillars.length === 0 ? (
            <span data-testid="text-no-flagged">none — every pillar has a confident score</span>
          ) : (
            <span data-testid="text-flagged-pillars">
              {data.flaggedPillars.map((f) => PILLAR_LABELS[f.pillarId] ?? f.pillarId).join(", ")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            data-testid="select-recipient-role"
          >
            {RECIPIENT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={createRequest.isPending || data.flaggedPillars.length === 0}
            onClick={() =>
              createRequest.mutate({ companyId, data: { recipientRole: role as never } })
            }
            data-testid="button-create-confirmation-link"
          >
            {createRequest.isPending ? "Creating…" : "Create confirmation link"}
          </Button>
        </div>

        {freshLink && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
            <code className="max-w-full flex-1 break-all text-xs" data-testid="text-fresh-link">
              {freshLink}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(freshLink);
                toast({ title: "Link copied" });
              }}
              data-testid="button-copy-link"
            >
              Copy
            </Button>
          </div>
        )}

        {data.requests.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent to</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Responded</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.requests.map((r) => (
                  <TableRow key={r.id} data-testid={`row-confirmation-request-${r.id}`}>
                    <TableCell>
                      {RECIPIENT_ROLES.find((x) => x.value === r.recipientRole)?.label ??
                        r.recipientRole}
                    </TableCell>
                    <TableCell data-testid={`text-request-status-${r.id}`}>{r.status}</TableCell>
                    <TableCell>{new Date(r.expiresAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.respondedAt ? new Date(r.respondedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {r.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={revokeRequest.isPending}
                          onClick={() => revokeRequest.mutate({ requestId: r.id })}
                          data-testid={`button-revoke-${r.id}`}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Per-company drill-in ────────────────────────────────────────────────────

function CalibrationEditor({ companyId }: { companyId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useGetAdminCompanyCalibration(companyId);
  const [obsForm, setObsForm] = useState<{ pillars: Record<string, string>; observedAt: string; source: string; note: string }>(
    { pillars: {}, observedAt: "", source: "", note: "" },
  );
  const [evtForm, setEvtForm] = useState({
    eventType: "leadership_departure",
    eventDate: "",
    source: "",
    pillarId: "org",
    verdict: "confirms",
    note: "",
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminCompanyCalibrationQueryKey(companyId) });

  const onError = (title: string) => (e: unknown) =>
    toast({ title, description: String((e as Error)?.message ?? e), variant: "destructive" });

  const lockPrediction = useLockAdminCalibrationPrediction({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Prediction snapshot locked", description: "This snapshot is now immutable." });
      },
      onError: onError("Lock failed"),
    },
  });
  const addObservation = useCreateAdminCalibrationObservation({
    mutation: {
      onSuccess: () => {
        setObsForm({ pillars: {}, observedAt: "", source: "", note: "" });
        invalidate();
        toast({ title: "Observation recorded" });
      },
      onError: onError("Observation failed"),
    },
  });
  const addEvent = useCreateAdminResolutionEvent({
    mutation: {
      onSuccess: () => {
        setEvtForm({ eventType: "leadership_departure", eventDate: "", source: "", pillarId: "org", verdict: "confirms", note: "" });
        invalidate();
        toast({ title: "Resolution event recorded" });
      },
      onError: onError("Event failed"),
    },
  });
  const removeEvent = useDeleteAdminResolutionEvent({
    mutation: { onSuccess: invalidate, onError: onError("Delete failed") },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading calibration ledger…
      </div>
    );
  }
  if (error || !data) {
    return <div className="p-4 text-sm text-destructive">Failed to load calibration data.</div>;
  }

  const obsPillarCount = Object.keys(obsForm.pillars).length;

  return (
    <div className="space-y-6 p-4">
      {/* Confirmation Status + shareable ask links */}
      <ConfirmationSection companyId={companyId} />

      {/* Predicted (locked snapshot) */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Predicted (Stage 1 snapshot)</h3>
        {data.prediction ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" data-testid="icon-prediction-locked" />
              <span>
                Locked {new Date(data.prediction.lockedAt).toLocaleDateString()} · predicted{" "}
                {new Date(data.prediction.predictedAt).toLocaleDateString()} · composite{" "}
                {data.prediction.composite}/16 · {data.prediction.band} · rubric{" "}
                {data.prediction.rubricVersion}
              </span>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            disabled={lockPrediction.isPending}
            onClick={() => lockPrediction.mutate({ companyId })}
            data-testid="button-lock-prediction"
          >
            {lockPrediction.isPending ? "Locking…" : "Snapshot + lock from latest assessment"}
          </Button>
        )}
      </section>

      {/* Predicted / Observed / Delta table */}
      {data.prediction && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Predicted vs Observed vs Delta</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pillar</TableHead>
                  <TableHead>Predicted</TableHead>
                  <TableHead>Observed</TableHead>
                  <TableHead>Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.deltas.map((d) => (
                  <TableRow key={d.pillarId} data-testid={`row-delta-${d.pillarId}`}>
                    <TableCell className="font-medium">{PILLAR_LABELS[d.pillarId] ?? d.pillarId}</TableCell>
                    <TableCell>{fmtScore(d.predicted)}</TableCell>
                    <TableCell>{fmtScore(d.observed)}</TableCell>
                    <TableCell data-testid={`text-delta-${d.pillarId}`}>{fmtDelta(d.delta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Observed entry */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Record observed reality</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          {PILLAR_IDS.map((pid) => (
            <label key={pid} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0">{PILLAR_LABELS[pid]}</span>
              <select
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={obsForm.pillars[pid] ?? ""}
                data-testid={`select-observed-${pid}`}
                onChange={(e) => {
                  const v = e.target.value;
                  setObsForm((f) => {
                    const pillars = { ...f.pillars };
                    if (v === "") delete pillars[pid];
                    else pillars[pid] = v;
                    return { ...f, pillars };
                  });
                }}
              >
                {SCORE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "" ? "—" : s}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Input
            type="date"
            value={obsForm.observedAt}
            onChange={(e) => setObsForm((f) => ({ ...f, observedAt: e.target.value }))}
            data-testid="input-observed-at"
          />
          <Input
            placeholder="Source (e.g. portco_interview)"
            value={obsForm.source}
            onChange={(e) => setObsForm((f) => ({ ...f, source: e.target.value }))}
            data-testid="input-observed-source"
          />
          <Input
            placeholder="Note (optional)"
            value={obsForm.note}
            onChange={(e) => setObsForm((f) => ({ ...f, note: e.target.value }))}
            data-testid="input-observed-note"
          />
        </div>
        <Button
          size="sm"
          className="mt-2"
          disabled={addObservation.isPending || obsPillarCount === 0 || !obsForm.observedAt || !obsForm.source.trim()}
          onClick={() =>
            addObservation.mutate({
              companyId,
              data: {
                pillars: obsForm.pillars,
                observedAt: obsForm.observedAt,
                source: obsForm.source.trim(),
                note: obsForm.note.trim() || null,
              },
            })
          }
          data-testid="button-add-observation"
        >
          {addObservation.isPending ? "Saving…" : `Record observation (${obsPillarCount} pillar${obsPillarCount === 1 ? "" : "s"})`}
        </Button>
        {data.observations.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {data.observations.map((o) => (
              <li key={o.id} data-testid={`text-observation-${o.id}`}>
                {new Date(o.observedAt).toLocaleDateString()} · {o.source} ·{" "}
                {Object.entries(o.pillars)
                  .map(([k, v]) => `${PILLAR_LABELS[k] ?? k}=${v}`)
                  .join(", ")}
                {o.note ? ` · ${o.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Resolution events */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Resolution events (signals table)</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={evtForm.eventType}
            onChange={(e) => setEvtForm((f) => ({ ...f, eventType: e.target.value }))}
            data-testid="select-event-type"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={evtForm.eventDate}
            onChange={(e) => setEvtForm((f) => ({ ...f, eventDate: e.target.value }))}
            data-testid="input-event-date"
          />
          <Input
            placeholder="Source (e.g. press, linkedin)"
            value={evtForm.source}
            onChange={(e) => setEvtForm((f) => ({ ...f, source: e.target.value }))}
            data-testid="input-event-source"
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={evtForm.pillarId}
            onChange={(e) => setEvtForm((f) => ({ ...f, pillarId: e.target.value }))}
            data-testid="select-event-pillar"
          >
            {PILLAR_IDS.map((pid) => (
              <option key={pid} value={pid}>
                {PILLAR_LABELS[pid]}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={evtForm.verdict}
            onChange={(e) => setEvtForm((f) => ({ ...f, verdict: e.target.value }))}
            data-testid="select-event-verdict"
          >
            <option value="confirms">Confirms prediction</option>
            <option value="contradicts">Contradicts prediction</option>
          </select>
          <Input
            placeholder="One-line confirms/contradicts note"
            value={evtForm.note}
            onChange={(e) => setEvtForm((f) => ({ ...f, note: e.target.value }))}
            data-testid="input-event-note"
          />
        </div>
        <Button
          size="sm"
          className="mt-2"
          disabled={addEvent.isPending || !evtForm.eventDate || !evtForm.source.trim() || !evtForm.note.trim()}
          onClick={() =>
            addEvent.mutate({
              companyId,
              data: {
                eventType: evtForm.eventType as (typeof EVENT_TYPES)[number]["value"],
                eventDate: evtForm.eventDate,
                source: evtForm.source.trim(),
                pillarId: evtForm.pillarId,
                verdict: evtForm.verdict as "confirms" | "contradicts",
                note: evtForm.note.trim(),
              },
            })
          }
          data-testid="button-add-event"
        >
          {addEvent.isPending ? "Saving…" : "Record resolution event"}
        </Button>
        {data.resolutionEvents.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {data.resolutionEvents.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2" data-testid={`row-event-${ev.id}`}>
                <span className="flex-1 text-muted-foreground">
                  {ev.eventDate ?? "undated"} · {ev.eventType} · {PILLAR_LABELS[ev.pillarId] ?? ev.pillarId} ·{" "}
                  <span className={ev.verdict === "contradicts" ? "text-destructive" : "text-emerald-500"}>
                    {ev.verdict}
                  </span>{" "}
                  · {ev.source} · {ev.note}
                </span>
                <button
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEvent.mutate({ signalId: ev.id })}
                  aria-label="Delete resolution event"
                  data-testid={`button-delete-event-${ev.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Company list ────────────────────────────────────────────────────────────

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
        <TableCell className="w-8">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={3} className="bg-muted/30 p-0">
            <CalibrationEditor companyId={companyId} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AdminCalibration() {
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isLoading } = useListAdminTierSummary({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-page-title">
          Calibration Ledger
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Predicted vs Observed vs Delta for Stage 1 diagnostics, plus resolution events. Locked
          prediction snapshots are immutable. Internal only: never rendered on tenant pages, client
          reports, or exported PDFs.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading companies…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead className="w-8" />
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
                    onToggle={() => setOpenId((v) => (v === row.companyId ? null : row.companyId))}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page + 1} of {pageCount} · {total} companies
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
