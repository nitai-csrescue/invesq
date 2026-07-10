---
name: Dual-source audits — check behavior, not just storage
description: Before proposing a "single source of truth" fix, verify whether a suspected second data source is actually read at runtime, or whether the real split is a hardcoded-list behavioral fork inside one storage layer.
---

When asked to converge a system on one source of truth, don't assume "static files exist alongside a database" means the app reads both at runtime. Trace every runtime read path first (grep for imports of the suspected legacy source from live routes/loaders, not just from scripts).

In INVESQ's case: static per-tenant TS files and a hardcoded tenant-list constant (`LEGACY_FIRMS_META`) looked like a second data source, but the live bootstrap loader already read only from Postgres for every tenant. The files were read only by one-time migration/backfill/parity scripts. The actual "split" was a **behavioral fork**: a hardcoded slug-list import selected which of two validation strictness levels (fail-loud vs fail-soft) applied to a firm's already-unified DB rows.

**Why:** proposing to "delete the files and point everything at the DB" would have been a no-op fix — the files weren't in the runtime path. The real fix is replacing the hardcoded identity check with a data-driven flag (e.g. a DB column) so the behavior itself stops depending on an externally-maintained list.

**How to apply:** when auditing for "dual source of truth," produce two separate findings — (1) is there a second storage location actually read at runtime, and (2) is there a behavioral fork keyed off a hardcoded list/identity check even when storage is already unified. Fix each independently; don't conflate them.
