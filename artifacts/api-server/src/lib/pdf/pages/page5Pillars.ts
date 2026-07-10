import { PILLARS } from "@workspace/portfolio-engine";
import { COLORS } from "../theme.js";
import { esc, pageShell, scoreBadge, calloutBox } from "../components.js";
import { parseRawScore } from "../scoreParsing.js";
import type { ReportContext } from "../types.js";
import type { DiagnosticReportData } from "@workspace/api-zod";

function pillarKey(index: number): keyof DiagnosticReportData["scores"] {
  return `p${index + 1}` as keyof DiagnosticReportData["scores"];
}

const LEADERSHIP_PILLAR_NAME = PILLARS.find((p) => p.id === "leadership")?.name ?? "CS Leadership";

function pillarBlock(index: number, reportData: DiagnosticReportData, isLast: boolean): string {
  const pillar = PILLARS[index];
  const key = pillarKey(index);
  const score = parseRawScore(reportData.scores[key]);
  const evidence = reportData.pillarEvidence[key];
  const isLeadership = pillar.name === LEADERSHIP_PILLAR_NAME;

  return `
    <div style="padding:5px 0; break-inside:avoid;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
        <div style="font-weight:700; font-size:11px;">${esc(pillar.name)}</div>
        ${scoreBadge(score, { compact: true })}
      </div>
      <p style="font-size:9.5px; line-height:1.32;">
        ${esc(evidence) || `<span style="color:${COLORS.slate500}; font-style:italic;">No evidence on file for this pillar.</span>`}
      </p>
      ${
        isLeadership && reportData.p6Recommendation
          ? `<div style="margin-top:5px;">${calloutBox("Recommendation", esc(reportData.p6Recommendation), { bg: COLORS.success50, text: COLORS.success700 })}</div>`
          : ""
      }
    </div>
    ${!isLast ? `<hr class="divider" style="margin:6px 0;" />` : ""}
  `;
}

export function renderPage5(ctx: ReportContext): string {
  const { reportData } = ctx;

  const blocks = PILLARS.map((_p, index) => pillarBlock(index, reportData, index === PILLARS.length - 1)).join("");

  const body = `
    <h2 class="section-heading">Pillar-by-Pillar Assessment</h2>
    ${blocks}
  `;

  return pageShell(5, reportData.companyName, body);
}
