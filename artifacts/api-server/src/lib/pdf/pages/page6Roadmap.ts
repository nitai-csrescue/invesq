import { COLORS, RADII } from "../theme.js";
import { esc, pageShell } from "../components.js";
import { INITIATIVES } from "../staticCopy.js";
import type { ReportContext } from "../types.js";

function initiativeRow(item: { initiative: string; outcome: string }): string {
  return `
    <tr>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; font-weight:600; width:28%; vertical-align:top;">
        ${esc(item.initiative)}
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid ${COLORS.slate200}; font-size:10px; line-height:1.5; vertical-align:top;">
        ${esc(item.outcome)}
      </td>
    </tr>
  `;
}

function nextStepItem(text: string, index: number): string {
  // Bold the lead-in phrase up to the first colon (if any), per spec.
  const colonIndex = text.indexOf(":");
  const lead = colonIndex > -1 ? text.slice(0, colonIndex + 1) : null;
  const rest = colonIndex > -1 ? text.slice(colonIndex + 1) : text;

  return `
    <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:10px;">
      <span style="flex-shrink:0; width:20px; height:20px; border-radius:50%; background:${COLORS.navy500}; color:${COLORS.white}; font-family:'IBM Plex Mono', monospace; font-weight:600; font-size:10px; display:flex; align-items:center; justify-content:center;">
        ${index + 1}
      </span>
      <div style="font-size:10.5px; line-height:1.55;">
        ${lead ? `<strong>${esc(lead)}</strong>` : ""}${esc(rest)}
      </div>
    </div>
  `;
}

export function renderPage6(ctx: ReportContext): string {
  const { reportData } = ctx;

  const rows = INITIATIVES.map(initiativeRow).join("");
  const steps =
    reportData.nextSteps.length > 0
      ? reportData.nextSteps.map(nextStepItem).join("")
      : `<p style="color:${COLORS.slate500}; font-style:italic;">Narrative not yet generated for this assessment.</p>`;

  const body = `
    <h2 class="section-heading">Recommended Initiatives</h2>
    <table style="width:100%; border-collapse:collapse; border:1px solid ${COLORS.slate200}; border-radius:${RADII.md}; overflow:hidden; margin-bottom:22px; break-inside:avoid;">
      <thead>
        <tr style="background:${COLORS.navy500};">
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Initiative</th>
          <th class="label" style="color:${COLORS.white}; text-align:left; padding:10px 14px;">Expected Business Outcome</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <h2 class="section-heading">Recommended Next Steps</h2>
    ${steps}

    <div class="rounded-lg" style="background:${COLORS.navy500}; color:${COLORS.white}; padding:22px 26px; margin-top:22px; text-align:center;">
      <div class="eyebrow" style="color:${COLORS.orange500}; margin-bottom:8px;">Prepared by</div>
      <div style="font-size:22px; font-weight:800; letter-spacing:-0.01em;">INVESQ</div>
      <div style="font-size:9px; opacity:0.8; margin-top:4px; letter-spacing:0.04em;">Operational Due Diligence for PE &amp; VC</div>
    </div>
  `;

  return pageShell(6, ctx, body);
}
