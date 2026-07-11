---
name: PDF fixed-height page overflow tradeoff
description: Pinning PDF .page divs to a fixed letter height (for flush footers) trades away auto-growth and can silently clip long generated narratives.
---

# PDF fixed-height page overflow tradeoff

To make footers sit flush at the physical bottom of each page, `baseStyles.ts`
pins every `.page` to a fixed letter height (`@page 8.5in 11in`, `.page`
`height:11in` + `overflow:hidden`) instead of the old auto-growing
`size: 8.5in auto`.

**Why:** flush footers require a known page height; `auto` height lets pages grow
and pushes an absolutely-positioned footer off the visual bottom.

**The tradeoff:** with `overflow:hidden`, an unusually long Claude-generated
narrative (exec summary, gaps impact/recommendation, page-5 pillar evidence) now
**clips silently** at 11in instead of producing a taller page — and overflowing
content first paints over the footer before it clips.

**How to apply:** any change that pins PDF pages to a fixed height must pair with
an overflow guard. `renderHtmlToPdf` (renderPdf.ts) evaluates each `.page`'s
`scrollHeight` vs `clientHeight` after `document.fonts.ready` and logs a warning
(log-only — never fail an on-demand PDF request) when content exceeds the box.
Data-only checks like `verify-pdf-parity` do NOT render, so they cannot catch
clipping; the render-path guard is the only automated signal. If long narratives
become common, prefer redesigning to paginate rather than raising the clip box.
