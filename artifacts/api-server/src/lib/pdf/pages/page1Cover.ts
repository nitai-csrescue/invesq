import { COLORS, RADII } from "../theme.js";
import { esc, pageShell, eyebrow } from "../components.js";
import { PREPARED_BY } from "../staticCopy.js";
import type { ReportContext } from "../types.js";

function preparedCard(title: string, lines: Array<{ label: string; value: string }>): string {
  const rows = lines
    .map(
      (l) => `
        <div style="margin-bottom:4px;">
          <div class="label" style="margin-bottom:1px;">${esc(l.label)}</div>
          <div style="font-size:10.5px; font-weight:600; color:${COLORS.slate900};">${esc(l.value) || "&middot;"}</div>
        </div>
      `,
    )
    .join("");

  return `
    <div class="card" style="padding:10px 14px; flex:1;">
      <div class="label" style="color:${COLORS.slate500}; margin-bottom:6px;">${esc(title)}</div>
      ${rows}
    </div>
  `;
}

function compositePanel(ctx: ReportContext): string {
  const { reportData, meta, tier } = ctx;

  return `
    <div class="rounded-lg" style="background:${COLORS.navy500}; color:${COLORS.white}; padding:11px 14px; margin-top:7px;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:24px;">
        <div>
          <div style="font-size:24px; font-weight:800; line-height:1;">${meta.composite}<span style="font-size:13px; font-weight:500; opacity:0.75;">/${meta.compositeMax}</span></div>
          <div class="label" style="color:${COLORS.white}; opacity:0.85; margin-top:3px;">Composite Diagnostic Score</div>
          <div style="font-size:8px; font-style:italic; opacity:0.7; margin-top:2px; max-width:260px; line-height:1.25;">
            Reflects only pillars with sufficient evidence to score; pillars marked "Insufficient Data" are excluded from both the score and the total.
          </div>
        </div>
        <div style="text-align:right;">
          <span class="pill" style="border:1.5px solid ${COLORS.orange500}; color:${COLORS.orange500}; background:transparent; padding:3px 10px; font-size:9px;">
            Tier ${tier.id} &middot; ${esc(tier.label)}
          </span>
          <div style="font-size:8px; opacity:0.7; margin-top:3px; max-width:220px; line-height:1.25;">${esc(tier.engagement)}</div>
        </div>
      </div>

      <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.2); display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div>
          <div class="label" style="color:${COLORS.white}; opacity:0.8; margin-bottom:2px;">Composite Context</div>
          <div style="font-size:8px; line-height:1.22; opacity:0.92;">${esc(reportData.compositeContext) || "&mdash;"}</div>
        </div>
        <div>
          <div class="label" style="color:${COLORS.white}; opacity:0.8; margin-bottom:2px;">Existing Systems</div>
          <div style="font-size:8px; line-height:1.22; opacity:0.92;">${esc(reportData.existingSystems) || "&mdash;"}</div>
        </div>
        <div>
          <div class="label" style="color:${COLORS.white}; opacity:0.8; margin-bottom:2px;">Path Forward</div>
          <div style="font-size:8px; line-height:1.22; opacity:0.92;">${esc(reportData.pathForward) || "&mdash;"}</div>
        </div>
      </div>
    </div>
  `;
}

export function renderPage1(ctx: ReportContext): string {
  const { reportData } = ctx;

  const execSummaryHtml =
    reportData.execSummary.length > 0
      ? reportData.execSummary
          .map((p) => `<p style="font-size:9.5px; line-height:1.35; margin:0 0 6px 0;">${esc(p)}</p>`)
          .join("")
      : `<p style="color:${COLORS.slate500}; font-style:italic; font-size:9.5px;">Narrative not yet generated for this assessment.</p>`;

  const body = `
    <div style="margin-bottom:7px;">
      ${eyebrow("Customer Success Diagnostic")}
      <div style="display:flex; align-items:baseline; gap:12px; margin-top:3px;">
        <h1 style="font-family:'Source Serif 4', Georgia, serif; font-weight:800; font-size:24px; color:${COLORS.slate900}; letter-spacing:-0.01em;">
          ${esc(reportData.companyName)}
        </h1>
        ${
          ctx.sendable
            ? `<span class="pill" style="border:1.5px solid ${COLORS.orange500}; color:${COLORS.orange500}; padding:3px 10px; font-size:8.5px;">Cleared for Distribution</span>`
            : `<span class="pill" style="border:1.5px solid ${COLORS.danger500}; color:${COLORS.danger500}; padding:3px 10px; font-size:8.5px;">Internal &middot; Not for Distribution</span>`
        }
      </div>
    </div>

    <div style="display:flex; gap:12px; margin-bottom:8px;">
      ${preparedCard("Prepared For", [
        { label: "Name", value: reportData.preparedForName },
        { label: "Title", value: reportData.preparedForTitle },
        { label: "Company", value: reportData.companyName },
      ])}
      ${preparedCard("Prepared By", [
        { label: "Name", value: PREPARED_BY.name },
        { label: "Organization", value: PREPARED_BY.org },
        { label: "Date", value: reportData.reportDate },
      ])}
    </div>

    <h2 class="section-heading">Executive Summary</h2>
    <div>${execSummaryHtml}</div>

    ${compositePanel(ctx)}
  `;

  return pageShell(1, ctx, body);
}
