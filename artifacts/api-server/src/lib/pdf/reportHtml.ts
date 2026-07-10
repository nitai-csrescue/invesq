import { PILLARS, getTier, type PillarScore } from "@workspace/portfolio-engine";
import type { AdminCompanyReportData, DiagnosticReportData } from "@workspace/api-zod";

const COLORS = {
  primary: "#2463eb",
  foreground: "#0f1729",
  mutedForeground: "#65758b",
  border: "#e1e7ef",
  background: "#ffffff",
  secondaryBg: "#f1f5f9",
};

const TIER_LEVEL_COLORS: Record<string, string> = {
  "2": "#059669",
  "1": "#b45309",
  "0": "#e11d48",
};
const NA_COLOR = "#64748b";

function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toPillarScore(value: number | "NA"): PillarScore {
  return value === "NA" ? null : (value as PillarScore);
}

function pillarKey(index: number): keyof DiagnosticReportData["scores"] {
  return `p${index + 1}` as keyof DiagnosticReportData["scores"];
}

function renderPillarRow(index: number, reportData: DiagnosticReportData): string {
  const pillar = PILLARS[index];
  const key = pillarKey(index);
  const rawScore = reportData.scores[key];
  const score = toPillarScore(rawScore);
  const evidence = reportData.pillarEvidence[key];
  const signal = reportData.pillarSignals[key];
  const color = score === null ? NA_COLOR : TIER_LEVEL_COLORS[String(score)];
  const label = score === null ? "N/A" : `${score} / 2`;
  const fillPct = score === null ? 0 : (score / 2) * 100;

  return `
    <div class="pillar-row">
      <div class="pillar-row-top">
        <div class="pillar-name">${esc(pillar.name)} <span class="pillar-weight">&times;${pillar.weight.toFixed(2)}</span></div>
        <div class="pillar-score" style="color:${color}">${label}</div>
      </div>
      <div class="pillar-bar-track">
        <div class="pillar-bar-fill" style="width:${fillPct}%;background:${color}"></div>
      </div>
      <div class="pillar-measures">${esc(pillar.measures)}</div>
      ${evidence ? `<div class="pillar-evidence">${esc(evidence)}</div>` : ""}
      ${signal ? `<div class="pillar-signal"><strong>Signal:</strong> ${esc(signal)}</div>` : ""}
    </div>
  `;
}

function renderGap(gap: DiagnosticReportData["gaps"][number]): string {
  return `
    <div class="gap-card">
      <div class="gap-title">${esc(gap.title)}</div>
      ${gap.description ? `<div class="gap-field">${esc(gap.description)}</div>` : ""}
      ${gap.impact ? `<div class="gap-field"><strong>Impact:</strong> ${esc(gap.impact)}</div>` : ""}
      ${gap.recommendation ? `<div class="gap-field"><strong>Recommendation:</strong> ${esc(gap.recommendation)}</div>` : ""}
    </div>
  `;
}

export function buildReportHtml(data: AdminCompanyReportData): string {
  const { reportData, meta } = data;
  const tierComposite = PILLARS.reduce((sum, _pillar, index) => {
    const raw = reportData.scores[pillarKey(index)];
    const score = toPillarScore(raw);
    return sum + (score === null ? 1 : score);
  }, 0);
  const tier = getTier(tierComposite);
  const compositeDisplay = meta.compositeMax > 0 ? String(meta.composite) : "N/A";

  const pillarRows = PILLARS.map((_pillar, index) => renderPillarRow(index, reportData)).join("");

  const execSummary = reportData.execSummary
    .map((paragraph) => `<p>${esc(paragraph)}</p>`)
    .join("");

  const gaps = reportData.gaps.map(renderGap).join("");

  const nextSteps = reportData.nextSteps.map((step) => `<li>${esc(step)}</li>`).join("");

  const hasNarrative = Boolean(meta.generatedAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(reportData.companyName)} — Diagnostic Report</title>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: ${COLORS.foreground};
    background: ${COLORS.background};
    font-size: 11px;
    line-height: 1.5;
  }
  h1, h2, h3, p, ul, ol, div { margin: 0; padding: 0; }
  .page { padding: 0; }
  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    margin-bottom: 18px;
    border-bottom: 2px solid ${COLORS.primary};
  }
  .brand-name {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: ${COLORS.primary};
  }
  .brand-sub {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${COLORS.mutedForeground};
    margin-top: 2px;
  }
  .brand-meta {
    text-align: right;
    font-size: 10px;
    color: ${COLORS.mutedForeground};
  }
  .cover {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: ${COLORS.secondaryBg};
    border: 1px solid ${COLORS.border};
    border-radius: 10px;
    padding: 20px 22px;
    margin-bottom: 18px;
    break-inside: avoid;
  }
  .cover h1 {
    font-size: 19px;
    font-weight: 700;
    color: ${COLORS.foreground};
  }
  .cover .fund {
    margin-top: 3px;
    font-size: 12px;
    color: ${COLORS.mutedForeground};
  }
  .cover .badges {
    margin-top: 10px;
    display: flex;
    gap: 8px;
  }
  .badge {
    display: inline-block;
    border: 1px solid ${COLORS.border};
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 9px;
    font-weight: 600;
    background: ${COLORS.background};
  }
  .badge-tier {
    border-color: ${tier.color};
    color: ${tier.color};
    background: ${tier.color}1a;
  }
  .cover-score {
    text-align: right;
  }
  .cover-score-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${COLORS.mutedForeground};
  }
  .cover-score-value {
    font-size: 34px;
    font-weight: 700;
    line-height: 1;
    margin-top: 4px;
  }
  .cover-score-max {
    font-size: 13px;
    font-weight: 400;
    color: ${COLORS.mutedForeground};
  }
  .section {
    margin-bottom: 16px;
    break-inside: avoid;
  }
  .section-title {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${COLORS.mutedForeground};
    font-weight: 700;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid ${COLORS.border};
  }
  .section p {
    margin-bottom: 6px;
    text-align: justify;
  }
  .section p:last-child { margin-bottom: 0; }
  .scorecard {
    border: 1px solid ${COLORS.border};
    border-radius: 10px;
    padding: 16px 18px;
  }
  .pillar-row {
    padding: 9px 0;
    border-bottom: 1px solid ${COLORS.border};
    break-inside: avoid;
  }
  .pillar-row:last-child { border-bottom: none; }
  .pillar-row-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .pillar-name {
    font-weight: 600;
    font-size: 11px;
  }
  .pillar-weight {
    font-size: 8.5px;
    color: ${COLORS.mutedForeground};
    font-weight: 400;
  }
  .pillar-score {
    font-weight: 700;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .pillar-bar-track {
    margin-top: 5px;
    height: 5px;
    border-radius: 999px;
    background: ${COLORS.secondaryBg};
    overflow: hidden;
  }
  .pillar-bar-fill {
    height: 100%;
    border-radius: 999px;
  }
  .pillar-measures {
    margin-top: 5px;
    font-size: 9.5px;
    color: ${COLORS.mutedForeground};
  }
  .pillar-evidence {
    margin-top: 3px;
    font-size: 9.5px;
    font-style: italic;
    color: ${COLORS.mutedForeground};
  }
  .pillar-signal {
    margin-top: 3px;
    font-size: 9.5px;
    color: ${COLORS.foreground};
  }
  .gap-card {
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
    background: ${COLORS.secondaryBg};
    break-inside: avoid;
  }
  .gap-card:last-child { margin-bottom: 0; }
  .gap-title {
    font-weight: 700;
    font-size: 11px;
    margin-bottom: 4px;
  }
  .gap-field {
    font-size: 9.5px;
    margin-top: 3px;
    line-height: 1.5;
  }
  .next-steps ol {
    padding-left: 16px;
    margin: 0;
  }
  .next-steps li {
    margin-bottom: 4px;
    font-size: 10.5px;
  }
  .not-generated {
    border: 1px dashed ${COLORS.border};
    border-radius: 8px;
    padding: 14px;
    color: ${COLORS.mutedForeground};
    font-size: 10.5px;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <div>
        <div class="brand-name">INVESQ</div>
        <div class="brand-sub">Operational Due Diligence &middot; Diagnostic Report</div>
      </div>
      <div class="brand-meta">
        Report date: ${esc(reportData.reportDate)}<br />
        Assessment date: ${esc(meta.assessmentDate)}
      </div>
    </div>

    <div class="cover">
      <div>
        <h1>${esc(reportData.companyName)}</h1>
        <div class="fund">${esc(reportData.parentFund)}</div>
        <div class="badges">
          <span class="badge badge-tier">${esc(meta.tier)}</span>
          <span class="badge">8 pillars &middot; 0&ndash;2 each</span>
        </div>
      </div>
      <div class="cover-score">
        <div class="cover-score-label">Phase 1 composite</div>
        <div class="cover-score-value">${compositeDisplay}<span class="cover-score-max">${meta.compositeMax > 0 ? ` / ${meta.compositeMax}` : ""}</span></div>
      </div>
    </div>

    ${
      hasNarrative && execSummary
        ? `<div class="section"><div class="section-title">Executive Summary</div>${execSummary}</div>`
        : ""
    }

    ${
      hasNarrative && reportData.compositeContext
        ? `<div class="section"><div class="section-title">Composite Context</div><p>${esc(reportData.compositeContext)}</p></div>`
        : ""
    }

    <div class="section">
      <div class="section-title">8-Pillar Scorecard</div>
      <div class="scorecard">${pillarRows}</div>
    </div>

    ${
      hasNarrative && reportData.existingSystems
        ? `<div class="section"><div class="section-title">Existing Systems</div><p>${esc(reportData.existingSystems)}</p></div>`
        : ""
    }

    ${
      hasNarrative && reportData.pathForward
        ? `<div class="section"><div class="section-title">Path Forward</div><p>${esc(reportData.pathForward)}</p></div>`
        : ""
    }

    ${
      reportData.p6Recommendation
        ? `<div class="section"><div class="section-title">CS Leadership Recommendation</div><p>${esc(reportData.p6Recommendation)}</p></div>`
        : ""
    }

    ${
      reportData.gaps.length > 0
        ? `<div class="section"><div class="section-title">Identified Gaps</div>${gaps}</div>`
        : ""
    }

    ${
      hasNarrative && reportData.nextSteps.length > 0
        ? `<div class="section next-steps"><div class="section-title">Next Steps</div><ol>${nextSteps}</ol></div>`
        : ""
    }

    ${
      !hasNarrative
        ? `<div class="section"><div class="not-generated">Narrative sections have not been generated for this assessment yet.</div></div>`
        : ""
    }
  </div>
</body>
</html>`;
}
