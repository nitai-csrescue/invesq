---
name: Generate-once-cache-forever pipelines don't pick up source-code text changes retroactively
description: When a pipeline generates content once (e.g. via an LLM call) and persists it keyed by a version stamp, editing the underlying static/fallback copy that feeds that generation does NOT change already-cached rows — verification must regenerate, not just re-render.
---

## Lesson

A cache keyed by (source-record id, version stamp) will keep serving whatever was true at generation time, even after the code that computed a *fallback* or *template* value changes. Fixing a bug in that fallback/template source and then re-fetching the cached row will silently keep showing the old, buggy text — there's no code path connecting "static copy changed" to "invalidate rows that used it."

**Why:** a copy-editing fix to a shared constants file (fallback text used when no AI-generated narrative exists for a field) had zero effect on already-generated report rows on re-render, because that fallback text gets baked into the persisted row at generation time, not recomputed at read time. Only bumping the pipeline's version stamp (forcing fresh generation) actually applied the fix.

**How to apply:**
- Before declaring a fix to fallback/template copy "verified," check whether the consuming pipeline caches its *output* (not just re-deriving fresh state from current source on every read). If it caches, you must force regeneration (bump the version key, or delete/invalidate the cached rows) to see the fix reflected.
- Don't trust "the code changed" as proof of "the user-visible output changed" for any generate-once/cache-forever system — always re-verify against a freshly regenerated artifact, not a stale cached one.
