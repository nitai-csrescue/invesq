---
name: Notion dedup needs live queries + client-side matching
description: Why local sync-state tables and Notion server-side text filters both fail as duplicate guards
---
**Rule:** An idempotency table keyed by an id that changes every run (e.g. assessment id) is not a duplicate guard — dedup must query the live external store on the real business key (here: Company Name + Parent Fund). And never trust Notion's server-side text filters for that lookup: they can hide rows differing in case/internal whitespace, so paginate and compare client-side with trim/collapse/casefold.

**Why:** Portfolio Company Diagnostics duplicates (Nomis x4, ClarisHealth x8) kept appearing after the Jul 2026 "idempotency fix" because notion_sync_state was keyed by assessment id — every re-onboarding/re-score took the POST branch. Live QA also showed a collapsed-whitespace query term missing real rows until filtering moved fully client-side.

**How to apply:** Any external-mirror write path: before create, live-query the target on the normalized business key; PATCH hits; make local sync-state upserts conflict-safe; with a relation-typed key that can't be resolved, fail soft to create — never infer a match from an empty relation.
