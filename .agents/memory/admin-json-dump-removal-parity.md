---
name: Auditing raw JSON dumps before removing them from admin UIs
description: When replacing/removing a raw JSON debug block in favor of a rendered view, diff the full schema against what the rendered component actually displays.
---

Admin panels often grow a raw `<pre>{JSON.stringify(...)}</pre>` debug block early on, then later gain a proper rendered view built alongside it (not as a full replacement). By the time the JSON block is finally removed, the rendered view may not have kept up with every field added to the underlying schema — some fields can end up visible *only* in the JSON dump.

**Why:** in this project, `AdminReportPreview.tsx` rendered most of `DiagnosticReportData` but never surfaced `pillarSignals` (per-pillar signal summaries) — that field was only visible in the `<pre>{json}</pre>` block. Deleting the JSON block without checking would have silently dropped that data from the admin's view entirely.

**How to apply:** before deleting a raw JSON/debug dump, enumerate every field in the schema/type it was stringifying and confirm each one is rendered somewhere in the intended replacement view (grep the component for each field name). Add rendering for any gap before removing the dump, or explicitly confirm the field is intentionally blank/unused (e.g. genuinely empty placeholder fields) rather than assuming the rendered view already has parity.
