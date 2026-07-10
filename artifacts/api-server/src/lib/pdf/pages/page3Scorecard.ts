import { PILLARS } from "@workspace/portfolio-engine";
import { COLORS, RADII, SCORE_STATUS } from "../theme.js";
import { esc, pageShell, legendPill, scoreBadge } from "../components.js";
import { parseRawScore } from "../scoreParsing.js";
import type { ReportContext } from "../types.js";
import type { DiagnosticReportData } from "@workspace/api-zod";

function pillarKey(index: number): keyof DiagnosticReportData["scores"] {
  return `p${index + 1}` as keyof DiagnosticReportData["scores"];
}

function scoreRow(index: number, reportData: DiagnosticReportData): string {
  const pillar = PILLARS[index];
  const key = pillarKey(index);
  const rawScore = parseRawScore(reportData.scores[key]);
  const signal = reportData.pillarSignals[key];

  return `
    <tr>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; font-weight:600; vertical-align:top; width:22%;">
        ${esc(pillar.name)}
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; vertical-align:top; width:20%;">
        ${scoreBadge(rawScore, { compact: true })}
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; vertical-align:top; font-size:10px; line-height:1.5;">
        ${esc(signal) || `<span style="color:${COLORS.slate500}; font-style:italic;">No signal narrative on file.</span>`}
      </td>
    </tr>
  `;
}

export function renderPage3(ctx: ReportContext): string {
  const { reportData, meta, tier } = ctx;

  const rows = PILLARS.map((_p, index) => scoreRow(index, reportData)).join("");

  const legend = `
    <div style="margin-bottom:14px;">
      ${legendPill(SCORE_STATUS["2"], "2")}
      ${legendPill(SCORE_STATUS["1"], "1")}
      ${legendPill(SCORE_STATUS["0"], "0")}
      ${legendPill(SCORE_STATUS.na, "NA")}
    </div>
  `;

  const body = `
    <h2 class="section-heading">8-Pillar Scorecard</h2>
    ${legend}

    <table style="width:100%; border-collapse:collapse; border:1px solid ${COLORS.slate200}; border-radius:${RADII.md}; overflow:hidden; break-inside:avoid;">
      <thead>
        <tr style="background:${COLORS.navy500};">
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Pillar</th>
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Score &middot; Status</th>
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Key Signal(s) &amp; Opportunities</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex; gap:14px; margin-top:16px;">
      <div class="rounded-lg" style="flex:1; background:${COLORS.navy500}; color:${COLORS.white}; padding:14px 16px;">
        <div class="label" style="color:${COLORS.white}; opacity:0.85; margin-bottom:5px;">Composite Diagnostic Score</div>
        <div style="font-size:24px; font-weight:800;">${meta.composite}<span style="font-size:12px; font-weight:500; opacity:0.75;">/${meta.compositeMax}</span></div>
      </div>
      <div class="rounded-lg" style="flex:2; background:#FBF3E7; border:1px solid #E9D8B8; padding:14px 16px;">
        <div class="label" style="color:${COLORS.orange600}; margin-bottom:5px;">Tier ${tier.id} &middot; ${esc(tier.label)}</div>
        <div style="font-size:10px; line-height:1.5; color:${COLORS.slate700};">${esc(tier.engagement)}</div>
      </div>
    </div>

    <p style="margin-top:14px; font-size:9px; font-style:italic; color:${COLORS.slate500};">
      Pillars scored "Insufficient Data" are not treated as automatic failures — they are excluded from both the
      score and the total above, reflecting genuine public-signal uncertainty rather than a confirmed gap.
    </p>
  `;

  return pageShell(3, reportData.companyName, body);
}
