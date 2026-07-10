---
name: Verifying exact brand colors/fonts in a rendered PDF
description: How to prove a Puppeteer-rendered PDF actually uses specific hex colors and font families, not just "looks right" visually.
---

## Technique

For a rendered (not text-authored) PDF, don't rely on eyeballing a screenshot to confirm brand colors — pixel-sample it:

1. `pdftoppm -png -r 100 -f N -l N input.pdf out-prefix` to rasterize a specific page.
2. `convert out-prefix-N.png -format %c -depth 8 histogram:info:- | grep -E "<HEX1>|<HEX2>"` — an exact-hex histogram match (with a real pixel count) is quantitative proof the color is actually painted, not just visually similar.
3. `pdffonts input.pdf` — confirms which font families are embedded (`emb=yes`) and subset (`sub=yes`) per page; a family not appearing here means the browser fell back to a system font even if CSS requested it.
4. `pdftotext -layout -f N -l N input.pdf -` for redaction/content checks — grep per-page-range to know exactly which physical page a leaked string sits on before treating it as a bug.

**Why:** a screenshot can look plausibly on-brand even when the actual paint color is off by a few RGB values (common with color-profile conversion in headless Chrome PDF export), and font fallback is invisible to the eye for similar-looking sans-serif substitutes. Exact-hex histogram counts and `pdffonts` embedding flags are hard evidence a visual check can't provide.

**How to apply:** whenever a task requires proving a generated PDF/image matches a brand spec (colors, fonts) rather than just "looks right," reach for this before declaring it verified.
