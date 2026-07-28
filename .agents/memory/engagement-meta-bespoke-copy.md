---
name: companies.meta.engagement carries bespoke copy
description: meta.engagement is NOT always the TIERS boilerplate; many rows have hand-curated narratives, so backfills must exact-match retired strings, never recompute-and-overwrite.
---

Most companies' `meta.engagement` strings are hand-written, per-company narratives (Raviga demo companies, curated STG/Pamlico strings) that deliberately differ from the `TIERS[tier].engagement` boilerplate that `jobs/build.ts` bakes in.

**Why:** a 2026-07-28 backfill that recomputed engagement from tier for all companies overwrote 24 curated strings; they had to be restored verbatim from the boot log's `from:` values. Only 3 rows (Long Arc: CircleBlack, Concertiv, Tinubu) were genuinely stale boilerplate.

**How to apply:** any sweep over stored engagement (or similar baked-at-build meta copy) must be an exact-match rewrite of known retired strings, never "recompute canonical value and overwrite if different". More generally: before bulk-updating a meta field, sample its values across tenants to check whether it is uniform boilerplate or curated content. Also: log `from`/`to` on every row a backfill touches — it is the only recovery path if scope was wrong.
