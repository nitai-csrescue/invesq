---
name: FK child tables and delete paths
description: Adding a new FK child table silently breaks every existing delete path until each one is updated.
---

Rule: whenever a new table with plain (non-cascading) FKs onto `assessments`/`companies` is added, every delete path must be updated in the same change: the firm cascade delete helper, the same-day re-score teardown in the build job, and any cleanup scripts.

**Why:** the signals table shipped with the re-score teardown updated but the firm cascade delete missed; the gap was invisible to all gates (invariants, smoke test, curl) because zero child rows existed in dev yet. The first AI-onboarded firm scored after ship would have made DELETE /api/admin/firms/:id 500 — a dead-end admin state.

**How to apply:** on any new FK child table, grep for the existing sibling table name (e.g. `findingsTable`) across the api-server and update every delete/teardown site found. Empty-table gates prove nothing about delete paths; either insert a temp row and exercise the delete, or at least verify by grep.
