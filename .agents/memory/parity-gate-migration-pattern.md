---
name: Parity-gate migration pattern
description: The reusable pattern this codebase already established for safely migrating/backfilling data — recompute independently and diff, never silently reconcile a mismatch.
---

When migrating or backfilling derived data (rollups, composites, tiers, counts) from one representation to another, don't trust a straight copy. Recompute the derived values independently from the destination using the same shared computation logic the app already uses for reads, then diff against the source's own claimed values.

INVESQ's `migrate-portfolio-to-db.ts` does this: after inserting rows, it recomputes each tenant's `companyCount`/`avgComposite`/`tierCounts` purely from what's now in Postgres (via the same engine function the live app uses) and compares it against the pre-migration file-based summary. Any mismatch sets a nonzero exit code and prints exactly which tenant/field disagreed — it never auto-corrects or averages the two. `verify-portfolio-parity.ts` re-runs the same two-path comparison on demand, indefinitely, with zero writes, so parity can be re-checked long after the original migration.

**Why:** a migration that "looks successful" (row counts match) can still silently corrupt derived values if the copy logic and the read logic disagree on an edge case (e.g. how `NA`/null scores fold into a composite). Independent recomputation + fail-loud diffing catches that class of bug that a naive row-count check would miss.

**How to apply:** for any future data migration/backfill in this codebase (or a similar derived-data system), reuse this shape: (1) migrate/backfill, (2) recompute derived values from the destination using the shared domain logic, (3) diff against the source's own summary, (4) exit nonzero and print every mismatch — never silently reconcile. Keep the verification script runnable indefinitely after the migration, not just as a one-time gate.
