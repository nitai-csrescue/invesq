import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ClipboardCopy,
  Check,
  Sparkles,
  Download,
  Pencil,
  ShieldCheck,
  CloudUpload,
  ExternalLink,
  X,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
} from "@workspace/api-client-react";
import { AdminReportPreview } from "./AdminReportPreview";

function statusOf(err: unknown): number | undefined {
  return err instanceof ApiError ? err.status : undefined;
}

function formatWhen(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// ---------------------------------------------------------------------------
// NarrativeEditor — a controlled form over the report's editable NARRATIVE
// sections only. Re-mounts (and re-seeds its local state) whenever its `key`
// changes in the parent, so a save/regenerate always reflects fresh data.
// ---------------------------------------------------------------------------
function NarrativeEditor({
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

  const setGapField = (index: number, field: "impact" | "recommendation", value: string) => {
    setGaps((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const handleSave = () => {
    const input: ReportRevisionInput = {
      execSummary: execSummary
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      compositeContext: compositeContext.trim(),
      existingSystems: existingSystems.trim(),
      pathForward: pathForward.trim(),
      nextSteps: nextSteps
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      gaps: gaps.map((g) => ({
        title: g.title,
        impact: g.impact.trim(),
        recommendation: g.recommendation.trim(),
      })),
    };
    onSave(input);
  };

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-white p-5 text-gray-900" data-testid="narrative-editor">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Edit narrative</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Only the narrative below is editable. Scores, tier, gap titles, and pillar evidence stay computed. Saving
            creates a new revision and resets any prior validations.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} data-testid="button-cancel-edit">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-exec-summary">Executive summary</Label>
        <p className="text-[11px] text-muted-foreground">Separate paragraphs with a blank line.</p>
        <Textarea
          id="edit-exec-summary"
          value={execSummary}
          onChange={(e) => setExecSummary(e.target.value)}
          rows={6}
          data-testid="input-exec-summary"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-composite-context">Composite context</Label>
        <Textarea
          id="edit-composite-context"
          value={compositeContext}
          onChange={(e) => setCompositeContext(e.target.value)}
          rows={3}
          data-testid="input-composite-context"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-existing-systems">Existing systems</Label>
        <Textarea
          id="edit-existing-systems"
          value={existingSystems}
          onChange={(e) => setExistingSystems(e.target.value)}
          rows={3}
          data-testid="input-existing-systems"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-path-forward">Path forward</Label>
        <Textarea
          id="edit-path-forward"
          value={pathForward}
          onChange={(e) => setPathForward(e.target.value)}
          rows={3}
          data-testid="input-path-forward"
        />
      </div>

      {gaps.length > 0 && (
        <div className="space-y-3">
          <Label>Identified gaps</Label>
          {gaps.map((gap, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-sm font-medium text-foreground">{gap.title}</div>
              <div className="space-y-1.5">
                <Label htmlFor={`edit-gap-impact-${i}`} className="text-xs text-muted-foreground">
                  Impact
                </Label>
                <Textarea
                  id={`edit-gap-impact-${i}`}
                  value={gap.impact}
                  onChange={(e) => setGapField(i, "impact", e.target.value)}
                  rows={2}
                  data-testid={`input-gap-impact-${i}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`edit-gap-recommendation-${i}`} className="text-xs text-muted-foreground">
                  Recommendation
                </Label>
                <Textarea
                  id={`edit-gap-recommendation-${i}`}
                  value={gap.recommendation}
                  onChange={(e) => setGapField(i, "recommendation", e.target.value)}
                  rows={2}
                  data-testid={`input-gap-recommendation-${i}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="edit-next-steps">Next steps</Label>
        <p className="text-[11px] text-muted-foreground">One step per line.</p>
        <Textarea
          id="edit-next-steps"
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          rows={5}
          data-testid="input-next-steps"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} data-testid="button-save-revision">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save revision
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ValidationPanel — dual sign-off state + the validate action.
// ---------------------------------------------------------------------------
function ValidationPanel({
  workflow,
  onValidate,
  validating,
}: {
  workflow: AdminReportWorkflow;
  onValidate: () => void;
  validating: boolean;
}) {
  const { validation, revision } = workflow;

  let statusLabel: string;
  let statusClass: string;
  if (!validation.configured) {
    statusLabel = "Validation not configured";
    statusClass = "border-border bg-background/60 text-muted-foreground";
  } else if (validation.isValidated) {
    statusLabel = "Validated";
    statusClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  } else if (validation.validatedCount > 0) {
    statusLabel = `${validation.validatedCount}/${validation.requiredCount} waiting`;
    statusClass = "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  } else {
    statusLabel = `${validation.validatedCount}/${validation.requiredCount}`;
    statusClass = "border-border bg-background/60 text-muted-foreground";
  }

  const canValidate =
    validation.configured && revision.hasRevision && revision.revisionId != null && !revision.isStale;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5" data-testid="validation-panel">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Dual validation
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusClass}`}
          data-testid="badge-validation-status"
        >
          {statusLabel}
        </span>
      </div>

      {!validation.configured ? (
        <p className="text-xs text-muted-foreground">
          No validators are configured (VALIDATOR_EMAILS is unset), so the client PDF stays locked. Set the
          environment variable to enable dual sign-off.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {validation.validators.map((v) => (
              <span
                key={v.email}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  v.hasValidated
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-background/60 text-muted-foreground"
                }`}
                title={v.email}
                data-testid={`chip-validator-${v.email}`}
              >
                {v.hasValidated ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-current opacity-40" />}
                {v.name}
              </span>
            ))}
          </div>

          {!revision.hasRevision && (
            <p className="text-xs text-muted-foreground">
              Save an edit to create the revision that validators sign off on.
            </p>
          )}
          {revision.isStale && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This revision predates the current report format. Re-save the narrative before validating.
            </p>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onValidate}
            disabled={!canValidate || validating}
            data-testid="button-validate"
          >
            {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Sign off on this revision
          </Button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeliveryPanel — ship the validated PDF to Google Drive + shipment status.
// ---------------------------------------------------------------------------
function DeliveryPanel({
  workflow,
  onShip,
  shipping,
}: {
  workflow: AdminReportWorkflow;
  onShip: () => void;
  shipping: boolean;
}) {
  const { validation, shipment } = workflow;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5" data-testid="delivery-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CloudUpload className="h-4 w-4 text-primary" /> Deliver to Google Drive
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Uploads the stamped client PDF to "INVESQ Customers/{"{Firm}"}/{"{Company}"}/". Available only once the
            current revision is fully validated.
          </p>
        </div>
        <Button size="sm" onClick={onShip} disabled={!validation.isValidated || shipping} data-testid="button-ship-drive">
          {shipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
          {shipment.shipped ? "Ship again" : "Ship to Drive"}
        </Button>
      </div>

      {shipment.shipped && (
        <div className="space-y-1 rounded-lg border border-border bg-background/60 p-3 text-xs" data-testid="shipment-status">
          <div className="flex items-center gap-2 text-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-medium">Shipped</span>
            {shipment.shippedByName ? <span className="text-muted-foreground">by {shipment.shippedByName}</span> : null}
            {shipment.shippedAt ? <span className="text-muted-foreground">· {formatWhen(shipment.shippedAt)}</span> : null}
          </div>
          {shipment.folderPath && <div className="text-muted-foreground">{shipment.folderPath}</div>}
          {shipment.webViewLink && (
            <a
              href={shipment.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
              data-testid="link-drive-file"
            >
              <ExternalLink className="h-3 w-3" /> Open in Google Drive
            </a>
          )}
          {!shipment.isCurrent && (
            <p className="text-amber-600 dark:text-amber-400">
              A newer revision exists. Re-ship to deliver the latest validated version.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportWorkflowPanel — the full per-company editor / validation / delivery
// surface. Shared by ExportPanel (with a company picker) and the deep-linkable
// /admin/reports/:companyId page.
// ---------------------------------------------------------------------------
export function ReportWorkflowPanel({ companyId }: { companyId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasSelectedId = Number.isInteger(companyId) && companyId > 0;
  const queryKey = getGetAdminCompanyReportDataQueryKey(companyId);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const { data, isFetching, isError } = useGetAdminCompanyReportData(companyId, {
    query: { queryKey, enabled: hasSelectedId },
  });

  const setWorkflow = (workflow: AdminReportWorkflow) => {
    queryClient.setQueryData(queryKey, workflow);
  };

  const generateMutation = useGenerateAdminCompanyReportExport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Narrative generated", description: "AI-written report sections are ready." });
      },
      onError: () => {
        toast({
          title: "Generation failed",
          description: "Could not generate the AI narrative for this company.",
          variant: "destructive",
        });
      },
    },
  });

  const saveMutation = useSaveAdminCompanyReportRevision({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        setIsEditing(false);
        toast({
          title: "Revision saved",
          description: "Prior validations were reset — the new revision must be re-validated.",
        });
      },
      onError: () => {
        toast({
          title: "Save failed",
          description: "Could not save this narrative revision.",
          variant: "destructive",
        });
      },
    },
  });

  const validateMutation = useValidateAdminCompanyReport({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        toast({
          title: workflow.validation.isValidated ? "Report validated" : "Sign-off recorded",
          description: workflow.validation.isValidated
            ? "All validators have signed off — the client PDF is unlocked."
            : `${workflow.validation.validatedCount}/${workflow.validation.requiredCount} validators have signed off.`,
        });
      },
      onError: (err) => {
        const status = statusOf(err);
        const description =
          status === 503
            ? "Validation is not configured on the server (no validators set)."
            : status === 403
              ? "Your account is not on the validator list."
              : status === 409
                ? "This revision changed since it loaded — reloading the latest."
                : status === 404
                  ? "No saved revision to validate — save an edit first."
                  : "Could not record your sign-off. Try again.";
        if (status === 409) queryClient.invalidateQueries({ queryKey });
        toast({ title: "Validation failed", description, variant: "destructive" });
      },
    },
  });

  const shipMutation = useShipAdminCompanyReportToDrive({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        toast({
          title: "Shipped to Google Drive",
          description: workflow.shipment.folderPath
            ? `Uploaded to ${workflow.shipment.folderPath}.`
            : "The validated PDF was uploaded to Google Drive.",
        });
      },
      onError: (err) => {
        const status = statusOf(err);
        const description =
          status === 412
            ? "The report must be fully validated before it can be shipped."
            : status === 502
              ? "Google Drive upload failed. Check the connection and try again."
              : "Could not ship the report to Google Drive.";
        toast({ title: "Delivery failed", description, variant: "destructive" });
      },
    },
  });

  const handleGenerate = () => {
    if (hasSelectedId) generateMutation.mutate({ id: companyId });
  };

  const handleSave = (input: ReportRevisionInput) => {
    if (hasSelectedId) saveMutation.mutate({ id: companyId, data: input });
  };

  const handleValidate = () => {
    const revisionId = data?.revision.revisionId;
    if (hasSelectedId && revisionId != null) {
      validateMutation.mutate({ id: companyId, data: { revisionId } });
    }
  };

  const handleShip = () => {
    if (hasSelectedId) shipMutation.mutate({ id: companyId });
  };

  const report = data?.report;
  const json = report ? JSON.stringify(report.reportData, null, 2) : "";
  const prompt = report
    ? `Fill report-data.json with this data and export the Diagnostic Report to PDF:\n\n${json}`
    : "";

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      toast({ title: "Copied", description: "Prompt copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadPdf = async () => {
    if (!hasSelectedId) return;
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/report-pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: "Narrative not generated yet",
            description: "Generate the AI narrative before downloading the branded PDF.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Download failed",
            description: "Could not render the Diagnostic Report PDF for this company.",
            variant: "destructive",
          });
        }
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = /filename="([^"]+)"/.exec(disposition);
      const filename = filenameMatch?.[1] ?? "diagnostic-report.pdf";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not render the Diagnostic Report PDF for this company.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!hasSelectedId) return null;

  if (isFetching && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-export-loading">
        <Loader2 className="h-4 w-4 animate-spin" /> Assembling report data…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive" data-testid="text-export-error">
        Failed to assemble report data for this company.
      </p>
    );
  }

  const isValidated = data.validation.isValidated;
  const downloadLabel = isValidated ? "Download client PDF" : "Download draft PDF";

  return (
    <div className="space-y-4" data-testid="report-workflow">
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {data.report.meta.generatedAt
            ? "AI narrative sections are generated and included in the report below."
            : "Executive summary, gaps, and next steps are still blank — generate the AI narrative to fill them in before exporting."}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing((v) => !v)}
            disabled={generateMutation.isPending}
            data-testid="button-toggle-edit"
          >
            <Pencil className="h-3.5 w-3.5" /> {isEditing ? "Close editor" : "Edit narrative"}
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generateMutation.isPending} data-testid="button-generate-narrative">
            {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {data.report.meta.generatedAt ? "Regenerate narrative" : "Generate narrative"}
          </Button>
        </div>
      </div>

      {generateMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-generate-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating AI narrative — this can take up to 30 seconds…
        </div>
      )}

      {isEditing ? (
        <NarrativeEditor
          key={data.revision.revisionId ?? data.report.meta.generatedAt ?? "base"}
          report={data.report}
          saving={saveMutation.isPending}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      ) : (
        <AdminReportPreview data={data.report} />
      )}

      <ValidationPanel workflow={data} onValidate={handleValidate} validating={validateMutation.isPending} />

      <DeliveryPanel workflow={data} onShip={handleShip} shipping={shipMutation.isPending} />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          data-testid="button-download-pdf"
        >
          {isDownloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloadLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopy} data-testid="button-copy-export-prompt">
          {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
          Copy prompt
        </Button>
      </div>
    </div>
  );
}
