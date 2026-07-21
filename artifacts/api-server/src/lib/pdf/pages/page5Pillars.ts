import { PILLARS, RUBRIC_PILLARS, type RubricPillarDef } from "@workspace/portfolio-engine";
import { COLORS } from "../theme.js";
import { esc, pageShell, bandBadge, calloutBox } from "../components.js";
import type { ReportContext } from "../types.js";
import type { DiagnosticReportData } from "@workspace/api-zod";

// Map a v1 source-pillar concept id ("org", "leadership", ...) to its pN key
// in the report's pillarEvidence object (p1..p8 map 1:1 to PILLARS order).
function keyForPillarId(id: string): keyof DiagnosticReportData["pillarEvidence"] {
  const index = PILLARS.findIndex((p) => p.id === id);
  return `p${index + 1}` as keyof DiagnosticReportData["pillarEvidence"];
}

// Evidence sub-block for one underlying source signal inside a rubric-pillar
// section. Evidence text arrives already sanitized (name-redacted) via
// sanitizeReportData in reportExport.ts.
function sourceEvidenceBlock(id: string, reportData: DiagnosticReportData): string {
  const sourceName = PILLARS.find((p) => p.id === id)?.name ?? id;
  const evidence = reportData.pillarEvidence[keyForPillarId(id)];
  return `
    <div style="margin-top:3px;">
      <div class="label" style="color:${COLORS.slate500}; margin-bottom:1px;">${esc(sourceName)}</div>
      <p style="font-size:9.5px; line-height:1.32;">
        ${esc(evidence) || `<span style="color:${COLORS.slate500}; font-style:italic;">No evidence on file for this signal.</span>`}
      </p>
    </div>
  `;
}

// One rubric-pillar section: pillar name + band badge, what it measures, and
// the evidence of each underlying source signal. The CS-leadership
// recommendation callout renders under Org Design (which rolls up the
// leadership signal).
function rubricBlock(pillar: RubricPillarDef, index: number, ctx: ReportContext, isLast: boolean): string {
  const value = ctx.meta.rubric[pillar.key];
  const { reportData } = ctx;
  const showP6 = pillar.key === "orgDesignScore" && reportData.p6Recommendation;

  return `
    <div style="padding:5px 0; break-inside:avoid;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:2px;">
        <div style="font-weight:700; font-size:11px;">
          <span style="font-family:'IBM Plex Mono', monospace; color:${COLORS.orange600};">0${index + 1}</span>: ${esc(pillar.name)}
        </div>
        <div style="flex-shrink:0;">${bandBadge(value, { compact: true })}</div>
      </div>
      <div style="font-size:8.5px; font-style:italic; color:${COLORS.slate500}; margin-bottom:2px;">${esc(pillar.measures)}</div>
      ${pillar.sourcePillarIds.map((id) => sourceEvidenceBlock(id, reportData)).join("")}
      ${
        showP6
          ? `<div style="margin-top:5px;">${calloutBox("Recommendation", esc(reportData.p6Recommendation), { bg: COLORS.success50, text: COLORS.success700 })}</div>`
          : ""
      }
    </div>
    ${!isLast ? `<hr class="divider" style="margin:6px 0;" />` : ""}
  `;
}

// The "ai" concept pillar dropped out of the v2 rubric (it feeds no rubric
// pillar and no composite points), but its evidence is still collected and
// worth surfacing to the reader — rendered as a clearly-labeled
// informational block OUTSIDE the rubric sections.
function aiInformationalBlock(reportData: DiagnosticReportData): string {
  const aiPillar = PILLARS.find((p) => p.id === "ai");
  if (!aiPillar) return "";
  const evidence = reportData.pillarEvidence[keyForPillarId("ai")];
  return `
    <div class="card" style="background:${COLORS.neutral50}; padding:9px 12px; margin-top:8px;">
      <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:2px;">
        <span style="font-weight:700; font-size:10.5px;">${esc(aiPillar.name)}</span>
        <span class="label" style="color:${COLORS.slate500};">Informational &middot; outside the 4-pillar rubric</span>
      </div>
      <p style="font-size:9.5px; line-height:1.32;">
        ${esc(evidence) || `<span style="color:${COLORS.slate500}; font-style:italic;">No evidence on file for this signal.</span>`}
      </p>
    </div>
  `;
}

export function renderPage5(ctx: ReportContext): string {
  const blocks = RUBRIC_PILLARS.map((pillar, index) =>
    rubricBlock(pillar, index, ctx, index === RUBRIC_PILLARS.length - 1),
  ).join("");

  const body = `
    <h2 class="section-heading">Pillar-by-Pillar Assessment</h2>
    ${blocks}
    ${aiInformationalBlock(ctx.reportData)}
  `;

  return pageShell(5, ctx, body);
}
