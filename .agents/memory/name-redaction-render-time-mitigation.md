---
name: Render-time redaction as an alternative to a data migration
description: When a passthrough field leaks PII/names from stored evidence and a full backfill is out of scope, apply a heuristic redaction filter at the single shared read funnel (not per-consumer, not a DB migration) so it covers cached and fresh data alike.
---

## Lesson

Confirmed the approach anticipated in `report-export-tone-policy.md`: a field that mechanically passes through unregenerated upstream text (e.g. a "gap description" sourced from a prior scoring pass) can't be fixed by changing a *different* LLM prompt. Two real options: (a) re-run/alter the original scoring pipeline across every existing row (high-risk, large blast radius, explicitly out of scope when only one field/pillar is affected), or (b) apply a heuristic redaction filter at render/serve time.

Chose (b) for a single mis-scoped field (`gaps[].description` for one pillar): a regex-based Title-Case-bigram-with-stopword-list heuristic (catches "First Last" name patterns, excludes role/org phrases like "Global Director" or "Channel Chief" via an explicit stopword set) applied inside the one shared response-shaping function used by both the cache-read path and the generate-and-cache path.

**Why:** applying it at the single funnel — not duplicated in each route handler — means it automatically covers already-cached rows (no regeneration/cache-bust needed) and any future consumer (PDF/PPTX export) that reuses the same funnel, without a version bump or backfill. It's also trivially scoped: only rewrite the exact field named in the request, leave sibling fields (e.g. a separate "raw evidence" display field showing the same underlying text) untouched and documented as a known, intentional residual gap.

**How to apply:**
- Find the single lowest-level function that assembles the response object every consumer eventually calls through (a `toResponse()`/serializer-style choke point), and apply the filter there — not in each caller.
- Build the heuristic's stopword list from real domain data (role titles, org/product names actually appearing in the evidence) and validate it against every known real example before trusting it, not just synthetic test strings.
- Verify against a row that was already cached under the *old* (unredacted) code — if the fix works, the cached row now serves clean on next read with zero regeneration, which is the point.
- Explicitly document (in the project README, not just code comments) which sibling fields/surfaces were deliberately left out of scope, so the next person doesn't assume the whole leak is closed.
