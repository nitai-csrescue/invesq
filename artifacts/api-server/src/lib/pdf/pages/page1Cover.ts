import { COLORS, FONTS } from "../theme.js";
import { esc, pageShell, eyebrow } from "../components.js";
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

// Page 1 composite section: a dark navy header (huge serif "N / D" score +
// outlined amber engagement-tier chip) sitting above a separate LIGHT panel
// that stacks the three narrative subsections vertically. The score is always
// meta.composite / meta.compositeMax (scored pillars only; Insufficient-Data
// pillars are EXCLUDED from both numerator and denominator) — never the
// tierComposite/16 figure used purely for tier banding (see types.ts).
function compositePanel(ctx: ReportContext): string {
  const { reportData, meta, tier } = ctx;

  const naCount = 8 - meta.compositeMax / 2;
  const allNA = meta.compositeMax === 0;

  const scoreDisplay = allNA
    ? "&mdash;"
    : `${meta.composite} <span style="opacity:0.5; font-weight:700;">/</span> ${meta.compositeMax}`;

  const caption = allNA
    ? "All 8 pillars returned Insufficient Data; tier assigned by substituting 1 point per pillar."
    : naCount > 0
      ? `${naCount} of 8 ${naCount === 1 ? "pillar" : "pillars"} Insufficient Data, excluded from the score (max reduced from 16 to ${meta.compositeMax}) and counted as 1 each for tier banding.`
      : "All 8 pillars scored from external signal.";

  const contextSection = (label: string, text: string) => `
    <div>
      <div class="label" style="color:${COLORS.navy600}; margin-bottom:3px;">${label}</div>
      <div style="font-size:9px; line-height:1.4; color:${COLORS.slate700};">${esc(text) || "&mdash;"}</div>
    </div>
  `;

  return `
    <div class="rounded-lg" style="background:${COLORS.navy500}; color:${COLORS.white}; padding:14px 16px; margin-top:8px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:24px;">
        <div>
          <div class="label" style="color:${COLORS.white}; opacity:0.8;">Composite Diagnostic Score</div>
          <div style="font-family:${FONTS.serif}; font-weight:800; font-size:36px; line-height:1.05; margin-top:4px; letter-spacing:-0.01em;">${scoreDisplay}</div>
          <div style="font-size:8px; font-style:italic; opacity:0.72; margin-top:6px; max-width:320px; line-height:1.3;">${caption}</div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <span class="pill" style="border:1.5px solid ${COLORS.orange500}; color:${COLORS.orange500}; background:transparent; padding:4px 12px; font-size:9.5px;">Tier ${tier.id} &middot; ${esc(tier.label)}</span>
          <div style="font-size:8.5px; opacity:0.78; margin-top:5px; max-width:210px; line-height:1.3;">${esc(tier.engagement)}</div>
        </div>
      </div>
    </div>

    <div class="card" style="background:${COLORS.neutral50}; padding:12px 16px; margin-top:8px; display:flex; flex-direction:column; gap:9px;">
      ${contextSection("Composite Context", reportData.compositeContext)}
      <div style="height:1px; background:${COLORS.slate200};"></div>
      ${contextSection("Existing Systems", reportData.existingSystems)}
      <div style="height:1px; background:${COLORS.slate200};"></div>
      ${contextSection("Path Forward", reportData.pathForward)}
    </div>
  `;
}

// Client-facing validation stamp shown next to the company name on page 1.
// Validated => "Validated · {names} · {date}" (orange, client deliverable);
// not validated => "DRAFT · NOT VALIDATED" (danger red, admin-only draft).
function validationStamp(ctx: ReportContext): string {
  const { validated, validatorNames, validatedAt, overrideNote } = ctx.validation;
  if (!validated) {
    return `<span class="pill" style="border:1.5px solid ${COLORS.danger500}; color:${COLORS.danger500}; padding:3px 10px; font-size:8.5px;">DRAFT &middot; NOT VALIDATED</span>`;
  }
  const names = validatorNames.length > 0 ? validatorNames.join(", ") : "INVESQ";
  const date = validatedAt ? new Date(validatedAt).toISOString().slice(0, 10) : "";
  // Override stamp: "Validated · {signer} · override: {other} - {reason} · {date}"
  // Normal stamp:   "Validated · {names} · {date}"
  let label: string;
  if (overrideNote) {
    label = date
      ? `Validated &middot; ${esc(names)} &middot; ${esc(overrideNote)} &middot; ${esc(date)}`
      : `Validated &middot; ${esc(names)} &middot; ${esc(overrideNote)}`;
  } else {
    label = date ? `Validated &middot; ${esc(names)} &middot; ${esc(date)}` : `Validated &middot; ${esc(names)}`;
  }
  return `<span class="pill" style="border:1.5px solid ${COLORS.orange500}; color:${COLORS.orange500}; padding:3px 10px; font-size:8.5px;">${label}</span>`;
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
        ${validationStamp(ctx)}
      </div>
    </div>

    <div style="display:flex; gap:12px; margin-bottom:8px;">
      ${preparedCard("Prepared For", [
        { label: "Name", value: reportData.preparedForName },
        { label: "Title", value: reportData.preparedForTitle },
        { label: "Company", value: ctx.meta.preparedForCompany },
      ])}
      ${preparedCard("Prepared By", [
        { label: "Name", value: ctx.meta.preparedByName },
        { label: "Organization", value: ctx.meta.preparedByOrg },
        { label: "Date", value: reportData.reportDate },
      ])}
    </div>

    <h2 class="section-heading">Executive Summary</h2>
    <div>${execSummaryHtml}</div>

    ${compositePanel(ctx)}
  `;

  return pageShell(1, ctx, body);
}
