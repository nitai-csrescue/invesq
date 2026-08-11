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
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useUpdateAdminCompanyArr,
  useUpdateAdminCompanyPillarEvidence,
  useUpdateAdminCompanyReportMeta,
  useValidateAdminCompanyReport,
  useShipAdminCompanyReportToDrive,
} from "@workspace/api-client-react";
import type {
  AdminCompanyReportData,
  AdminReportWorkflow,
  ReportRevisionInput,
  ReportValidator,
  UpdatePillarEvidenceInput,
  UpdateReportMetaInput,
} from "@workspace/api-client-react";

const TEXTAREA = "bg-white text-gray-900 border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-300";

// ---------------------------------------------------------------------------
// CoverMetaCard — inline display + edit of the report cover's Prepared For /
// Prepared By fields. Saving persists per-company (companies row) WITHOUT
// creating a revision or resetting sign-offs, so it renders in every
// non-editing workflow state. onSave must reject on failure so the editor
// stays open with the user's input intact.
// ---------------------------------------------------------------------------
function CoverMetaCard({
  report,
  saving,
  onSave,
}: {
  report: AdminCompanyReportData;
  saving: boolean;
  onSave: (input: UpdateReportMetaInput) => Promise<unknown>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [forName, setForName] = useState("");
  const [forTitle, setForTitle] = useState("");
  const [forCompany, setForCompany] = useState("");
  const [byName, setByName] = useState("");
  const [byOrg, setByOrg] = useState("");
  const [byDate, setByDate] = useState("");

  const startEditing = () => {
    setForName(report.reportData.preparedForName);
    setForTitle(report.reportData.preparedForTitle);
    setForCompany(report.meta.preparedForCompanyOverride ?? "");
    setByName(report.meta.preparedByName);
    setByOrg(report.meta.preparedByOrg);
    setByDate(report.reportData.reportDate);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await onSave({
        preparedForName: forName,
        preparedForTitle: forTitle,
        preparedForCompany: forCompany,
        preparedByName: byName,
        preparedByOrg: byOrg,
        // Empty date must go as null: the API's YYYY-MM-DD pattern rejects "".
        preparedByDate: byDate.trim() === "" ? null : byDate,
      });
      setIsEditing(false);
    } catch {
      // Error toast comes from the mutation config; keep the editor open.
    }
  };

  const INPUT = "h-8 text-sm bg-white text-gray-900 border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-300";

  if (isEditing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Report cover</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-500">Prepared For</p>
            <div className="space-y-1">
              <Label htmlFor="pc-meta-for-name" className="text-[11px] text-slate-600">Name</Label>
              <Input id="pc-meta-for-name" value={forName} onChange={(e) => setForName(e.target.value)} placeholder="Recipient name" className={INPUT} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pc-meta-for-title" className="text-[11px] text-slate-600">Title</Label>
              <Input id="pc-meta-for-title" value={forTitle} onChange={(e) => setForTitle(e.target.value)} placeholder="Recipient title" className={INPUT} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pc-meta-for-company" className="text-[11px] text-slate-600">Company</Label>
              <Input id="pc-meta-for-company" value={forCompany} onChange={(e) => setForCompany(e.target.value)} placeholder={report.reportData.companyName} className={INPUT} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-500">Prepared By</p>
            <div className="space-y-1">
              <Label htmlFor="pc-meta-by-name" className="text-[11px] text-slate-600">Name</Label>
              <Input id="pc-meta-by-name" value={byName} onChange={(e) => setByName(e.target.value)} placeholder="Preparer name" className={INPUT} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pc-meta-by-org" className="text-[11px] text-slate-600">Organization</Label>
              <Input id="pc-meta-by-org" value={byOrg} onChange={(e) => setByOrg(e.target.value)} placeholder="Organization" className={INPUT} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pc-meta-by-date" className="text-[11px] text-slate-600">Date</Label>
              <Input id="pc-meta-by-date" type="date" value={byDate} onChange={(e) => setByDate(e.target.value)} className={INPUT} />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save cover details
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={saving} className="text-slate-500">
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  const line = (label: string, value: string) => (
    <div className="flex items-baseline gap-1.5 text-xs">
      <span className="text-slate-400">{label}:</span>
      {value ? (
        <span className="text-slate-700">{value}</span>
      ) : (
        <span className="italic text-slate-300">Not set</span>
      )}
    </div>
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Report cover</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={startEditing}
          className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700"
        >
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-500">Prepared For</p>
          {line("Name", report.reportData.preparedForName)}
          {line("Title", report.reportData.preparedForTitle)}
          {line("Company", report.meta.preparedForCompany)}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-500">Prepared By</p>
          {line("Name", report.meta.preparedByName)}
          {line("Organization", report.meta.preparedByOrg)}
          {line("Date", report.reportData.reportDate)}
        </div>
      </div>
    </div>
  );
}

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
// PillarEvidenceEditor — inline editor for the raw pillar evidence text on
// the company's latest assessment, presented as the 4 consolidated rubric-v2
// pillars. Each field pre-merges the evidence text of its constituent v1
// pillars (blank-line separated) so no stored text is hidden or lost:
//
//   CS Org Design                   = P1 (Org Design) + P6 (CS Leadership)
//   Onboarding                      = P2 (unchanged)
//   Health Scoring                  = P3 (Health Scoring) + P4 (Escalation & Churn Mgmt)
//   Renewal & Expansion Forecasting = P5 (Revenue Motion) + P7 (Account Planning)
//   AI Adoption Maturity            = P8, kept standalone: rubric v2 drops it from
//                                     the 4-pillar rubric but the PDF renders its
//                                     evidence as an informational block, so it must
//                                     never be folded into Org Design storage.
//
// Saving persists to assessments.p{n}_evidence and mirrors into findings
// WITHOUT creating a revision or resetting sign-offs (same behavior class as
// the cover-meta save). For an EDITED field, the merged text is written to
// the primary column (p1/p2/p3/p5) and its non-empty secondary columns are
// cleared, making the consolidation permanent for that pillar. Untouched
// fields are not sent at all, so their stored values stay byte-for-byte
// (notably P6, whose display text is name-redacted).
// ---------------------------------------------------------------------------
const CONSOLIDATED_EVIDENCE_FIELDS: readonly {
  primaryKey: "p1" | "p2" | "p3" | "p5" | "p8";
  secondaryKeys: readonly ("p4" | "p6" | "p7")[];
  label: string;
  hint?: string;
}[] = [
  {
    primaryKey: "p1",
    secondaryKeys: ["p6"],
    label: "CS Org Design",
    hint: "Includes former CS Leadership evidence. Named individuals are shown redacted. Saving an edit permanently replaces the stored raw evidence with this text.",
  },
  { primaryKey: "p2", secondaryKeys: [], label: "Onboarding" },
  {
    primaryKey: "p3",
    secondaryKeys: ["p4"],
    label: "Health Scoring",
    hint: "Includes former Escalation & Churn Management evidence.",
  },
  {
    primaryKey: "p5",
    secondaryKeys: ["p7"],
    label: "Renewal & Expansion Forecasting",
    hint: "Includes former Revenue Motion and Account Planning evidence.",
  },
  {
    primaryKey: "p8",
    secondaryKeys: [],
    label: "AI Adoption Maturity (informational)",
    hint: "Tracked outside the 4-pillar rubric; shown as an informational signal on the report.",
  },
] as const;

type ConsolidatedPillarKey = (typeof CONSOLIDATED_EVIDENCE_FIELDS)[number]["primaryKey"];

/** Merge non-empty evidence strings into one blob, blank-line separated. */
function mergeEvidence(parts: readonly (string | null | undefined)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function PillarEvidenceEditor({
  report,
  saving,
  onCancel,
  onSave,
}: {
  report: AdminCompanyReportData;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: UpdatePillarEvidenceInput) => void;
}) {
  const [initial] = useState<Record<ConsolidatedPillarKey, string>>(() => {
    const ev = report.reportData.pillarEvidence;
    return {
      p1: mergeEvidence([ev.p1, ev.p6]),
      p2: mergeEvidence([ev.p2]),
      p3: mergeEvidence([ev.p3, ev.p4]),
      p5: mergeEvidence([ev.p5, ev.p7]),
      p8: mergeEvidence([ev.p8]),
    };
  });
  const [values, setValues] = useState(initial);

  const setValue = (key: ConsolidatedPillarKey, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const input: UpdatePillarEvidenceInput = {};
    const ev = report.reportData.pillarEvidence;
    for (const { primaryKey, secondaryKeys } of CONSOLIDATED_EVIDENCE_FIELDS) {
      const trimmed = values[primaryKey].trim();
      if (trimmed === initial[primaryKey].trim()) continue;
      input[primaryKey] = trimmed === "" ? null : trimmed;
      // The merged text now lives in the primary column; clear constituent
      // columns that had content so a reload doesn't duplicate it.
      for (const sk of secondaryKeys) {
        if ((ev[sk] ?? "").trim() !== "") input[sk] = null;
      }
    }
    onSave(input);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Edit pillar evidence</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Evidence is the raw diagnostic source text for each rubric pillar, plus the informational
            AI Adoption signal. Edits update the scorecard note and gap description. Scores, tiers,
            and sign-offs are not affected.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} className="text-gray-700">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>

      {CONSOLIDATED_EVIDENCE_FIELDS.map(({ primaryKey, label, hint }) => (
        <div key={primaryKey} className="space-y-1.5">
          <Label htmlFor={`pc-evidence-${primaryKey}`} className="text-gray-800">{label}</Label>
          {hint && <p className="text-[11px] text-amber-600">{hint}</p>}
          <Textarea
            id={`pc-evidence-${primaryKey}`}
            value={values[primaryKey]}
            onChange={(e) => setValue(primaryKey, e.target.value)}
            rows={4}
            placeholder="No evidence on file"
            className={TEXTAREA}
          />
        </div>
      ))}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="text-gray-700">Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save evidence
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
// ArrEditDialog — CQ-47 manual ARR edit surface. Full-state write of the
// CQ-45 columns via PATCH /admin/companies/:id/arr. Clearing the ARR field
// (or "Clear all") nulls all three columns back to "Undisclosed" — never
// zero-filled. Does not touch scoring, revisions, or sign-offs.
// ---------------------------------------------------------------------------
function ArrEditDialog({
  open,
  initial,
  arrEstimateDisplay,
  saving,
  onCancel,
  onSave,
}: {
  open: boolean;
  initial: { arr: number | null; arrAsOf: string | null; arrSource: string | null };
  /** Admin-only analytical estimate (meta.arrEstimateDisplay); read-only, never shown to investors. */
  arrEstimateDisplay?: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: { arr: number | null; arrAsOf: string | null; arrSource: string | null }) => void;
}) {
  const [arr, setArr] = useState("");
  const [asOf, setAsOf] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Re-seed the fields each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setArr(initial.arr != null ? String(initial.arr) : "");
    setAsOf(initial.arrAsOf ?? "");
    setSource(initial.arrSource ?? "");
    setError(null);
  }, [open, initial.arr, initial.arrAsOf, initial.arrSource]);

  const INPUT = "h-8 text-sm bg-white text-gray-900 border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-300";

  const handleSave = () => {
    const arrTrim = arr.trim();
    if (arrTrim === "") {
      // Empty ARR = clear everything, matching the "Undisclosed" convention.
      onSave({ arr: null, arrAsOf: null, arrSource: null });
      return;
    }
    const amount = Number(arrTrim.replace(/[,$\s]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      setError("ARR must be a non-negative dollar amount (whole US dollars).");
      return;
    }
    if (amount === 0) {
      // Zero is not a meaningful disclosure — same as clearing.
      onSave({ arr: null, arrAsOf: null, arrSource: null });
      return;
    }
    if (asOf.trim() !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(asOf.trim())) {
      setError("As-of date must be YYYY-MM-DD.");
      return;
    }
    setError(null);
    onSave({
      arr: Math.round(amount),
      arrAsOf: asOf.trim() === "" ? null : asOf.trim(),
      arrSource: source.trim() === "" ? null : source.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="bg-white text-gray-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Edit disclosed ARR</DialogTitle>
          <DialogDescription className="text-slate-500">
            Sets this company's disclosed ARR figure, its as-of date, and a source citation.
            Leaving ARR blank clears all three back to Undisclosed (excluded from rollups).
            Scores, tiers, and sign-offs are not affected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pc-arr-amount" className="text-[11px] text-slate-600">ARR (whole US dollars)</Label>
            <Input id="pc-arr-amount" inputMode="numeric" value={arr} onChange={(e) => setArr(e.target.value)} placeholder="e.g. 25000000" className={INPUT} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pc-arr-asof" className="text-[11px] text-slate-600">As of (YYYY-MM-DD)</Label>
            <Input id="pc-arr-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={INPUT} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pc-arr-source" className="text-[11px] text-slate-600">Source citation</Label>
            <Input id="pc-arr-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Company press release, Jan 2026" maxLength={500} className={INPUT} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {arrEstimateDisplay && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-[11px] font-medium text-amber-800">
                Estimated ARR (internal only, not shown to investors)
              </div>
              <div className="font-mono text-sm text-amber-900">{arrEstimateDisplay}</div>
              <div className="text-[10px] text-amber-700">
                Modeled analytical estimate, not a disclosed figure. Tenant pages and reports keep showing
                &ldquo;Undisclosed&rdquo; unless a disclosed ARR is set above.
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {initial.arr != null && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 sm:mr-auto"
              onClick={() => onSave({ arr: null, arrAsOf: null, arrSource: null })}
              disabled={saving}
            >
              Clear all
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="text-gray-700">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save ARR
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
  arr = null,
  arrAsOf = null,
  arrSource = null,
}: {
  firmSlug: string;
  companySlug: string;
  /** CQ-47: current disclosed-ARR state (from the bootstrap company) used to pre-fill the Edit ARR dialog. */
  arr?: number | null;
  arrAsOf?: string | null;
  arrSource?: string | null;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingEvidence, setIsEditingEvidence] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isEditingArr, setIsEditingArr] = useState(false);
  // Local copy of the ARR state so the dialog re-opens with what was just
  // saved (the bootstrap props only refresh on a full page reload).
  const [arrState, setArrState] = useState({ arr, arrAsOf, arrSource });
  useEffect(() => { setArrState({ arr, arrAsOf, arrSource }); }, [arr, arrAsOf, arrSource]);
  // Admin-only analytical estimate (meta.arrEstimateDisplay), fetched from the
  // admin-gated route. Never part of the tenant bootstrap — investors can't see it.
  const [arrEstimate, setArrEstimate] = useState<string | null>(null);
  useEffect(() => {
    if (companyId == null) return;
    let cancelled = false;
    fetch(`/api/admin/companies/${companyId}/arr-estimate`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { arrEstimateDisplay?: string | null } | null) => {
        if (!cancelled) setArrEstimate(body?.arrEstimateDisplay ?? null);
      })
      .catch(() => { if (!cancelled) setArrEstimate(null); });
    return () => { cancelled = true; };
  }, [companyId]);

  const userEmail = user?.email?.toLowerCase() ?? null;
  const isAdminUser = !!userEmail && userEmail.endsWith("@csrescue.com");

  useEffect(() => {
    if (!isAdminUser) return;
    // Reset per-company state before resolving, so a reused component never
    // briefly shows the previous company's id or admin-only ARR estimate.
    setCompanyId(null);
    setArrEstimate(null);
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

  const metaMutation = useUpdateAdminCompanyReportMeta({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        toast({ title: "Cover details saved", description: "The report cover will use these on the next PDF export." });
      },
      onError: () =>
        toast({ title: "Save failed", description: "Could not save the cover details.", variant: "destructive" }),
    },
  });

  const evidenceMutation = useUpdateAdminCompanyPillarEvidence({
    mutation: {
      onSuccess: (workflow) => {
        setWorkflow(workflow);
        setIsEditingEvidence(false);
        toast({ title: "Pillar evidence saved", description: "Scorecard notes and gap descriptions now use the edited text." });
      },
      onError: () =>
        toast({ title: "Save failed", description: "Could not save the pillar evidence.", variant: "destructive" }),
    },
  });

  const arrMutation = useUpdateAdminCompanyArr({
    mutation: {
      onSuccess: (state) => {
        setArrState({ arr: state.arr, arrAsOf: state.arrAsOf, arrSource: state.arrSource });
        setIsEditingArr(false);
        toast({
          title: state.arr == null ? "ARR cleared" : "ARR saved",
          description:
            state.arr == null
              ? "This company is back to Undisclosed and excluded from ARR rollups."
              : "Reload the page to see the figure reflected across the portfolio views.",
        });
      },
      onError: (err) => {
        const serverError =
          err instanceof ApiError && err.data != null && typeof err.data === "object" &&
          "error" in err.data && typeof (err.data as { error?: unknown }).error === "string"
            ? (err.data as { error: string }).error
            : null;
        toast({ title: "Save failed", description: serverError ?? "Could not save the ARR figure.", variant: "destructive" });
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
        const serverError =
          err instanceof ApiError &&
          err.data != null &&
          typeof err.data === "object" &&
          "error" in err.data &&
          typeof (err.data as { error?: unknown }).error === "string"
            ? (err.data as { error: string }).error
            : null;
        toast({
          title: "Delivery failed",
          description:
            status === 412 ? "Report must be fully validated before shipping."
            : serverError && serverError.length > "Failed to ship report to Google Drive.".length
              ? serverError
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
  const handleSaveMeta = (input: UpdateReportMetaInput) => {
    if (companyId == null) return Promise.reject(new Error("No company"));
    return metaMutation.mutateAsync({ id: companyId, data: input });
  };
  const handleSaveEvidence = (input: UpdatePillarEvidenceInput) => {
    if (companyId == null) return;
    // Nothing changed: just close the editor without a round-trip.
    if (Object.keys(input).length === 0) {
      setIsEditingEvidence(false);
      return;
    }
    evidenceMutation.mutate({ id: companyId, data: input });
  };

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

  // Rendered in every workflow state: pillar evidence is editable even before
  // a narrative revision exists, while the revision-scoped actions (draft PDF,
  // narrative editing, re-ship) stay gated on hasRevision/isValidated.
  const kebab = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {hasRevision && revisionMeta && (
          <>
            <div className="px-2 py-1.5 text-[11px] text-slate-400">{revisionMeta}</div>
            <DropdownMenuSeparator />
          </>
        )}
        {hasRevision && (
          <DropdownMenuItem onClick={handleDownloadDraft} disabled={isDownloadingPdf}>
            <Download className="mr-2 h-3.5 w-3.5" /> Download draft PDF
          </DropdownMenuItem>
        )}
        {isValidated && (
          <DropdownMenuItem onClick={() => { if (companyId != null) shipMutation.mutate({ id: companyId }); }} disabled={shipMutation.isPending}>
            Re-ship to Drive
          </DropdownMenuItem>
        )}
        {hasRevision && (
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            Edit narrative
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setIsEditingEvidence(true)}>
          Edit pillar evidence
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsEditingArr(true)}>
          Edit ARR
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // CQ-47: rendered in every workflow state (the kebab is too), so the ARR
  // figure is editable even before a narrative revision exists.
  const arrDialog = (
    <ArrEditDialog
      open={isEditingArr}
      initial={arrState}
      arrEstimateDisplay={arrEstimate}
      saving={arrMutation.isPending}
      onCancel={() => setIsEditingArr(false)}
      onSave={(input) => { if (companyId != null) arrMutation.mutate({ id: companyId, data: input }); }}
    />
  );

  if (isEditingEvidence) {
    return (
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5" aria-label="Pillar evidence editor">
        <PillarEvidenceEditor
          report={data.report}
          saving={evidenceMutation.isPending}
          onCancel={() => setIsEditingEvidence(false)}
          onSave={handleSaveEvidence}
        />
      </section>
    );
  }

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
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Admin only</span>
            {kebab}
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          No validated report yet. Generate the AI narrative, edit, then sign off to unlock the client PDF.
        </p>
        <div className="mb-4">
          <CoverMetaCard report={data.report} saving={metaMutation.isPending} onSave={handleSaveMeta} />
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          {generateMutation.isPending ? "Generating..." : "Export editable report"}
        </Button>
        {arrDialog}
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

        <CoverMetaCard report={data.report} saving={metaMutation.isPending} onSave={handleSaveMeta} />

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
        {arrDialog}
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

      <CoverMetaCard report={data.report} saving={metaMutation.isPending} onSave={handleSaveMeta} />

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
      {arrDialog}
    </section>
  );
}
