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

## Discovery writes companies as "candidate", not "active" — confirm promotes them

Discovery inserts portfolio companies with `status: "candidate"`; only `POST /admin/firms/:id/confirm` promotes a chosen subset to `active` (and marks every other company in the firm `excluded`, then fires the build). Manual add-company inserts as `active` directly.

**Why:** an admin recovery/review UI that computes its "companies to score" set as `filter(status === "active")` silently hides every discovery candidate, makes a firm that DID find companies look empty, and — worse — its confirm call passes only the active IDs, so confirming EXCLUDES the good candidates. The startup seeder's idempotency guard counts non-excluded (candidate + active) companies, so a firm with candidates-only is correctly skipped by the seeder yet still stuck at `pending` with no active rows — the two must agree on the same "eligible = not excluded" definition.

**How to apply:** any UI/query that decides which companies are eligible for confirm/build/display must use `status !== "excluded"` (candidate + active), never `status === "active"`. Confirm accepts the selected subset; unselected non-excluded companies become excluded.

## Notion writer resolves its target DB by title/search at runtime

The build-job Notion writer (`artifacts/api-server/src/lib/notion.ts`) searches by title at runtime rather than hardcoding a database id, so a database that is not shared with the integration surfaces as a clean, logged "database not found or not shared" failure rather than a crash.

**How to apply:** if asked to debug "Notion write isn't working" for an integration that resolves by title/search at runtime, verify sharing first (`/v1/search` from the integration's own key) before assuming a schema/property-mapping bug — an unshared DB looks identical to a missing one.

## Boot routines must not fire jobs the resume scan will also pick up
A startup routine that inserts a queued build job AND calls runBuildJob directly races the subsequent resumeQueuedBuildJobs() scan — the scan reclaims even running jobs (allowReclaimRunning), so the same firm can be researched twice concurrently. Rule: boot-time queuers only insert the queued row (conflict-aware against the partial unique index on type+targetId) and let the resume scan be the single executor. Also: stamp the "restored" marker at queue time only if a state-driven retry branch re-queues when companies remain assessment-less with no active job (covers terminal build failures).
