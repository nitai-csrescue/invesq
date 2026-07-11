import type { AdminCompanyReportData } from "@workspace/api-zod";
import type { Tier } from "@workspace/portfolio-engine";

// Dual-validation stamp driving the PDF chrome. `validated` is true only when
// the report's current revision has been signed off by every configured
// validator (see reportExport.ts / validators.ts). A validated render is the
// client-facing "Validated · {names} · {date}" deliverable; a non-validated
// render is stamped "DRAFT · NOT VALIDATED" and is admin-only (the public
// tenant route 409s before ever rendering an unvalidated report). This
// REPLACES the former firm-internalOnly `sendable` flag as the client-export
// control.
export interface ReportValidationStamp {
  validated: boolean;
  validatorNames: string[];
  // ISO timestamp of the completing signature, or null when not validated.
  validatedAt: string | null;
}

export interface ReportContext {
  reportData: AdminCompanyReportData["reportData"];
  meta: AdminCompanyReportData["meta"];
  // Substitution-based composite (NA pillars count as 1), always out of 16 —
  // used ONLY to derive `tier` below (via getTier), matching the same NA->1
  // substitution rule the rest of the app uses for tier banding. Do NOT
  // render this number directly in the PDF: the headline "COMPOSITE
  // DIAGNOSTIC SCORE" panels on pages 1 and 3 must display `meta.composite`/
  // `meta.compositeMax` (which excludes NA pillars entirely) so the number
  // shown matches the narrative text ("X out of a possible Y scored points")
  // and the JSON export — showing this tierComposite/16 figure instead
  // previously caused a visible mismatch on any company with an NA pillar
  // (e.g. narrative said "13 out of 14" while the box read "14/16").
  tierComposite: number;
  tier: Tier;
  // Not part of DiagnosticReportData — fetched separately from the
  // `companies` row for the Page 7 Sources list.
  companyWebsite: string | null;
  // Dual-validation state driving the chrome variant: validated => client
  // "Validated · {names} · {date}" / "Confidential"; not validated => "DRAFT ·
  // NOT VALIDATED". Public tenant exports are only ever produced validated (the
  // route 409s otherwise); admin exports set it per the report's validation.
  validation: ReportValidationStamp;
}
