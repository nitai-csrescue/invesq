import { COLORS } from "../theme.js";
import { esc, pageShell } from "../components.js";
import { METHODOLOGY_PARAGRAPH } from "../staticCopy.js";
import type { ReportContext } from "../types.js";

interface SourceRow {
  label: string;
  url: string | null;
}

function sourceRow(row: SourceRow): string {
  const value = row.url
    ? `<a href="${esc(row.url)}">${esc(row.url)}</a>`
    : `<span style="color:${COLORS.slate500}; font-style:italic;">Not on file</span>`;

  return `
    <div class="card" style="padding:11px 14px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
      <div class="label" style="color:${COLORS.slate900};">${esc(row.label)}</div>
      <div style="font-size:10px;">${value}</div>
    </div>
  `;
}

export function renderPage7(ctx: ReportContext): string {
  const { reportData, companyWebsite } = ctx;

  // Only "Company Website" is backed by a real DB field. The spec also
  // calls for LinkedIn Company Page and Job Postings rows, but the
  // `companies` table has no such fields — no such data exists anywhere in
  // this app. Rather than fabricate URLs, those two rows are omitted
  // entirely (flagged explicitly in the completion report, not guessed).
  const rows: SourceRow[] = [{ label: "Company Website", url: companyWebsite }];

  const body = `
    <h2 class="section-heading">Methodology &amp; Sources</h2>
    <p style="margin-bottom:18px;">${esc(METHODOLOGY_PARAGRAPH)}</p>

    <div class="label" style="margin-bottom:10px;">Sources</div>
    ${rows.map(sourceRow).join("")}

    <p style="margin-top:18px; font-size:9px; font-style:italic; color:${COLORS.slate500};">
      This report reflects publicly observable signal as of ${esc(reportData.reportDate)} and should be read
      alongside direct diligence rather than as a substitute for it.
    </p>
  `;

  return pageShell(7, reportData.companyName, body);
}
