import type { AdminCompanyReportData } from "@workspace/api-zod";

// Dual-validation stamp driving the PDF chrome. `validated` is true only when
// the report's current revision has been signed off by every configured
// validator (see reportExport.ts / validators.ts), OR when one validator has
// submitted an override for the other's missing sign-off. A validated render
// is the client-facing deliverable; a non-validated render is stamped
// "DRAFT · NOT VALIDATED" and is admin-only (the public tenant route 409s
// before ever rendering an unvalidated report).
export interface ReportValidationStamp {
  validated: boolean;
  validatorNames: string[];
  // ISO timestamp of the completing signature, or null when not validated.
  validatedAt: string | null;
  // Pre-formatted override note shown in the stamp when one validator overrode
  // the other's missing sign-off. Format: "override: {other} - {reason}".
  // Null on a normal dual sign-off or when not validated.
  overrideNote: string | null;
}

export interface ReportContext {
  reportData: AdminCompanyReportData["reportData"];
  // meta.rubric carries the rubric-v2 values the pages render: the 4 pillar
  // bands (Low/Medium/High/Insufficient Data), the 0-8 portcoComposite, and
  // its Low/Medium/High portcoBand. These are computed server-side in
  // reportExport.ts (stored assessments columns else computeRubricV2) — the
  // PDF never recomputes them, so the numbers always match the narrative
  // text and the JSON export. The legacy composite/16 + engagement-tier
  // framing was retired in the CQ-20 hard gate (2026-07-21).
  meta: AdminCompanyReportData["meta"];
  // Not part of DiagnosticReportData — fetched separately from the
  // `companies` row for the Page 7 Sources list.
  companyWebsite: string | null;
  // Per-company extension of the Page 7 Sources list, from
  // companies.meta.additionalSourcesReviewed. Empty for companies without the
  // meta key — the shared source categories are unaffected.
  additionalSources: Array<{ label: string; note: string }>;
  // Dual-validation state driving the chrome variant: validated => client
  // "Validated · {names} · {date}" / "Confidential"; not validated => "DRAFT ·
  // NOT VALIDATED". Public tenant exports are only ever produced validated (the
  // route 409s otherwise); admin exports set it per the report's validation.
  validation: ReportValidationStamp;
}
