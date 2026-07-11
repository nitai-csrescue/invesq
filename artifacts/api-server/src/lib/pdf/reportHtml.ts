import type { AdminCompanyReportData } from "@workspace/api-zod";
import { PILLARS, getTier } from "@workspace/portfolio-engine";
import { esc } from "./components.js";
import { parseRawScore } from "./scoreParsing.js";
import { GOOGLE_FONTS_LINK, BASE_STYLES } from "./baseStyles.js";
import type { ReportContext } from "./types.js";
import { renderPage1 } from "./pages/page1Cover.js";
import { renderPage2 } from "./pages/page2ValueCreation.js";
import { renderPage3 } from "./pages/page3Scorecard.js";
import { renderPage4 } from "./pages/page4Gaps.js";
import { renderPage5 } from "./pages/page5Pillars.js";
import { renderPage6 } from "./pages/page6Roadmap.js";
import { renderPage7 } from "./pages/page7Sources.js";

function pillarKey(index: number): keyof AdminCompanyReportData["reportData"]["scores"] {
  return `p${index + 1}` as keyof AdminCompanyReportData["reportData"]["scores"];
}

function computeTierComposite(data: AdminCompanyReportData): number {
  return PILLARS.reduce((sum, _pillar, index) => {
    const score = parseRawScore(data.reportData.scores[pillarKey(index)]);
    return sum + (score === "NA" ? 1 : score);
  }, 0);
}

// Builds the full 7-page branded INVESQ Diagnostic Report HTML, fed entirely
// by `report_exports` data (via AdminCompanyReportData) — this is a dedicated
// print template, NOT a render of the app's own /portfolio/[company]/report
// page or any other in-product UI. `sendable` drives the chrome's distribution
// posture (see ReportContext.sendable): true => client-facing "Prepared by
// INVESQ" chrome, false => "INTERNAL — NOT FOR DISTRIBUTION".
export function buildReportPdfHtml(
  data: AdminCompanyReportData,
  companyWebsite: string | null,
  sendable: boolean,
): string {
  const tierComposite = computeTierComposite(data);
  const tier = getTier(tierComposite);

  const ctx: ReportContext = {
    reportData: data.reportData,
    meta: data.meta,
    tierComposite,
    tier,
    companyWebsite,
    sendable,
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
