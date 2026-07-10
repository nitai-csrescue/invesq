---
name: INVESQ discovery/build job runner gotchas
description: Startup job-resume behavior and Notion integration sharing status for the admin firm discovery→build pipeline.
---

## Startup auto-resume fires real API calls against ANY queued/running job row

`resumeQueuedDiscoveryJobs()` / `resumeQueuedBuildJobs()` scan the `jobs` table for `status in (queued, running)` on every server boot and immediately re-run them — including rows left behind by manual/ad-hoc API testing (e.g. curling `/confirm` against a scratch firm).

**Why:** discovered when restarting the API server after adding the build-job runner picked up two stale test-firm build jobs from earlier manual testing and burned real Claude web-search calls against fake companies before this was noticed.

**How to apply:** before restarting the API server during dev/testing of these job runners, check the `jobs` table for stray `queued`/`running` rows tied to scratch/test firms and delete them (or let them finish and clean up the resulting firms/companies/assessments after) — otherwise every restart silently re-executes them.

## Build job has no idempotency guard — repeat runs quadruple-insert assessments

`scoreAndPersistCompany` (in `build.ts`) unconditionally `INSERT`s a new `assessments` row per active company on every build job run — no check for an existing `(companyId, date)` row first, no upsert.

**Why:** discovered in production (2026-07-10): one firm had 4 separate `build` jobs run against it (3 back-to-back within ~9 min, 1 about 18.5h later, same calendar date) and ended up with exactly 4 assessment rows per company for the same date — each a distinct, independently-generated Claude scoring pass (different evidence text/scores every time), so none of them are byte-identical duplicates; they're 4 genuinely different "duplicates" with no automatically-safe way to collapse them.

**How to apply:** before relying on `assessments_company_date_uq` (or any DB-level unique constraint) to catch this, add an app-level check-before-insert (or explicit re-score-replaces-today's-row semantics) in `scoreAndPersistCompany` — otherwise a raw insert conflict will throw and fail the whole job partway through instead of degrading gracefully. Also: discovery's company-insert step has the same gap (no within-run dedup), which produced a duplicate company row (same normalized name) from a single discovery job's two result batches.

## Notion "Portfolio Company Diagnostics" DB sharing gap (resolved 2026-07-10)

As of 2026-07-09, the Notion integration bot ("INVESQ Self-Serve", workspace "InvesQ") resolved fine and `NOTION_API_KEY` was valid, but `/v1/search` returned zero results — no databases/pages (including "Portfolio Company Diagnostics" and "fund profiles") were actually shared with the integration, despite the user believing they'd already shared them.

**Why:** the build-job Notion writer (`artifacts/api-server/src/lib/notion.ts`) searches by title at runtime rather than hardcoding a database id, so this showed up as a clean, logged "database not found or not shared" failure rather than a crash.

**How to apply:** if asked to debug "Notion write isn't working" for an integration that resolves by title/search at runtime, verify sharing first (`/v1/search` from the integration's own key) before assuming a schema/property-mapping bug. Confirmed fixed 2026-07-10 once the database was actually shared — no code change was needed, matching the "runtime resolution" design.
