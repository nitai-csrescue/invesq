---
name: Prod schema changes ride the Publish diff
description: Replit's Publish flow auto-applies dev-vs-prod schema diffs; startup DDL / deploy-hook pushes are forbidden anti-patterns.
---

# Prod schema changes ride the Publish diff

Replit's Publish flow introspects the dev and prod databases, computes a SQL diff, surfaces renames for user confirmation, and applies the diff to prod as part of the publish. That is the ONLY supported path for prod schema changes.

**Why:** A prior belief that "nothing runs drizzle push at deploy, so a new column never reaches prod" led to adding an idempotent boot-time `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` guard. The database skill explicitly names startup-time DDL, deploy-hook pushes, and custom prod migration scripts as forbidden patterns; the guard was removed.

**How to apply:** For any new column/table: update the Drizzle schema, make sure the DEV database has the change (post-merge push or dev-side push), then tell the user to republish. Publish handles prod. Do not confuse this with prod DATA fixes, which legitimately ride idempotent startup routines (see prod-data-repair-two-publish.md).
