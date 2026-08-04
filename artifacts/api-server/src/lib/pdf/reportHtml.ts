import type { AdminCompanyReportData } from "@workspace/api-zod";
import { esc } from "./components.js";
import { GOOGLE_FONTS_LINK, BASE_STYLES } from "./baseStyles.js";
import type { ReportContext, ReportValidationStamp } from "./types.js";
import { renderPage1 } from "./pages/page1Cover.js";
import { renderPage2 } from "./pages/page2ValueCreation.js";
import { renderPage3 } from "./pages/page3Scorecard.js";
import { renderPage4 } from "./pages/page4Gaps.js";
import { renderPage5 } from "./pages/page5Pillars.js";
import { renderPage6 } from "./pages/page6Roadmap.js";
import { renderPage7 } from "./pages/page7Sources.js";

// Builds the full 7-page branded INVESQ Diagnostic Report HTML, fed entirely
// by the effective report data (via AdminCompanyReportData) — this is a
// dedicated print template, NOT a render of the app's own
// /portfolio/[company]/report page or any other in-product UI. The rubric-v2
// bands/composite render straight from meta.rubric (computed server-side in
// reportExport.ts; the PDF never recomputes scores). `validation` drives the
// chrome (see ReportContext.validation): validated => client-facing
// "Validated · {names} · {date}" chrome, otherwise "DRAFT · NOT VALIDATED".
export function buildReportPdfHtml(
  data: AdminCompanyReportData,
  companyWebsite: string | null,
  validation: ReportValidationStamp,
  additionalSources: Array<{ label: string; note: string }> = [],
): string {
  const ctx: ReportContext = {
    reportData: data.reportData,
    meta: data.meta,
    companyWebsite,
    additionalSources,
    validation,
  };

  const pages = [
    renderPage1(ctx),
    renderPage2(ctx),
    renderPage3(ctx),
    renderPage4(ctx),
    renderPage5(ctx),
    renderPage6(ctx),
    renderPage7(ctx),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(data.reportData.companyName)}: Customer Success Diagnostic</title>
${GOOGLE_FONTS_LINK}
<style>${BASE_STYLES}</style>
</head>
<body>
${pages}
</body>
</html>`;
}
