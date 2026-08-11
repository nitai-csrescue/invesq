---
name: ARR range vs point-value state
description: How disclosed ARR ranges are stored vs the first-class point columns, and the editor full-state rule that keeps the two representations consistent.
---

The rule: a publicly disclosed ARR **range** is stored in `CompanyMeta.arrForRollup [low, high]` + a range `arrDisplay` (with the mandatory "as of" qualifier), with the citation in the `arr_source` column and `arr` left NULL — never collapsed to a fabricated single number. The first-class columns (`arr`/`arr_as_of`/`arr_source` with the overlay) handle point values only.

**Why:** the engine's overlay only handles point values (`arrForRollup = [arr, arr]`); a range disclosure forced into a single number is fabrication, and stranding a meta range under a first-class edit created an orphan state (range still displayed after its provenance was cleared) — an architect review flagged this as severe.

**How to apply:** the admin ARR PATCH route has full-state semantics that span BOTH representations — any set or clear also resets `meta.arrDisplay`/`arrForRollup` in the same UPDATE statement. Any new ARR write path (backfills, imports) must put its no-clobber guards ON the UPDATE itself (arr IS NULL + meta-range absence as SQL predicates) and merge firm-meta markers with atomic `jsonb ||` conditional on absence, never a read-then-spread.
