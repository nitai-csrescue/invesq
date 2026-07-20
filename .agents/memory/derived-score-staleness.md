---
name: Stored derived scores go stale when the formula changes
description: Changing a scoring formula does not update rows that already store the derived value; fallbacks that prefer stored values keep serving old results.
---

The rule: when a derived value (e.g. a rollup band) is both stored in the DB and computable client-side, readers prefer the stored value. Changing the formula therefore requires re-writing the stored rows in EVERY environment, or old results keep displaying even though the code is correct.

**Why:** In the PortCo rollup change, dev needed an explicit re-backfill after the formula swap, and prod rows with stored old-formula bands would keep showing them after Republish (the client fallback only covers NULL stored values). Also: prod carried 187 assessment rows vs dev's 143 — never assume dev row counts or distributions apply to prod; query the prod replica before reporting.

**How to apply:** Any time a formula behind a stored derived column changes: (1) re-run the dev backfill, (2) plan the prod stored-value refresh explicitly (idempotent startup routine + Republish), (3) verify counts in the target environment rather than extrapolating from dev.
