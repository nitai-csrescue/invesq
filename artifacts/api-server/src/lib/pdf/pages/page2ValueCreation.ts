import { COLORS } from "../theme.js";
import { esc, pageShell, sparkleBullet } from "../components.js";
import { VALUE_CREATION_BULLETS } from "../staticCopy.js";
import type { ReportContext } from "../types.js";

export function renderPage2(ctx: ReportContext): string {
  const { reportData } = ctx;

  const bullets = VALUE_CREATION_BULLETS.map(
    (text) => `
      <div class="card" style="padding:11px 14px; margin-bottom:9px; display:flex; align-items:flex-start;">
        ${sparkleBullet()}
        <div style="font-size:10.5px; line-height:1.55;">${esc(text)}</div>
      </div>
    `,
  ).join("");

  const body = `
    <h2 class="section-heading">Value Creation Perspective</h2>
    <p>
      Beyond the diagnostic itself, the pattern of gaps identified here is a recurring source of preventable
      revenue leakage across PE- and VC-backed portfolio companies. Closing them is not just a remediation
      exercise, it is a direct lever on net revenue retention and expansion, and a repeatable one across a fund's
      broader portfolio.
    </p>

    <div style="margin-top:20px; margin-bottom:10px;" class="label">Highest-Leverage Opportunities</div>
    ${bullets}

    <p style="margin-top:16px;">
      For <strong>${esc(reportData.parentFund)}</strong>, standardizing this diagnostic across the portfolio turns
      customer success from a company-by-company unknown into a comparable, board-reportable operating metric,
      surfacing risk and expansion opportunity earlier, and with consistent rigor, at every portfolio company.
    </p>
  `;

  return pageShell(2, ctx, body);
}
