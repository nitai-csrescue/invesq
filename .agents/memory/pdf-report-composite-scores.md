---
name: PDF report composite score — two different composite numbers exist
description: The diagnostic PDF/report pipeline computes two different "composite score" numbers from the same pillar scores; using the wrong one in a UI/PDF panel causes a visible mismatch against the narrative text.
---

## The two numbers
- `tierComposite` (NA-substituted, always out of 16 / `PILLAR_MAX`): NA pillars count as 1. Exists ONLY to feed `getTier()` for tier banding — every other consumer (narrative prose, JSON export's `meta.composite`/`meta.compositeMax`, `AdminReportPreview.tsx`) uses the scored-only composite, which excludes NA pillars and so is not always out of 16.
- `meta.composite` / `meta.compositeMax`: scored-only composite (NA pillars excluded from both numerator and denominator). This is the number that must be *displayed* anywhere a raw composite score appears to a reader — it's what the Claude-generated narrative text describes ("X out of a possible Y scored points").

**Why:** a PDF template (page1 cover panel, page3 scorecard panel) was built displaying `tierComposite/16` because that's the number `PILLARS`/tier-banding code surfaces most directly. For any company with at least one NA pillar, this silently diverged from the narrative and JSON export (e.g. box read "14/16" while the exec summary said "13 out of a possible 14 scored points").

**How to apply:** when adding any new surface that displays a company's composite diagnostic score (PDF, admin UI, exports), use `meta.composite`/`meta.compositeMax`, never `tierComposite`/16 directly. Reserve `tierComposite` strictly for computing `tier` via `getTier()`. If a company has no NA pillars, both numbers coincide (compositeMax === PILLAR_MAX), which is why this class of bug easily hides during spot-checks on a single "clean" company — always verify against a company that actually has an NA pillar.
