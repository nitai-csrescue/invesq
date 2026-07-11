---
name: INVESQ discovery/build job runner gotchas
description: Startup job-resume behavior and Notion integration sharing status for the admin firm discovery→build pipeline.
---

## Startup auto-resume fires real API calls against ANY queued/running job row

`resumeQueuedDiscoveryJobs()` / `resumeQueuedBuildJobs()` scan the `jobs` table for `status in (queued, running)` on every server boot and immediately re-run them — including rows left behind by manual/ad-hoc API testing (e.g. curling `/confirm` against a scratch firm).

**Why:** discovered when restarting the API server after adding the build-job runner picked up two stale test-firm build jobs from earlier manual testing and burned real Claude web-search calls against fake companies before this was noticed.

**How to apply:** before restarting the API server during dev/testing of these job runners, check the `jobs` table for stray `queued`/`running` rows tied to scratch/test firms and delete them (or let them finish and clean up the resulting firms/companies/assessments after) — otherwise every restart silently re-executes them.

## Build/discovery write paths: re-score replaces, discovery dedups (resolved)

Originally (through prod incident 2026-07-10) the build job blind-`INSERT`ed one `assessments` row per active company with no `(companyId, date)` check, so repeat same-day jobs quadruple-inserted genuinely-different Claude passes; discovery had the same no-dedup gap and produced duplicate company rows (same normalized name) from one job's two result batches. Both are now fixed: `scoreAndPersistCompany` **replaces** the existing same-day row in a transaction (delete FK children, then the assessment, then insert), and discovery skips a candidate whose normalized name matches a non-excluded company in the firm (plus intra-batch dups).

**Why:** a DB-level unique index alone (`assessments_company_date_uq`) does NOT degrade gracefully — a raw insert conflict throws and fails the whole job partway through. The app-level replace/skip is what makes a retry safe.

**How to apply:** the re-score transaction must delete EVERY table that FKs `assessments.id` before deleting the assessment, or the delete FK-violates. Today that is `report_exports`, `findings`, and `notion_sync_state` (the last has zero writers now — Phase 5 — but is deleted anyway so wiring it later can't turn a re-score into an FK landmine). Any new child table of `assessments` must be added to this delete list. Re-score does not regenerate `findings`; they are re-fanned-out by `scripts/backfill-unified-db.ts`, so `verify-db-invariants` (exactly 8 findings/assessment) only passes after that script runs — true for fresh builds too.

## Notion "Portfolio Company Diagnostics" DB sharing gap (resolved 2026-07-10)

As of 2026-07-09, the Notion integration bot ("INVESQ Self-Serve", workspace "InvesQ") resolved fine and `NOTION_API_KEY` was valid, but `/v1/search` returned zero results — no databases/pages (including "Portfolio Company Diagnostics" and "fund profiles") were actually shared with the integration, despite the user believing they'd already shared them.

**Why:** the build-job Notion writer (`artifacts/api-server/src/lib/notion.ts`) searches by title at runtime rather than hardcoding a database id, so this showed up as a clean, logged "database not found or not shared" failure rather than a crash.

**How to apply:** if asked to debug "Notion write isn't working" for an integration that resolves by title/search at runtime, verify sharing first (`/v1/search` from the integration's own key) before assuming a schema/property-mapping bug. Confirmed fixed 2026-07-10 once the database was actually shared — no code change was needed, matching the "runtime resolution" design.
