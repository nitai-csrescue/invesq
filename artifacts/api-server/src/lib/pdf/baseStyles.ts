import { COLORS, FONTS, RADII } from "./theme.js";

// Loaded over the network (Google Fonts CDN) per explicit user correction —
// NOT self-hosted/base64. Puppeteer's headless Chromium has outbound network
// access in this environment (verified against fonts.googleapis.com /
// fonts.gstatic.com). `page.goto` waits on `networkidle0` before printing,
// so these must be resolved before the PDF is generated.
export const GOOGLE_FONTS_LINK = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@700;900&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
`;

// `@page { size: 8.5in auto; margin: 0 }` + auto-height `.page` divs (with
// `break-after: page` on all but the last) is the spec-verbatim pattern:
// each `.page` renders at its natural content height rather than a fixed
// 11in, and Chromium still emits exactly 7 physical PDF pages because each
// `.page` is one paginated unit. Combined with `preferCSSPageSize: true` in
// renderPdf.ts.
export const BASE_STYLES = `
  @page {
    size: 8.5in auto;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: ${COLORS.white};
    color: ${COLORS.slate900};
    font-family: ${FONTS.sans};
    font-size: 10.5px;
    line-height: 1.55;
  }

  .page {
    position: relative;
    width: 8.5in;
    padding: 0.5in 0.55in 0.75in 0.55in;
    break-after: page;
  }

  .page:last-child {
    break-after: auto;
  }

  .eyebrow {
    font-family: ${FONTS.mono};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 9.5px;
  }

  .label {
    font-family: ${FONTS.mono};
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 9px;
    color: ${COLORS.slate500};
  }

  h1, h2, h3 {
    margin: 0;
    font-family: ${FONTS.sans};
    color: ${COLORS.slate900};
  }

  h2.section-heading {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin-bottom: 8px;
  }

  p {
    margin: 0 0 8px 0;
  }

  p:last-child {
    margin-bottom: 0;
  }

  a {
    color: ${COLORS.info500};
    text-decoration: none;
  }

  .card {
    border: 1px solid ${COLORS.slate200};
    border-radius: ${RADII.md};
    background: ${COLORS.white};
    break-inside: avoid;
  }

  .rounded-lg {
    border-radius: ${RADII.lg};
  }

  .pill {
    display: inline-block;
    border-radius: ${RADII.pill};
    font-family: ${FONTS.mono};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 2px solid ${COLORS.navy500};
    margin-bottom: 14px;
  }

  .wordmark {
    font-family: ${FONTS.sans};
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.01em;
  }

  .wordmark .cs {
    color: ${COLORS.navy500};
  }

  .wordmark .rescue {
    color: ${COLORS.orange500};
  }

  .header-meta {
    text-align: right;
    color: ${COLORS.slate500};
  }

  .header-meta .label {
    line-height: 1.6;
  }

  .footer {
    position: absolute;
    left: 0.55in;
    right: 0.55in;
    bottom: 0.35in;
    padding-top: 8px;
    border-top: 1px solid ${COLORS.slate200};
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer .label {
    color: ${COLORS.slate500};
  }

  .divider {
    height: 1px;
    background: ${COLORS.slate200};
    border: none;
    margin: 14px 0;
  }

  .sparkle {
    color: ${COLORS.orange500};
    font-size: 11px;
    margin-right: 8px;
  }
`;
