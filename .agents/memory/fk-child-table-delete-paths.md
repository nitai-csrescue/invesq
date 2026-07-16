---
name: FK child tables and delete paths
description: Adding a new FK child table silently breaks every existing delete path until each one is updated.
---

Rule: whenever a new table with plain (non-cascading) FKs onto `assessments`/`companies` is added, every delete path must be updated in the same change: the firm cascade delete helper, the same-day re-score teardown in the build job, and any cleanup scripts.

**Why:** a missed delete path is invisible to every standing gate (invariants, smoke test, endpoint curls) while the child table is empty; it only surfaces later as an FK violation and a dead-end admin state when the first real child rows exist.

**How to apply:** on any new FK child table, grep for an existing sibling table name (e.g. `findingsTable`) across the api-server and update every delete/teardown site found. Empty-table gates prove nothing about delete paths; either insert a temp row and exercise the delete, or at least verify by grep.
