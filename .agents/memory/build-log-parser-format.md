---
name: BUILD-LOG entry format for /api/build-status
description: Entries missing required fields are silently skipped by the build-status parser.
---
The `/api/build-status` parser (api-server `lib/buildLog.ts`) only recognizes a BUILD-LOG.md entry if the `##` heading block contains ALL of `- Date:`, `- Status:` (plus optional `- Files changed:`, `- Validation:`, `- Republish needed:`, `- QA notes:` bullet list). Entries missing `Status:` are silently skipped and an older entry is served as "latest".

**Why:** this is what made the Notion-dedup entries and the first CQ-36 draft invisible to build-status while looking fine in the file.

**How to apply:** every new BUILD-LOG entry must include Date + Status lines in exactly that bullet format; verify with one `/api/build-status` read after appending. In dev the route reads the live repo-root file (no restart needed); prod serves the copy snapshotted at publish.
