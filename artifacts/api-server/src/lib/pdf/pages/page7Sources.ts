import { COLORS } from "../theme.js";
import { esc, pageShell } from "../components.js";
import { METHODOLOGY_PARAGRAPH } from "../staticCopy.js";
import type { ReportContext } from "../types.js";

interface SourceRow {
  label: string;
  // A concrete URL (rendered as a link) OR a methodology note describing what
  // that public-signal category was reviewed for. Only the company website is
  // backed by a real DB field; LinkedIn / job postings / product pages are
  // described as methodology rather than fabricated into URLs.
  url?: string | null;
  note?: string;
}

function sourceRow(row: SourceRow): string {
  const value = row.url
    ? `<a href="${esc(row.url)}">${esc(row.url)}</a>`
    : row.note
      ? `<span style="color:${COLORS.slate700};">${esc(row.note)}</span>`
      : `<span style="color:${COLORS.slate500}; font-style:italic;">Not on file</span>`;

  return `
    <div class="card" style="padding:11px 14px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
      <div class="label" style="color:${COLORS.slate900}; flex-shrink:0;">${esc(row.label)}</div>
      <div style="font-size:10px; text-align:right;">${value}</div>
    </div>
  `;
}

export function renderPage7(ctx: ReportContext): string {
  const { reportData, companyWebsite } = ctx;

  // The company website is the one concrete URL on file. LinkedIn, job
  // postings, and product/pricing pages are the other public-signal source
  // CATEGORIES the rubric draws on; the app stores no per-company URLs for
  // them, so they are described as methodology (what was reviewed) rather than
  // fabricated into links.
  const rows: SourceRow[] = [
    { label: "Company Website", url: companyWebsite },
    {
      label: "LinkedIn Company Page",
      note: "Reviewed for headcount, CS and leadership org structure, and tenure signals.",
    },
    {
      label: "Job Postings",
      note: "Reviewed for open CS roles, tooling references, and process-maturity signals.",
    },
    {
      label: "Product & Pricing Pages",
      note: "Reviewed for onboarding, support tiers, and customer-success motion signals.",
    },
    // Per-company extension rows (companies.meta.additionalSourcesReviewed) —
    // empty for companies without the meta key, so the shared list above is
    // the template default for everyone else.
    ...ctx.additionalSources.map((s) => ({ label: s.label, note: s.note })),
  ];

  const { validated, validatorNames, validatedAt, overrideNote } = ctx.validation;
  let validationBlock: string;
  if (!validated) {
    validationBlock = `
      <div style="margin-top:22px; border:1px solid ${COLORS.danger500}; border-radius:6px; padding:10px 14px; display:flex; align-items:center; gap:12px;">
        <span class="pill" style="border:1.5px solid ${COLORS.danger500}; color:${COLORS.danger500}; padding:3px 10px; font-size:8.5px; flex-shrink:0;">DRAFT &middot; NOT VALIDATED</span>
        <span style="font-size:9px; color:${COLORS.slate500}; font-style:italic;">This draft has not yet been reviewed and signed off. It is for internal use only and must not be distributed externally.</span>
      </div>
    `;
  } else {
    const names = validatorNames.length > 0 ? validatorNames.join(", ") : "INVESQ";
    const dateStr = validatedAt ? new Date(validatedAt).toISOString().slice(0, 10) : "";
    let stamp: string;
    if (overrideNote) {
      stamp = dateStr
        ? `Validated &middot; ${esc(names)} &middot; ${esc(overrideNote)} &middot; ${esc(dateStr)}`
        : `Validated &middot; ${esc(names)} &middot; ${esc(overrideNote)}`;
    } else {
      stamp = dateStr ? `Validated &middot; ${esc(names)} &middot; ${esc(dateStr)}` : `Validated &middot; ${esc(names)}`;
    }
    validationBlock = `
      <div style="margin-top:22px; border:1px solid ${COLORS.orange500}; border-radius:6px; padding:10px 14px; display:flex; align-items:center; gap:12px;">
        <span class="pill" style="border:1.5px solid ${COLORS.orange500}; color:${COLORS.orange500}; padding:3px 10px; font-size:8.5px; flex-shrink:0;">${stamp}</span>
        <span style="font-size:9px; color:${COLORS.slate700};">Reviewed and approved for external distribution by the validators listed.</span>
      </div>
    `;
  }

  const body = `
    <h2 class="section-heading">Methodology &amp; Sources</h2>
    <p style="margin-bottom:18px;">${esc(METHODOLOGY_PARAGRAPH)}</p>

    <div class="label" style="margin-bottom:10px;">Sources Reviewed</div>
    ${rows.map(sourceRow).join("")}

    <p style="margin-top:18px; font-size:9px; font-style:italic; color:${COLORS.slate500};">
      This report reflects publicly observable signal as of ${esc(reportData.reportDate)} and should be read
      alongside direct diligence rather than as a substitute for it.
    </p>

    ${validationBlock}
  `;

  return pageShell(7, ctx, body);
}
