---
name: INVESQ discovery/build job runner gotchas
description: Startup job-resume behavior and Notion integration sharing status for the admin firm discovery→build pipeline.
---

## Startup auto-resume fires real API calls against ANY queued/running job row

`resumeQueuedDiscoveryJobs()` / `resumeQueuedBuildJobs()` scan the `jobs` table for `status in (queued, running)` on every server boot and immediately re-run them — including rows left behind by manual/ad-hoc API testing (e.g. curling `/confirm` against a scratch firm).

**Why:** discovered when restarting the API server after adding the build-job runner picked up two stale test-firm build jobs from earlier manual testing and burned real Claude web-search calls against fake companies before this was noticed.

**How to apply:** before restarting the API server during dev/testing of these job runners, check the `jobs` table for stray `queued`/`running` rows tied to scratch/test firms and delete them (or let them finish and clean up the resulting firms/companies/assessments after) — otherwise every restart silently re-executes them.

## Notion "Portfolio Company Diagnostics" DB sharing gap

As of 2026-07-09, the Notion integration bot ("INVESQ Self-Serve", workspace "InvesQ") resolves fine and `NOTION_API_KEY` is valid, but `/v1/search` returns zero results — no databases/pages (including "Portfolio Company Diagnostics" and "fund profiles") are actually shared with the integration, despite the user believing they'd already shared them.

**Why:** the build-job Notion writer (`artifacts/api-server/src/lib/notion.ts`) searches by title at runtime rather than hardcoding a database id, so this shows up as a clean, logged "database not found or not shared" failure rather than a crash — but every company's Notion mirror will fail until sharing is actually fixed on the Notion side.

**How to apply:** if asked to debug "Notion write isn't working" for this project, verify sharing first (`/v1/search` from the integration's own key) before assuming a schema/property-mapping bug in `notion.ts`.
