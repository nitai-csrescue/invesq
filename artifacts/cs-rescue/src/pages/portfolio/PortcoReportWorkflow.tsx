import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  FileText,
  ShieldCheck,
  Download,
  MoreVertical,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ApiError,
  useGetAdminCompanyReportData,
  getGetAdminCompanyReportDataQueryKey,
  useGenerateAdminCompanyReportExport,
  useSaveAdminCompanyReportRevision,
  useValidateAdminCompanyReport,
  useShipAdminCompanyReportToDrive,
} from "@workspace/api-client-react";
import type {
  AdminCompanyReportData,
  AdminReportWorkflow,
  ReportRevisionInput,
  ReportValidator,
} from "@workspace/api-client-react";

const TEXTAREA = "bg-white text-gray-900 border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-300";

// ---------------------------------------------------------------------------
// PortcoNarrativeEditor — inline editor with explicit dark text so it reads
// on the portco page's light background (no CSS variable dependency).
// ---------------------------------------------------------------------------
function PortcoNarrativeEditor({
  report,
  saving,
  onCancel,
  onSave,
}: {
  report: AdminCompanyReportData;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: ReportRevisionInput) => void;
}) {
  const { reportData } = report;
  const [execSummary, setExecSummary] = useState(reportData.execSummary.join("\n\n"));
  const [compositeContext, setCompositeContext] = useState(reportData.compositeContext ?? "");
  const [existingSystems, setExistingSystems] = useState(reportData.existingSystems ?? "");
  const [pathForward, setPathForward] = useState(reportData.pathForward ?? "");
  const [nextSteps, setNextSteps] = useState(reportData.nextSteps.join("\n"));
  const [gaps, setGaps] = useState(
    reportData.gaps.map((g) => ({
      title: g.title,
      impact: g.impact ?? "",
      recommendation: g.recommendation ?? "",
    }))
  );

  const setGapField = (i: number, field: "impact" | "recommendation", value: string) =>
    setGaps((prev) => prev.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));

  const handleSave = () => {
    const input: ReportRevisionInput = {
      execSummary: execSummary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      compositeContext: compositeContext.trim(),
      existingSystems: existingSystems.trim(),
      pathForward: pathForward.trim(),
      nextSteps: nextSteps.split(/\n/).map((s) => s.trim()).filter(Boolean),
      gaps: gaps.map((g) => ({
        title: g.title,
        impact: g.impact.trim(),
        recommendation: g.recommendation.trim(),
      })),
    };
    onSave(input);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Edit narrative</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Scores, tier, gap titles, and evidence stay computed. Saving resets any prior sign-offs.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} className="text-gray-700">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pc-exec-summary" className="text-gray-800">Executive summary</Label>
        <p className="text-[11px] text-slate-500">Separate paragraphs with a blank line.</p>
        <Textarea id="pc-exec-summary" value={execSummary} onChange={(e) => setExecSummary(e.target.value)} rows={6} className={TEXTAREA} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pc-composite-context" className="text-gray-800">Composite context</Label>
        <Textarea id="pc-composite-context" value={compositeContext} onChange={(e) => setCompositeContext(e.target.value)} rows={3} className={TEXTAREA} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pc-existing-systems" className="text-gray-800">Existing systems</Label>
        <Textarea id="pc-existing-systems" value={existingSystems} onChange={(e) => setExistingSystems(e.target.value)} rows={3} className={TEXTAREA} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pc-path-forward" className="text-gray-800">Path forward</Label>
        <Textarea id="pc-path-forward" value={pathForward} onChange={(e) => setPathForward(e.target.value)} rows={3} className={TEXTAREA} />
      </div>

      {gaps.length > 0 && (
        <div className="space-y-3">
          <Label className="text-gray-800">Identified gaps</Label>
          {gaps.map((gap, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-sm font-medium text-gray-900">{gap.title}</div>
              <div className="space-y-1.5">
                <Label htmlFor={`pc-gap-impact-${i}`} className="text-xs text-slate-600">Impact</Label>
                <Textarea id={`pc-gap-impact-${i}`} value={gap.impact} onChange={(e) => setGapField(i, "impact", e.target.value)} rows={2} className={TEXTAREA} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`pc-gap-rec-${i}`} className="text-xs text-slate-600">Recommendation</Label>
                <Textarea id={`pc-gap-rec-${i}`} value={gap.recommendation} onChange={(e) => setGapField(i, "recommendation", e.target.value)} rows={2} className={TEXTAREA} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pc-next-steps" className="text-gray-800">Next steps</Label>
        <p className="text-[11px] text-slate-500">One step per line.</p>
        <Textarea id="pc-next-steps" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} rows={5} className={TEXTAREA} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="text-gray-700">Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save revision
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ValidatorStatusStrip — shows each validator's sign-off state as a chip.
// The "override" link appears for the OTHER validator (when they haven't
// signed) only if the current user HAS signed and onOverride is provided.
// ---------------------------------------------------------------------------
function ValidatorStatusStrip({
  validators,
  currentUserEmail,
  onOverride,
}: {
  validators: ReportValidator[];
  currentUserEmail: string | null;
  onOverride?: (email: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {validators.map((v) => {
        const isOverrider = !!v.overrideFor;
        let chipCls: string;
        let statusLabel: string;
        if (v.hasValidated && isOverrider) {
          chipCls = "bg-amber-50 border-amber-200 text-amber-700";
          statusLabel = "override";
        } else if (v.hasValidated) {
          chipCls = "bg-emerald-50 border-emerald-200 text-emerald-700";
          statusLabel = "signed";
        } else {
          chipCls = "bg-slate-50 border-slate-200 text-slate-500";
          statusLabel = "pending";
        }
        const isOtherAndPending = v.email !== currentUserEmail && !v.hasValidated;
        return (
          <div
            key={v.email}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${chipCls}`}
          >
            <span className="font-medium">{v.name}</span>
            <span className="opacity-70">{statusLabel}</span>
            {isOtherAndPending && onOverride && (
              <button
                onClick={() => onOverride(v.email)}
                className="ml-0.5 underline underline-offset-2 opacity-80 hover:opacity-100 text-xs"
                title={`Override ${v.name}'s missing sign-off`}
              >
                override
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverrideModal — collect a mandatory typed reason before submitting.
// ---------------------------------------------------------------------------
function OverrideModal({
  open,
  targetValidator,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  targetValidator: ReportValidator | null;
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Override sign-off</DialogTitle>
          <DialogDescription className="text-slate-600">
            Waive {targetValidator?.name ?? "the other validator"}&apos;s missing sign-off and unlock the client PDF.
            A typed justification is required and will appear in the PDF stamp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="override-reason" className="text-sm text-gray-800">Reason</Label>
          <Textarea
            id="override-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            placeholder="e.g. Could not reach before deadline; approving on their behalf"
            className={TEXTAREA}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading} className="text-gray-700">
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={loading || !reason.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Confirm override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// PortcoReportWorkflow — admin-only single-button state machine at the
// bottom of the portco page. Hidden entirely for non-@csrescue.com users.
//
//   State A  no revision          "Export editable report" -> generate + edit
//   State B  revision, pending    sign-off strip + "Sign off" / override
//   State C  validated            "Export PDF" -> ship + download
// ---------------------------------------------------------------------------
export function PortcoReportWorkflow({
  firmSlug,
  companySlug,
}: {
  firmSlug: string;
  companySlug: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const userEmail = user?.email?.toLowerCase() ?? null;
  const isAdminUser = !!userEmail && userEmail.endsWith("@csrescue.com");

  useEffect(() => {
    if (!isAdminUser) return;
    let cancelled = false;
    fetch(
      `/api/admin/companies/resolve?firmSlug=${encodeURIComponent(firmSlug)}&companySlug=${encodeURIComponent(companySlug)}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((body: { companyId?: number }) => {
        if (cancelled) return;
        if (body.companyId) setCompanyId(body.companyId);
        else setResolveError(true);
      })
      .catch(() => { if (!cancelled) setResolveError(true); });
    return () => { cancelled = true; };
  }, [isAdminUser, firmSlug, companySlug]);

  const queryKey = companyId != null ? getGetAdminCompanyReportDataQueryKey(companyId) : [];

  const { data, isFetching } = useGetAdminCompanyReportData(companyId ?? 0, {
    query: { queryKey, enabled: companyId != null },
  });

  const setWorkflow = (updated: AdminReportWorkflow) => {
    if (companyId != null) queryClient.setQueryData(queryKey, updated);
  };

  // When deep-linked from /admin/reports (URL ends #diagnostic-report), scroll
  // this section into view once its data has rendered. wouter ignores the hash,
  // so we read it off window.location; the real scroll container is the shell's
  // inner <main>, which scrollIntoView() walks up to on its own.
  const didScrollToReport = useRef(false);
  useEffect(() => {
    if (didScrollToReport.current) return;
    if (window.location.hash !== "#diagnostic-report") return;
    if (!isAdminUser || companyId == null || isFetching || !data) return;
    didScrollToReport.current = true;
    requestAnimationFrame(() => {
      document
        .getElementById("diagnostic-report")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [isAdminUser, companyId, isFetching, data]);

  const generateMutation = useGenerateAdminCompanyReportExport({
    mutation: {
      onSuccess: () => {
        if (companyId != null) queryClient.invalidateQueries({ queryKey });
        setIsEditing(true);
        toast({ title: "Report generated", description: "Edit the narrative then save to create a revision." });
      },
      onError: () =>
        toast({ title: "Generation failed", description: "Could not generate the AI narrative.", variant: "destructive" }),
    },
  });

  const saveMutation = useSaveAdminCompanyReportRevision({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        setIsEditing(false);
        toast({ title: "Revision saved", description: "Prior sign-offs were reset - re-validate to unlock the client PDF." });
      },
      onError: () =>
        toast({ title: "Save failed", description: "Could not save this revision.", variant: "destructive" }),
    },
  });

  const validateMutation = useValidateAdminCompanyReport({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        toast({
          title: workflow.validation.isValidated ? "Report validated" : "Sign-off recorded",
          description: workflow.validation.isValidated
            ? "All sign-offs collected - the client PDF is unlocked."
            : `${workflow.validation.validatedCount}/${workflow.validation.requiredCount} sign-offs recorded.`,
        });
      },
      onError: (err) => {
        const status = err instanceof ApiError ? err.status : undefined;
        toast({
          title: "Validation failed",
          description:
            status === 403 ? "You are not a configured validator."
            : status === 404 ? "No revision to validate. Save the report first."
            : status === 409 ? "Revision changed - reload and try again."
            : "Could not record sign-off. Try again.",
          variant: "destructive",
        });
        if (status === 409 && companyId != null) queryClient.invalidateQueries({ queryKey });
      },
    },
  });

  const shipMutation = useShipAdminCompanyReportToDrive({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        toast({ title: "Shipped to Google Drive", description: workflow.shipment.folderPath ?? "Uploaded successfully." });
      },
      onError: (err) => {
        const status = err instanceof ApiError ? err.status : undefined;
        toast({
          title: "Delivery failed",
          description:
            status === 412 ? "Report must be fully validated before shipping."
            : "Google Drive upload failed. Check the Drive connection.",
          variant: "destructive",
        });
      },
    },
  });

  if (!isAdminUser || resolveError) return null;
  if (companyId == null || (isFetching && !data)) {
    return (
      <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading report workflow...
      </div>
    );
  }
  if (!data) return null;

  const { revision, validation, shipment } = data;
  const hasRevision = revision.hasRevision;
  const isValidated = validation.isValidated;
  const isCurrentUserValidator = validation.validators.some((v) => v.email === userEmail);
  const currentUserHasSigned = validation.validators.find((v) => v.email === userEmail)?.hasValidated ?? false;
  const pendingOthers = validation.validators.filter((v) => v.email !== userEmail && !v.hasValidated);

  const handleGenerate = () => { if (companyId != null) generateMutation.mutate({ id: companyId }); };
  const handleSave = (input: ReportRevisionInput) => { if (companyId != null) saveMutation.mutate({ id: companyId, data: input }); };

  const handleSignOff = () => {
    const revisionId = revision.revisionId;
    if (companyId != null && revisionId != null)
      validateMutation.mutate({ id: companyId, data: { revisionId } });
  };

  const handleOverrideSubmit = () => {
    const revisionId = revision.revisionId;
    if (companyId != null && revisionId != null && overrideTarget && overrideReason.trim()) {
      validateMutation.mutate({
        id: companyId,
        data: { revisionId, overrideFor: overrideTarget, overrideReason: overrideReason.trim() },
      });
      setOverrideOpen(false);
      setOverrideReason("");
    }
  };

  const downloadPdfBlob = async () => {
    if (companyId == null) return;
    const response = await fetch(`/api/admin/companies/${companyId}/report-pdf`, { credentials: "include" });
    if (!response.ok) {
      let description = "Could not download the PDF. Try again.";
      try {
        const body = await response.json() as { error?: string };
        if (body.error) description = body.error;
      } catch { /* ignore parse errors */ }
      toast({ title: "Download failed", description, variant: "destructive" });
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const filenameMatch = /filename="([^"]+)"/.exec(disposition);
    const filename = filenameMatch?.[1] ?? "diagnostic-report.pdf";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (companyId == null) return;
    shipMutation.mutate({ id: companyId });
    setIsDownloadingPdf(true);
    try { await downloadPdfBlob(); } finally { setIsDownloadingPdf(false); }
  };

  const handleDownloadDraft = async () => {
    setIsDownloadingPdf(true);
    try { await downloadPdfBlob(); } finally { setIsDownloadingPdf(false); }
  };

  const revisionMeta = revision.createdAt
    ? `Saved ${new Date(revision.createdAt).toLocaleDateString()} by ${revision.editedByName ?? revision.editedByEmail ?? "unknown"}`
    : null;

  const kebab = hasRevision ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {revisionMeta && (
          <>
            <div className="px-2 py-1.5 text-[11px] text-slate-400">{revisionMeta}</div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleDownloadDraft} disabled={isDownloadingPdf}>
          <Download className="mr-2 h-3.5 w-3.5" /> Download draft PDF
        </DropdownMenuItem>
        {isValidated && (
          <DropdownMenuItem onClick={() => { if (companyId != null) shipMutation.mutate({ id: companyId }); }} disabled={shipMutation.isPending}>
            Re-ship to Drive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setIsEditing(true)}>
          Edit narrative
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (isEditing) {
    return (
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5" aria-label="Report editor">
        <PortcoNarrativeEditor
          key={data.revision.revisionId ?? data.report.meta.generatedAt ?? "base"}
          report={data.report}
          saving={saveMutation.isPending}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      </section>
    );
  }

  if (!hasRevision) {
    return (
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Diagnostic Report</h2>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Admin only</span>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          No validated report yet. Generate the AI narrative, edit, then sign off to unlock the client PDF.
        </p>
        <Button size="sm" onClick={handleGenerate} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          {generateMutation.isPending ? "Generating..." : "Export editable report"}
        </Button>
      </section>
    );
  }

  if (!isValidated) {
    return (
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Diagnostic Report</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Admin only</span>
            {kebab}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Draft PDF available for internal review via the menu above. The client PDF is locked until all reviewers sign off -- use the override control on a pending signer's chip to bypass.
        </p>

        <ValidatorStatusStrip
          validators={validation.validators}
          currentUserEmail={userEmail}
          onOverride={
            currentUserHasSigned && pendingOthers.length > 0
              ? (email) => { setOverrideTarget(email); setOverrideOpen(true); }
              : undefined
          }
        />

        {isCurrentUserValidator && !currentUserHasSigned && (
          <Button size="sm" onClick={handleSignOff} disabled={validateMutation.isPending}>
            {validateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Sign off
          </Button>
        )}

        {currentUserHasSigned && pendingOthers.length > 0 && (
          <p className="text-sm text-slate-500">
            Waiting for {pendingOthers.map((v) => v.name).join(", ")} to sign off.
          </p>
        )}

        <OverrideModal
          open={overrideOpen}
          targetValidator={validation.validators.find((v) => v.email === overrideTarget) ?? null}
          reason={overrideReason}
          onReasonChange={setOverrideReason}
          onCancel={() => { setOverrideOpen(false); setOverrideReason(""); }}
          onConfirm={handleOverrideSubmit}
          loading={validateMutation.isPending}
        />
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-emerald-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Diagnostic Report</h2>
          <p className="mt-0.5 text-xs text-emerald-600">Validated - ready for delivery</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Admin only</span>
          {kebab}
        </div>
      </div>

      <ValidatorStatusStrip validators={validation.validators} currentUserEmail={userEmail} />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleExportPdf} disabled={shipMutation.isPending || isDownloadingPdf}>
          {shipMutation.isPending || isDownloadingPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Export PDF
        </Button>
        {shipment.isCurrent && shipment.webViewLink && (
          <a
            href={shipment.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <ExternalLink className="h-3 w-3" /> View in Drive
          </a>
        )}
      </div>
    </section>
  );
}
