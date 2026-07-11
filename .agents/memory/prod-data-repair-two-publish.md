---
name: Production data repair via two-Publish
description: How to repair prod data (dedup/backfill) when the agent has no prod write access — temporary admin endpoint + two publishes, and how to find the real FK blocker.
---

# Production data repair via two-Publish

The agent cannot write to the production DB directly (`executeSql environment:"production"` is read-only; the dev DB is a different database). The only path to mutate prod data is a **temporary, admin-gated endpoint** shipped via deploy.

## The two-Publish pattern (when the repair conflicts with a schema constraint)
When the data being repaired violates a unique index you want to (re)enforce:
1. **Publish 1** — remove the conflicting unique index(es) from the schema AND add the temporary repair endpoint. Deploy. The index must be gone or the repair delete/update itself can't run.
2. Human calls the endpoint (needs a real admin cookie — see `testing-oauth-gated-admin-routes.md`).
3. **Publish 2** — re-add the unique index(es) (now the data is clean so they apply) and remove the temporary endpoint. Deploy.

**Why:** the agent has no prod write channel; a deployed endpoint is the only lever, and an index that the dirty data violates blocks its own cleanup, so it must be dropped first and restored last.

## Finding the REAL FK blocker (learned the hard way)
A destructive parent-row delete that 500s in prod is almost always an unlisted FK child row. **Do not trust the prior diagnosis or a hardcoded child-id list** — audit prod read-only first:
- Enumerate every table with an FK to the parent (grep `references(() => parentTable.id)` in `lib/db/src/schema/`), then `SELECT` each for rows referencing the ids being deleted.
- Real incident: the endpoint hardcoded a child-row id list and assumed the wrong table was the blocker. By the time it ran, the assumed-blocker tables were empty and the hardcoded child rows had been replaced by freshly-regenerated cache rows the list didn't cover, so the delete was a no-op and the real children still blocked the parent delete. Hardcoded child ids go stale as cache rows regenerate.

**How to apply:** delete FK children **by the parent key** (`inArray(child.parentId, PARENT_IDS)`), never by hardcoded child ids. This is robust to regeneration, idempotent, and covers rows that didn't exist when the endpoint was written. Delete children before parent, all in one `db.transaction`, and log full child-row contents before deletion (guardrail).
