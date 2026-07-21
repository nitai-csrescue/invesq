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

// Layout strategy: each .page div is a flex column with min-height 11in and
// NO fixed height constraint. Content that would overflow one letter page
// flows naturally to the next physical PDF page (Chromium handles pagination
// via the @page size rule). The footer lives at the bottom of the flex
// column via `margin-top: auto`, so it is always *after* all body content
// and can never overlap it -- even on pages where content spills to page 2.
// `break-after: page` on each .page ensures the next section always starts
// on a new physical page regardless of how tall the previous section grew.
export const BASE_STYLES = `
  @page {
    size: 8.5in 11in;
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
    height: 11in;
    overflow: hidden;
    padding: 0.5in 0.55in 0 0.55in;
    break-after: page;
    display: flex;
    flex-direction: column;
  }

  .page:last-child {
    break-after: auto;
  }

  .page-body {
    flex: 1;
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
    font-family: ${FONTS.sans};
    font-size: 12px;
    font-weight: 600;
    font-variant-caps: all-small-caps;
    text-transform: lowercase;
    letter-spacing: 0.07em;
    color: ${COLORS.navy600};
    padding-bottom: 5px;
    border-bottom: 1px solid ${COLORS.slate200};
    margin: 0 0 12px 0;
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
    flex-shrink: 0;
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
    flex-shrink: 0;
    margin-top: auto;
    padding-top: 8px;
    padding-bottom: 0.35in;
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
