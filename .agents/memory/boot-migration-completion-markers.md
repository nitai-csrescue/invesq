---
name: Boot-migration completion markers
description: One-shot boot data migrations must use a durable marker, never a data-shape heuristic like row count.
---

# Boot-migration completion markers

A temporary startup data migration must record completion in a **durable marker** (e.g. a key in the parent row's jsonb meta, written right after the mutation) — never infer completion from the data itself ("0 companies left", "row exists").

**Why:** data-shape heuristics invert once normal operation recreates data. The STG de-legacize wipe used "0 companies = done"; after the pipeline re-onboarded companies, every later boot would have wiped them again. Caught in architect review before Publish.

**How to apply:** guard on the marker first; perform mutation; write marker after success (failed run retries next boot). Also sequence boot routines that touch the same tables (RLS DDL vs cascade deletes deadlock) and resume queued jobs only after destructive migrations so a resumed build can't race the wipe.
