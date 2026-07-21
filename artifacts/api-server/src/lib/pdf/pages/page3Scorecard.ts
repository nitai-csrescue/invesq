import { PILLARS, RUBRIC_PILLARS, type RubricPillarDef } from "@workspace/portfolio-engine";
import { COLORS, FONTS, RADII, BAND_STATUS, bandStatusFor } from "../theme.js";
import { esc, pageShell, bandLegendPill, bandBadge } from "../components.js";
import type { ReportContext } from "../types.js";
import type { DiagnosticReportData } from "@workspace/api-zod";

// Map a v1 source-pillar concept id ("org", "leadership", ...) to its pN key
// in the report's scores/pillarSignals objects (p1..p8 map 1:1 to PILLARS
// order — the stable underlying-signal contract).
function keyForPillarId(id: string): keyof DiagnosticReportData["pillarSignals"] {
  const index = PILLARS.findIndex((p) => p.id === id);
  return `p${index + 1}` as keyof DiagnosticReportData["pillarSignals"];
}

// One rubric-pillar row: name + source concepts, band badge, and the joined
// signal narrative(s) of its underlying source pillars.
function rubricRow(pillar: RubricPillarDef, index: number, ctx: ReportContext): string {
  const value = ctx.meta.rubric[pillar.key];
  const sourceNames = pillar.sourcePillarIds
    .map((id) => PILLARS.find((p) => p.id === id)?.name ?? id)
    .join(" + ");
  const signals = pillar.sourcePillarIds
    .map((id) => ctx.reportData.pillarSignals[keyForPillarId(id)])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ");

  return `
    <tr>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; font-weight:600; vertical-align:top; width:26%;">
        <span style="font-family:'IBM Plex Mono', monospace; color:${COLORS.orange600}; font-weight:600;">0${index + 1}</span>: ${esc(pillar.name)}
        <div style="font-size:8px; font-weight:400; color:${COLORS.slate500}; margin-top:2px;">Signals: ${esc(sourceNames)}</div>
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; vertical-align:top; width:1%; white-space:nowrap;">
        ${bandBadge(value, { compact: true })}
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; vertical-align:top; font-size:10px; line-height:1.5;">
        ${esc(signals) || `<span style="color:${COLORS.slate500}; font-style:italic;">No signal narrative on file.</span>`}
      </td>
    </tr>
  `;
}

export function renderPage3(ctx: ReportContext): string {
  const rubric = ctx.meta.rubric;
  const bandStatus = bandStatusFor(rubric.portcoBand);

  const rows = RUBRIC_PILLARS.map((pillar, index) => rubricRow(pillar, index, ctx)).join("");

  const legend = `
    <div style="margin-bottom:14px;">
      ${bandLegendPill(BAND_STATUS.High, "2 pts")}
      ${bandLegendPill(BAND_STATUS.Medium, "1 pt")}
      ${bandLegendPill(BAND_STATUS.Low, "0 pts")}
      ${bandLegendPill(BAND_STATUS["Insufficient Data"], "counts as 1 pt")}
    </div>
  `;

  const body = `
    <h2 class="section-heading">4-Pillar Scorecard</h2>
    ${legend}

    <table style="width:100%; border-collapse:collapse; border:1px solid ${COLORS.slate200}; border-radius:${RADII.md}; overflow:hidden; break-inside:avoid;">
      <thead>
        <tr style="background:${COLORS.navy500};">
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Pillar</th>
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Rating</th>
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Key Signal(s) &amp; Opportunities</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex; gap:14px; margin-top:16px;">
      <div class="rounded-lg" style="flex:1; background:${COLORS.navy500}; color:${COLORS.white}; padding:14px 16px;">
        <div class="label" style="color:${COLORS.white}; opacity:0.85; margin-bottom:6px;">PortCo Score</div>
        <div style="font-family:${FONTS.serif}; font-weight:800; font-size:30px; line-height:1;">${rubric.portcoComposite} <span style="opacity:0.5; font-weight:700;">/</span> 8</div>
      </div>
      <div class="rounded-lg" style="flex:2; background:${bandStatus.bg}; border:1px solid ${bandStatus.border}; padding:14px 16px;">
        <div class="label" style="color:${bandStatus.text}; margin-bottom:6px;">PortCo Band</div>
        <div style="font-size:13px; font-weight:700; color:${bandStatus.text}; margin-bottom:4px;">${esc(rubric.portcoBand)}</div>
        <div style="font-size:10px; line-height:1.5; color:${COLORS.slate700};">Composite of the four rubric pillar ratings (Low = 0, Medium = 1, High = 2 points), banded 0-2 Low, 3-5 Medium, 6-8 High.</div>
      </div>
    </div>

    <p style="margin-top:14px; font-size:9px; font-style:italic; color:${COLORS.slate500};">
      Pillars rated "Insufficient Data" are not treated as automatic failures: they reflect genuine
      public-signal uncertainty rather than a confirmed gap, and count as Medium (1 point) in the composite.
    </p>
  `;

  return pageShell(3, ctx, body);
}
