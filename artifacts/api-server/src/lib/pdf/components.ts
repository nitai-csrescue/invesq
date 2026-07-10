import { COLORS, RADII, SPARKLE, TOTAL_PAGES, scoreStatusFor, type ScoreStatus } from "./theme.js";

export function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function wordmark(): string {
  return `<span class="wordmark"><span class="cs">CS</span><span class="rescue">RESCUE</span></span>`;
}

// Page 1 uses contact info top-right; pages 2-7 use the confidentiality tag,
// per the spec's per-page header variants.
export function pageHeader(pageNumber: number): string {
  const metaRight =
    pageNumber === 1
      ? `<div class="label">csrescue.com</div><div class="label">hello@csrescue.com</div>`
      : `<div class="label">Customer Success Diagnostic &middot; Confidential</div>`;

  return `
    <div class="header-row">
      ${wordmark()}
      <div class="header-meta">${metaRight}</div>
    </div>
  `;
}

export function pageFooter(pageNumber: number, companyName: string): string {
  return `
    <div class="footer">
      <div class="label">CS Rescue &middot; Customer Success Diagnostic</div>
      <div class="label">Page ${pageNumber} of ${TOTAL_PAGES}</div>
      <div class="label">${esc(companyName)} &middot; Confidential</div>
    </div>
  `;
}

export function pageShell(pageNumber: number, companyName: string, bodyHtml: string): string {
  return `
    <div class="page">
      ${pageHeader(pageNumber)}
      ${bodyHtml}
      ${pageFooter(pageNumber, companyName)}
    </div>
  `;
}

export function sparkleBullet(): string {
  return `<span class="sparkle">${SPARKLE}</span>`;
}

// Fixed-outline legend pill (used in the Page 3 legend row) — outline only,
// not the filled treatment used for in-table score badges.
export function legendPill(status: ScoreStatus, scoreLabel: string): string {
  return `
    <span class="pill" style="border:1.5px solid ${status.border}; color:${status.text}; padding:4px 10px; margin-right:10px;">
      ${esc(scoreLabel)} &middot; ${esc(status.label)}
    </span>
  `;
}

// Filled score-status badge used in tables / pillar headings.
export function scoreBadge(score: number | "NA" | null, opts?: { compact?: boolean }): string {
  const status = scoreStatusFor(score);
  const scoreLabel = score === "NA" || score === null ? "NA" : String(score);
  const pad = opts?.compact ? "3px 9px" : "4px 12px";
  return `
    <span class="pill" style="background:${status.bg}; color:${status.text}; padding:${pad};">
      ${esc(scoreLabel)} &middot; ${esc(status.label)}
    </span>
  `;
}

export function sectionHeading(text: string): string {
  return `<h2 class="section-heading">${esc(text)}</h2>`;
}

export function eyebrow(text: string, color = COLORS.orange500): string {
  return `<div class="eyebrow" style="color:${color};">${esc(text)}</div>`;
}

export function card(innerHtml: string, style = ""): string {
  return `<div class="card" style="padding:16px 18px; ${style}">${innerHtml}</div>`;
}

export function calloutBox(label: string, bodyHtml: string, opts: { bg: string; text: string; border?: string }): string {
  return `
    <div style="background:${opts.bg}; border:1px solid ${opts.border ?? opts.bg}; border-radius:${RADII.md}; padding:7px 10px;">
      <div class="label" style="color:${opts.text}; margin-bottom:3px;">${esc(label)}</div>
      <div style="color:${opts.text}; font-size:9.5px; line-height:1.32;">${bodyHtml}</div>
    </div>
  `;
}

export function paragraphs(items: string[]): string {
  return items.map((p) => `<p>${esc(p)}</p>`).join("");
}
