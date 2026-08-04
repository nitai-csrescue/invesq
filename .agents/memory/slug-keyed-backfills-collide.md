---
name: Slug-keyed backfills collide with re-onboarded companies
description: Deleting and re-onboarding a tenant's companies reuses the same slugs, so any slug-keyed boot backfill silently re-stamps legacy data onto the fresh rows.
---

Rule: when a tenant is wiped and re-onboarded through the pipeline, audit every boot backfill keyed on `companies.slug` (or name) — the fresh rows regain the old slugs and get matched as if they were the legacy rows.

**Why:** After STG's 6 companies were re-onboarded via the real pipeline, the legacy ICP meta backfill stamped stale portfolioStatus/sectorCategory/investmentDate onto 5 of 6 (the 6th was never in its map). The portfolio engine's ICP rule is all-or-none per firm (any company having any ICP field makes all three fields required on every company), so partial stamping hard-failed validation and dropped the whole firm from the bootstrap — only visible after the next server restart.

**How to apply:** Before (or right after) any tenant wipe + re-onboard, grep boot routines for the tenant's company slugs and firm slug; remove or gate those entries. Also remember the ICP all-or-none rule when adding ICP fields to any company: stamp all companies in the firm or none.
