import { COLORS, RADII } from "../theme.js";
import { esc, pageShell, calloutBox } from "../components.js";
import type { ReportContext } from "../types.js";

// Spec: "distinct left-border accent color (red, amber, navy in that
// order)" for gap 1/2/3.
const ACCENT_COLORS = [COLORS.danger500, COLORS.warning500, COLORS.navy500];

function gapCard(gap: { title: string; description: string; impact: string; recommendation: string }, index: number): string {
  const accent = ACCENT_COLORS[index] ?? COLORS.navy500;
  const num = String(index + 1).padStart(2, "0");

  return `
    <div class="card" style="border-left:4px solid ${accent}; padding:9px 12px; margin-bottom:8px;">
      <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:3px;">
        <span style="font-family:'IBM Plex Mono', monospace; font-weight:600; font-size:11px; color:${accent};">${num}</span>
        <span style="font-weight:700; font-size:12px;">${esc(gap.title)}</span>
      </div>
      <p style="font-size:9.5px; line-height:1.35; margin-bottom:6px;">${esc(gap.description)}</p>
      <div style="display:flex; gap:10px;">
        <div style="flex:1;">
          ${calloutBox("Business Impact", esc(gap.impact) || "&mdash;", { bg: "#F1F5F9", text: COLORS.slate700, border: COLORS.slate200 })}
        </div>
        <div style="flex:1;">
          ${calloutBox("Recommendation", esc(gap.recommendation) || "&mdash;", { bg: COLORS.success50, text: COLORS.success700 })}
        </div>
      </div>
    </div>
  `;
}

export function renderPage4(ctx: ReportContext): string {
  const { reportData } = ctx;

  const cards = reportData.gaps.map((gap, i) => gapCard(gap, i)).join("");

  const body = `
    <h2 class="section-heading">Top Identified Gaps</h2>
    <p style="margin-bottom:10px; font-size:10px; line-height:1.42;">
      The three lowest-rated rubric pillars below represent the most immediate, evidence-backed opportunities for
      operational improvement, and for <strong>${esc(reportData.parentFund)}</strong>, the clearest near-term
      levers on retention and expansion at this portfolio company.
    </p>
    ${cards}
  `;

  return pageShell(4, ctx, body);
}
