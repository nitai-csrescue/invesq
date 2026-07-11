import type { AdminCompanyReportData } from "@workspace/api-zod";
import type { Tier } from "@workspace/portfolio-engine";

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
  // Whether this render is cleared for external distribution (firm is NOT
  // internal-only). Drives the chrome variant: sendable => "Prepared by
  // INVESQ" / "Confidential"; not sendable => "INTERNAL — NOT FOR
  // DISTRIBUTION". Public tenant exports are only ever produced with
  // sendable=true; admin exports set it per the firm's posture.
  sendable: boolean;
}
