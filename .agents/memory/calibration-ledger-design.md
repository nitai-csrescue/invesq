---
name: Calibration Ledger design invariants
description: Immutability, digest claiming, and re-score FK lifecycle for the calibration ledger.
---
- Prediction snapshots: one per company, created already-locked; there is deliberately NO update path (PATCH exists only to 409). Locking uses atomic `INSERT ... ON CONFLICT DO NOTHING` — never read-then-insert (concurrent lock would 500 on the unique index).
- **Why:** immutability is the ledger's core guarantee for investor credibility; architect review caught the read-then-insert race.
- Weekly Slack digest summarizes only the PREVIOUS COMPLETED ISO week (Mon–Mon UTC), and inserts the `calibration_digests` week row as an atomic claim BEFORE posting (released on failure). A rolling-window/early-record design silently drops mid-week events and double-posts under concurrent ticks.
- `calibration_predictions.assessment_id` is provenance-only, nullable, ON DELETE SET NULL — because the same-day re-score path deletes+reinserts assessment rows; a NOT NULL restrict FK there breaks build jobs. All predicted values are copied into the snapshot row, so it survives.
- **How to apply:** any new table referencing assessments must consider the delete+reinsert re-score path; any new "post once" scheduler must claim via unique insert before the side effect.
