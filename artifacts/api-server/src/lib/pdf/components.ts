import { COLORS, RADII, SPARKLE, TOTAL_PAGES, scoreStatusFor, type ScoreStatus } from "./theme.js";
import type { ReportContext } from "./types.js";

export function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// INVESQ wordmark. Rendered in brand navy (the real INVESQ mark is a dark-navy
// wordmark; the report's orange accent lives in eyebrows/rules/sparkles, not
// the logotype). NEVER the legacy "CS Rescue" per the INVESQ-branding rule.
export function wordmark(): string {
  return `<span class="wordmark"><span class="cs">INVESQ</span></span>`;
}

// Page 1 shows the tagline top-right; pages 2-7 show the confidentiality tag.
// The tag reflects distribution posture: sendable => "Confidential",
// otherwise "Internal Use Only".
export function pageHeader(pageNumber: number, ctx: ReportContext): string {
  const tag = ctx.sendable ? "Confidential" : "Internal Use Only";
  const metaRight =
    pageNumber === 1
      ? `<div class="label">Operational Due Diligence</div>`
      : `<div class="label">Customer Success Diagnostic &middot; ${tag}</div>`;

  return `
    <div class="header-row">
      ${wordmark()}
      <div class="header-meta">${metaRight}</div>
    </div>
  `;
}

// Footer: "PAGE N OF T" (rendered uppercase via .label). Left + right vary by
// distribution posture — a not-sendable render is stamped
// "INTERNAL — NOT FOR DISTRIBUTION" so an admin-only export can't be mistaken
// for a client deliverable.
export function pageFooter(pageNumber: number, ctx: ReportContext): string {
  const left = ctx.sendable ? "Prepared by INVESQ" : "INVESQ &middot; Internal";
  const right = ctx.sendable
    ? `${esc(ctx.reportData.companyName)} &middot; Confidential`
    : `Internal &middot; Not for Distribution`;
  return `
    <div class="footer">
      <div class="label">${left}</div>
      <div class="label">Page ${pageNumber} of ${TOTAL_PAGES}</div>
      <div class="label">${right}</div>
    </div>
  `;
}

export function pageShell(pageNumber: number, ctx: ReportContext, bodyHtml: string): string {
  return `
    <div class="page">
      ${pageHeader(pageNumber, ctx)}
      ${bodyHtml}
      ${pageFooter(pageNumber, ctx)}
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
  // "Insufficient Data" pillars render as an em-dash glyph ("— · Insufficient
  // Data"), not "NA". This em-dash is chrome, not generated narrative, so it is
  // intentionally exempt from the no-em-dash policy (which only strips
  // Claude-written/stored reportData text).
  const scoreLabel = score === "NA" || score === null ? "\u2014" : String(score);
  const pad = opts?.compact ? "3px 9px" : "4px 12px";
  // Compact badges (page 3's scorecard table + page 5's pillar headings) get
  // a 1px smaller font so the longest labels ("Infrastructure Gap",
  // "Insufficient Data") reliably fit on one line at typical column widths.
  const fontSize = opts?.compact ? "9.5px" : "10.5px";
  return `
    <span class="pill" style="background:${status.bg}; color:${status.text}; padding:${pad}; font-size:${fontSize};">
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
