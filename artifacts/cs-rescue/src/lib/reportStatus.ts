import type { AdminReportWorkflow } from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// Shared report-status derivation
// Maps an AdminReportWorkflow (or null for "no assessment / unresolved") to a
// single display status. Used by the tenant slim-bar status pill and the
// read-only /admin/reports index so both surfaces agree on the lifecycle.
//
// Precedence mirrors the D1 PortcoReportWorkflow states, with an explicit
// "Shipped" tier layered on top:
//   shipment.isCurrent            -> Shipped   (current revision delivered)
//   !revision.hasRevision         -> No draft  (nothing authored yet)
//   validation.isValidated        -> Validated
//   validation.validatedCount > 0 -> "k of N signed"
//   otherwise                     -> Draft
// ---------------------------------------------------------------------------
export type ReportStatusKey =
  | "none"
  | "draft"
  | "partial"
  | "validated"
  | "shipped";

export interface ReportStatus {
  key: ReportStatusKey;
  label: string;
  className: string;
  lastUpdated: string | null;
}

const STATUS_CLASS: Record<ReportStatusKey, string> = {
  none: "border-slate-400/40 bg-slate-400/10 text-slate-500",
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  partial: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600",
  validated: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  shipped: "border-primary/30 bg-primary/10 text-primary",
};

function latestTimestamp(...dates: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const d of dates) {
    if (!d) continue;
    if (best === null || new Date(d).getTime() > new Date(best).getTime()) best = d;
  }
  return best;
}

export function deriveReportStatus(
  workflow: AdminReportWorkflow | null | undefined,
): ReportStatus {
  if (!workflow) {
    return { key: "none", label: "No report", className: STATUS_CLASS.none, lastUpdated: null };
  }

  const { revision, validation, shipment } = workflow;
  const lastUpdated = latestTimestamp(
    revision.createdAt,
    validation.validatedAt,
    shipment.shippedAt,
  );

  if (shipment.isCurrent) {
    return { key: "shipped", label: "Shipped", className: STATUS_CLASS.shipped, lastUpdated };
  }
  if (!revision.hasRevision) {
    return { key: "none", label: "No draft", className: STATUS_CLASS.none, lastUpdated };
  }
  if (validation.isValidated) {
    return { key: "validated", label: "Validated", className: STATUS_CLASS.validated, lastUpdated };
  }
  if (validation.validatedCount > 0) {
    return {
      key: "partial",
      label: `${validation.validatedCount} of ${validation.requiredCount} signed`,
      className: STATUS_CLASS.partial,
      lastUpdated,
    };
  }
  return { key: "draft", label: "Draft", className: STATUS_CLASS.draft, lastUpdated };
}
