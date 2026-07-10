# INVESQ (project dir: cs-rescue)

## Overview

INVESQ is an investor-demo MVP for an automated **Operational Due Diligence** platform serving Private Equity and Venture Capital firms. It provides a "Ground Truth" layer that reconstructs the real customer journey across fragmented enterprise systems, surfacing operational risk before capital is committed.

The product was previously branded "CS Rescue" (an AI-driven Customer Success platform); the artifact slug and directory still use that name, but all user-visible chrome (Landing, Overview, Sidebar, page subtitles, AI Copilot output, Architecture map title, browser title) now says **INVESQ**. Underlying mock data (accounts, signals, playbooks) is still CS-flavored — it represents a sample portfolio company being assessed.

The Landing page (`/`) is the **Executive Brief** — Executive Summary, Market Problem, Proposed Solution with a Data → AI Analysis → Risk Output diagram, Core Pillars, Target ICP segments (Lean Growth Funds $100M–$500M, Scaling Mid-Market $500M–$2B), Founding Team (Jay Fox, Nitai Vinitzky), and Strategic Discussion Points.

The Architecture page (a true interactive React Flow graph) and AI Copilot still exist as a deeper "Platform" surface for technical buyers, but the primary entry points are now Landing → Overview → Dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24, **TypeScript**: 5.9
- **API**: Express 5, validated with Zod (Orval codegen)
- **Frontend**: React + Vite + Tailwind + shadcn/ui + Wouter routing
- **Graph (Architecture page)**: React Flow (`reactflow`)
- **Charts**: in-house lightweight SVG sparklines + bar/funnel cards (no Recharts dep used in new pages)
- **Data**: Tenant portal pages (`/:firmSlug/portfolio` and related routes) hydrate from Postgres via `/api/portfolio/bootstrap` (see "Database" below) — the static TS tenant files (`src/data/portfolio/{stg,pamlico,raviga,longarc,solen}.ts`) are kept only as a read-only backup/reference for the one-time migration and parity scripts, no longer imported by any live page. All other CS-product demo pages (accounts, signals, playbooks, actions, reports, etc.) still read local in-file mock data (`src/data/*`).
- **Auth**: Replit Auth (OIDC) gates `/admin/*`. See "Admin auth" below.

## Artifacts

- **cs-rescue** (preview path `/`) — React/Vite frontend (the demo)
- **api-server** (preview path `/api`) — Express backend. Serves the legacy Architecture / AI Copilot pages plus `/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`, `/api/mobile-auth/*` (Replit Auth).
- **mockup-sandbox** — component preview server

## Key Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run backend
- `pnpm --filter @workspace/cs-rescue run dev` — run frontend

## Persona switcher

The global persona switcher (`PersonaSwitcher`) reshapes several pages:

- **Persisted** to `localStorage` under `cs-rescue:persona`; survives reload + cross-tab.
- **Dashboard** (`src/pages/Dashboard.tsx`) renders a per-persona layout config (`PERSONA_LAYOUTS`) that controls KPI subset, section order, action queue filter, insight filter, and which playbooks/accounts surface. Customer persona collapses to a single-account "outside-in" snapshot.
- **Accounts** (`src/pages/Accounts.tsx`) defaults the owner filter to that persona's "current user" (`PERSONA_CURRENT_USER` in `src/lib/persona.tsx`), defaults status to `at-risk` for support, sorts by expansion potential for sales, and pins to a single account drawer for customer.
- **Reports** (`src/pages/Reports.tsx`) reorders the four trend cards and hides team capacity for customer.

## Information Architecture (post 2026-04-22 refactor)

**Bare layout (no shell):**
- `/` — **Landing** — hero + from→to + how-it-works + logo wall + feature trio + CTA
- `/overview` — **Investor pitch** — 7-section narrative (Problem · Insight · Shift · Solution · How · Why we win · Vision)

**Shell layout:**

Sidebar group `Product`
- `/dashboard` — KPIs · at-risk + expansion tables · AI insight rail · recommended actions · active playbooks
- `/accounts` — Filterable book of business with right-side Sheet drawer (Summary / Rollouts / Usage / Risk / Expansion / Activity / Actions). The Rollouts tab lists every Deployment for the account (`getDemoDeploymentsForAccount`) with name, stage, and health score; each row deep-links to `/platform/ai-copilot?accountId=&deploymentId=` for that specific rollout.
- `/signals` — 5 category blocks (Churn, Expansion, Adoption, Renewal, Support) + live signal feed
- `/playbooks` — Tabbed library + drawer with steps, outcomes, active accounts, Run CTA (toast on run)
- `/actions` — Queued / In Progress / Completed tabs with status transitions (toasts)
- `/reports` — Net retention, expansion funnel, playbook impact, TTV, team capacity

Sidebar group `Configure`
- `/integrations` — 9 integrations across 6 categories with status pills (connected / mock / planned)
- `/settings` — Workspace, Team, Scoring thresholds, AI prefs, Notifications

Sidebar group `Platform` (demoted, kept for technical buyers)
- `/platform/architecture` — original React Flow graph
- `/platform/ai-copilot` — supports `?prompt=&accountId=&deploymentId=&persona=&autoRun=1` deep-link (from the Dashboard insight rail and the Accounts drawer Rollouts tab); `deploymentId` pre-selects a specific rollout

`/admin` (internal, unlinked from the sidebar) — gated by Replit Auth (Google OAuth via `@csrescue.com` allowlist), see "Admin auth" below. Includes a firm-onboarding flow: `/admin/firms` (list), `/admin/firms/:id` (`FirmReview.tsx` — add/select companies, confirm & queue a real build job, plus the Export panel described below). See "AI-powered firm onboarding" below for the discovery/build job pipeline behind this flow.

**Redirects:**
- `/resources`, `/deployments`, `/connectors` → `/overview` (files kept in `src/pages/` with archive header, not routed)
- `/ai-copilot` → `/platform/ai-copilot`

## Mock data layer

All new pages read from `src/data/*` — one coherent universe of 18 accounts, 7 team members, 10 signal definitions + 12 fired events, 10 playbooks, 19 actions, 3 AI insights, 9 integrations, and metrics derived from accounts. Fully self-consistent.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/auth/user` | Current auth state (`{ user: AuthUser \| null }`) |
| GET | `/api/login` | Redirects to Replit OIDC (`?returnTo=` supported) |
| GET | `/api/callback` | OIDC callback — creates session, sets cookie |
| GET | `/api/logout` | Clears session, redirects to OIDC end-session |
| POST | `/api/mobile-auth/token-exchange` | Mobile token exchange |
| POST | `/api/mobile-auth/logout` | Mobile session logout |

(Original architecture/copilot endpoints are still served — see legacy `Resources.tsx`/`Deployments.tsx`/`Connectors.tsx` archive files.)

## Admin auth (`/admin`)

- `/admin` is client-side gated: `ProtectedRoute` (`src/lib/protected-route.tsx`) calls `useAuth()` from `@workspace/replit-auth-web` and redirects to `login()` when not authenticated. It is placed above the `/:firmSlug/*` wildcard routes in `App.tsx` so `admin` is never swallowed as a firm slug.
- Access is restricted to `@csrescue.com` email addresses. Replit's OIDC claims don't expose which upstream identity provider (Google, etc.) was used, so an email-domain allowlist (`isAllowedAdminEmail` in `artifacts/api-server/src/lib/auth.ts`) is the enforceable proxy for "Google accounts on csrescue.com" — every account on that Workspace domain authenticates via Google.
- Enforcement is server-side and defense-in-depth:
  1. **Primary**: `routes/auth.ts` checks the domain on the OIDC callback (and mobile token-exchange) claims *before* `createSession`/`upsertUser` — a rejected login never gets a session cookie or a users-table row.
  2. **Secondary**: `authMiddleware` re-checks every session's stored email on each request and clears any session that fails, in case a session predates a policy change.
- This auth layer applies globally (`app.use(authMiddleware)` in `app.ts`) but only *populates* `req.user` — it never blocks a request on its own. **Every route under `/api/admin/*` additionally requires `requireAdminAuth`** (`router.use(requireAdminAuth)` at the top of `routes/admin.ts`, in `middlewares/authMiddleware.ts`), which 401s any request with no authenticated, allowlisted `req.user`. This was added 2026-07-10 after discovering the whole `/api/admin/*` API (create firm, confirm/build, report-data, etc.) was reachable with zero server-side auth — only the client-side `/admin` page redirect and one endpoint (`seed-legacy-tenants`) were actually gated. Every other route in the app remains public and behaves exactly as before.

## Export panel (`/admin/firms/:id`)

`FirmReview.tsx` includes an Export panel (`src/pages/admin/ExportPanel.tsx`) that assembles a `report-data.json` payload matching the real Notion-documented "External CS Diagnostic — Scoring Rubric & Cowork Instructions" (Step 7) schema. It does not call Claude directly for the PDF/PPTX itself — but it now generates the report's narrative content via its own Claude pipeline (see "Report export generation pipeline" below), so the payload is fully populated rather than blank.

- **Default view (2026-07-10)**: the panel's default output is the rendered `AdminReportPreview.tsx` (composite/tier header, the shared `PillarScorecard.tsx` — same component the public `/portfolio/[company]` pages use, now also showing each pillar's `pillarSignals` line alongside its evidence — plus exec summary, composite context, existing systems, path forward, CS-leadership recommendation, gaps, and next steps). The raw `report-data.json` is **never shown in the UI**; a "Copy prompt" button still copies it to the clipboard (unseen) for the manual paste-to-Claude PPTX/PDF workflow. Before removing the old `<pre>{json}</pre>` block, every `DiagnosticReportData` field was audited against `AdminReportPreview.tsx` to confirm nothing was visible only in the JSON — `pillarSignals` was the one gap found and is now rendered via a new optional `signals` prop on `PillarScorecard.tsx` (backward-compatible; the public portfolio pages don't pass it and are unaffected).

- Company picker is restricted to companies with `hasAssessment: true` (a field computed server-side by checking for at least one `assessments` row per company, returned on `Company` from `GET /api/admin/firms/:id`).
- `GET /api/admin/companies/:id/report-data` returns `AdminCompanyReportData` (`lib/api-spec/openapi.yaml`), nested as `{ reportData, meta }`: `reportData` is the spec-exact `DiagnosticReportData` payload (rendered by `AdminReportPreview.tsx` and copied into the Claude prompt); `meta` (`companyId`, `assessmentDate`, `composite`, `compositeMax`, `tier`, `generatedAt`, `model`) is display-only bookkeeping kept out of the exported JSON so the copy-to-clipboard prompt matches the Notion schema field-for-field. `generatedAt`/`model` are `null` until a narrative has been generated (see below).
- `reportData.scores` are raw `number | "NA"` per pillar (never the DB's stringified `"0"/"1"/"2"`), re-derived via `@workspace/portfolio-engine`'s `PILLARS`/`getTier`/`textToScore` (same NA→1 tier-composite substitution as the rest of the app). `parentFund` is the firm's `name` — there is no separate "parent fund" field in the schema.
- Derived with zero Claude calls, always present even before narrative generation: raw `scores`, `gaps[].title`/`description` (the 3 lowest-scoring pillars, NA treated as 1 so an unscored pillar isn't auto-flagged as worst; `description` falls back to the pillar's static `gapNote` when no Claude evidence narrative exists on the underlying `assessments` row — true for the 5 migrated legacy tenants, which predate the Claude-scored build pipeline), and the CS-leadership label component of `p6Recommendation` ("Retain and Develop" / "Augment" / "Replace" from the p6 score).
- `preparedForName`/`preparedForTitle` are left blank (no recipient data exists anywhere in the app). `reportDate` defaults to today; `assessmentDate` (in `meta`) is the source assessment's date. `csHeadcount` remains blank — no data source exists for it.
- The panel's "Client PDF" vs "Editable" toggle only changes the wording of the copy-to-clipboard prompt (target format PDF vs PPTX) — the underlying JSON is identical either way.
- **Known gap, mitigated at render time (2026-07-10, widened same day)**: `gaps[].description` and `pillarEvidence.p6` are both verbatim passthroughs of the underlying assessment's CS-Leadership pillar evidence text (from the separate scoring pipeline, see "AI-powered firm onboarding" below) and are NOT rewritten by the narrative generator — if that upstream evidence names an individual (common for the CS-Leadership pillar), the name used to leak straight into both fields. A targeted, **render-time-only** redaction (`artifacts/api-server/src/lib/nameRedaction.ts`, applied inside `reportExport.ts`'s shared `toResponse()` funnel via `sanitizeReportData()`) now heuristically strips named individuals out of (a) `gaps[].description` specifically when `gap.title === "CS Leadership"`, and (b) `pillarEvidence.p6` unconditionally (it's always that one pillar's evidence), replacing them with "the current CS leader". `pillarEvidence.p6` was brought into scope because it's part of the client-facing report schema — it renders in the exported PDF's pillar-by-pillar narrative, not just an internal admin debug view — so it carried the same client-facing risk as the gap description. This is a display-time filter, not a data migration: it does not touch the `assessments` table, does not rewrite any of the 137+ existing assessment rows' stored `pX_evidence`, and does not bump `RUBRIC_VERSION` — it applies uniformly to freshly-generated and already-cached `report_exports` rows alike, and to any future consumer that reuses `getReportData`/`getOrGenerateReportExport`. Verified against Fullbay (company 34): the raw stored `p6_evidence` ("CS is led by Kendra Fromm at the Director level...") is unchanged in the DB, but both `gaps[].description` (CS Leadership) and `pillarEvidence.p6` now serve "...led by the current CS leader at the Director level..." — while `pillarEvidence.p1`/`p2`/`p3`/`p4`/`p5`/`p7`/`p8` (including `p1`, which also happens to name the same person) and the other two gap descriptions came back byte-identical to before. **Residual, intentionally out of scope**: pillar evidence for pillars other than CS-Leadership (e.g. `pillarEvidence.p1` naming the same person in a different context) is left untouched — the redaction is scoped to the CS-Leadership pillar only, since names are only a policy concern there. Fully closing that would mean either widening the redaction call site further or changing the `scoring.ts` prompt/pipeline that produced the original evidence (a separate, previously-shipped system affecting 137+ existing assessment rows) — treated as an explicit follow-up, not silently touched here.

## Report export generation pipeline (`report_exports` table)

The Export panel's narrative fields (`execSummary`, `compositeContext`, `existingSystems`, `pathForward`, `pillarSignals`, `gaps[].impact`/`recommendation`, `nextSteps`, and the evidence portion of `p6Recommendation`) are generated by Claude and persisted, rather than left blank.

- `artifacts/api-server/src/lib/reportExport.ts` is the orchestration library. `getReportData(companyId)` (used by `GET /api/admin/companies/:id/report-data`) is cache-only and never calls Claude — safe to call from a page load/refetch. `getOrGenerateReportExport(companyId)` (used by `POST /api/admin/companies/:id/report-export`) generates via Claude on first call and persists to the `report_exports` table (`lib/db/src/schema/reportExports.ts`, keyed by `assessmentId` + `rubricVersion`); subsequent calls for the same assessment + rubric version return the cached row with zero additional Claude spend.
- The narrative prompt grounds itself in the same Notion "External CS Diagnostic — Scoring Rubric & Cowork Instructions" page used elsewhere (`fetchScoringRubricText()` in `notion.ts`, ~12.6k chars, falls back to a rubric built from `PILLARS` if Notion is unreachable) plus the company's already-scored pillar data — it never invents new facts/scores/evidence.
- **Tone policy (strict)**: forward-looking and structural, never personal judgments about individuals, and — critically — the prompt explicitly forbids echoing any named individual found in the evidence it's given (see `.agents/memory/report-export-tone-policy.md`: a generic "don't judge people" instruction is not sufficient when the input evidence itself names someone; the prompt must say so explicitly). This was caught and fixed during verification — an early version reproduced a real exec's name and a personal-competency judgment in `p6Recommendation`; `p6Recommendation`'s evidence portion is now a fresh Claude-written structural rationale (title level / reporting line / mandate scope only), not a raw echo of the underlying assessment's p6 evidence text.
- `RUBRIC_VERSION` (currently `"v5"`) is bumped whenever the prompt or output shape changes meaningfully; a bump naturally produces a fresh `report_exports` row on next generation instead of serving stale-format/stale-policy rows as current. Old rows are never mutated or deleted. History: v3 added the no-em-dash tone rule; v4 fixed a hardcoded em-dash separator baked into `p6Recommendation`; v5 fixed em-dashes in `@workspace/portfolio-engine`'s `PILLARS[].gapNote` (flows into `gaps[].description` when a pillar has no Claude evidence narrative).
- Model: `claude-sonnet-4-6`. `ExportPanel.tsx` has a "Generate/Regenerate narrative" button; `AdminReportPreview.tsx` shows a "generated" badge with timestamp once `meta.generatedAt` is set, else a "not yet generated" badge.
- Verified end-to-end against Mainsail Partners/Fullbay (company id 34, composite 12/16, Tier 3 · Developing): a real Claude generation call (~55-60s) produced fully-populated, citation-grounded narrative for all fields with no named individuals anywhere in the generated content, via a temporary dev session (deleted after verification).
- **No-em-dash policy is enforced in three independent layers, not just the Claude prompt (2026-07-10)**: (1) the narrative prompt instructs Claude not to use em-dashes; (2) `stripEmDashes`/`sanitizeNarrativeEmDashes` in `reportExport.ts` deterministically strip any em-dash Claude produces anyway from every narrative field post-generation — added after a clean generation was followed by one with 18 em-dashes despite an unchanged strict prompt, proving prompt-only compliance is unreliable; (3) all static template copy in `artifacts/api-server/src/lib/pdf/` (`staticCopy.ts`, page templates, `reportHtml.ts`, `page1Cover.ts`'s blank-value placeholder) and the shared `PILLARS`/`TIERS` copy in `lib/portfolio-engine/src/pillars.ts` (`gapNote`, `engagement`, `measures`, `peValue`) had their own hardcoded em-dashes fixed, since those render into the PDF independently of any Claude call. **Residual, intentionally out of scope**: raw `pillarEvidence`/`gaps[].description` text that passes through verbatim from the separate `scoring.ts` Claude pipeline (see "AI-powered firm onboarding" above) can still contain em-dashes — fixing that would mean changing the scoring prompt itself, which affects 137+ existing assessment rows, same scope boundary already established for the name-redaction gap above.

## AI-powered firm onboarding: discovery + build jobs (`/admin/firms/:id`)

Confirming a firm's portfolio companies in `FirmReview.tsx` kicks off a real, asynchronous two-job pipeline (`artifacts/api-server/src/lib/jobs/{discovery,build}.ts`) backed by the `jobs` table. Both call Claude directly via `ANTHROPIC_API_KEY` (`artifacts/api-server/src/lib/anthropic.ts` — NOT the Replit AI Integrations proxy) with the `web_search_20250305` tool, and both are fire-and-forget from their route handler (response returns immediately; the job runs in the background and persists its own status/progress/error onto its `jobs` row).

- **Discovery** (`POST /api/admin/firms` on create): researches the firm's real, current portfolio via web search and inserts 0–5 verified `companies` rows with `status: "candidate"`. Never invents a company — if it can't verify a holding, it's left out (may return 0 candidates).
- **Confirm** (`POST /api/admin/firms/:id/confirm`): flips the picked companies to `status: "active"` (rest to `"excluded"`), firm to `status: "reviewed"`, inserts a `type: "build"` job, then fires `runBuildJob`.
- **Build** (`runBuildJob` in `build.ts`): for each `active` company under the firm, calls Claude (`lib/jobs/scoring.ts`, same `PILLARS` rubric — measures/signals — as the rest of the app) to score all 8 pillars as `0`/`1`/`2`/`"Insufficient Data"` with 1–3 sentence evidence per pillar, grounded in web search. The prompt explicitly forbids guessing on thin signal — anything under-evidenced must come back `"Insufficient Data"`, never a guessed 0/1/2.
  - Writes one `assessments` row per company (Postgres is the source of truth; this write must succeed for the company to count as scored).
  - Best-effort mirrors the same scores/evidence to Notion's "Portfolio Company Diagnostics" DB (`lib/notion.ts`, raw `fetch` against the Notion API, `NOTION_API_KEY`, no SDK dependency added). Property names/types in that DB are discovered at runtime (title/type search, not hardcoded) since this integration doesn't own that schema. A Notion failure is logged clearly but **never** fails the job or blocks the Postgres write — see the sharing-gap note below.
  - Updates `jobs.progressPct` after each company; marks the job `"completed"` and the firm `"ready"` only once every active company is scored. If any company's Claude call fails, the whole job is marked `"failed"` (assessments already written for prior companies in the loop are kept — they're independent Postgres writes).
- **Startup resume**: both `resumeQueuedDiscoveryJobs()` and `resumeQueuedBuildJobs()` run on server boot (`index.ts`) and re-execute ANY `jobs` row still `queued`/`running` — including stray rows from manual/ad-hoc testing. Clean up scratch `jobs`/`companies`/`firms` rows before restarting the API server, or they'll silently re-fire real Claude calls.
- **Notion sharing gap — resolved 2026-07-10**: as of 2026-07-09 the Notion integration's `NOTION_API_KEY` was valid (bot resolved fine) but no databases were shared with it yet, so every build job's Notion mirror failed (logged, non-fatal). Nitai shared the "Portfolio Company Diagnostics" database with the integration on 2026-07-10, and a re-triggered build job (scratch firm, since deleted) confirmed the mirror now succeeds with no code change — `notion.ts` resolved the database and its schema at runtime as expected.
- Verified end-to-end against a real firm: Mainsail Partners (id 10, mainsailpartners.com) → discovered Syncro/MirrorWeb/Fullbay → confirmed all 3 → build job scored all 8 pillars with real, citation-backed evidence for each (e.g. Fullbay p1=2 citing a named CS director + JD role separation + Gainsight in its stack) → firm flipped to `"ready"`. Notion mirror failed as expected per the gap above; Postgres writes succeeded for all 3 companies.

### Job progress/ETA and build-complete email

- `jobs.progressPct`/`jobs.etaSeconds` are driven by `createJobTicker(jobId, totalMs)` in `lib/jobs/common.ts`: it ticks progress up every 3s toward a per-slice cap and recomputes `etaSeconds` from real wall-clock elapsed time against the job's overall time budget, so a multi-slice job (build scores one company per slice) gets one coherent countdown across all its companies instead of one that resets per company. Discovery's budget is a flat 45s; build's budget is `90s × active company count`. The ticker only drives the displayed number — it never delays real completion, so a job that finishes faster than its budget (e.g. a quick Claude response) completes immediately at 100%, it doesn't stall waiting for the budget to elapse.
- `firms.createdByEmail` (nullable) is captured from `req.user?.email` on `POST /api/admin/firms` (i.e. whichever `@csrescue.com` admin created the firm). When `runBuildJob` flips a firm to `"ready"`, it calls `sendBuildCompleteEmail()` (`lib/email.ts`) — a plain-text email via the Resend API (raw `fetch`, no SDK, `RESEND_API_KEY`; `RESEND_FROM_EMAIL` overrides the default `onboarding@resend.dev` sender) with a subject and a link to the firm's admin review page — only if `createdByEmail` is set. The send never throws and is logged either way (including the Resend message id on success); a failed/skipped send never fails the build job.
- Admin UI reflects "ready": `JobStatus.tsx` shows a green completed-build banner with a "View firm" link once a `build` job's status is `"completed"` (plus a red banner surfacing `job.error` on `"failed"`); `FirmReview.tsx` shows a green "Diagnostic build complete" banner whenever `firm.status === "ready"`, including a "Notified `<email>`" chip when `createdByEmail` is set.
- Verified end-to-end against a real firm created and confirmed via the API (not just Mainsail): discovery progress/ETA advanced visibly during the wait (e.g. 20% / ~72s remaining partway through the 90s build budget for a single confirmed company), the build job completed and flipped the firm to `"ready"`, a real Resend email was sent to `nitai@csrescue.com` with a returned message id, and the admin UI screenshot (via a temporary dev-only session, since real Google OAuth isn't available in this environment) showed both the ready banner and the "Notified" chip. The scratch firm/companies/assessments/jobs/session used for this run were deleted afterward — they weren't kept as sample data.

## Database

Postgres (Replit built-in) via `@workspace/db` (Drizzle). Tables: `users`, `sessions` (Replit Auth), `firms`, `companies`, `assessments`, `jobs` (schema in `lib/db/src/schema/*`). `firms`/`companies`/`assessments` are now the live source for the tenant portal pages (see "Tenant portal DB cutover" below); `jobs` now drives the discovery/build pipeline above.

### One-time portfolio data migration

`artifacts/cs-rescue/scripts/migrate-portfolio-to-db.ts` (run once via `pnpm --filter @workspace/cs-rescue run migrate-portfolio`) copied the 5 tenants' hardcoded portfolio data (`src/data/portfolio/{stg,pamlico,raviga,longarc,solen}.ts`) into `firms`/`companies`/`assessments`. It is read-only against the TS files — it never modifies them — and refuses to run again once `firms` has any rows, so it can't double-insert.

- 5 firms, 27 companies, 137 assessments (full assessment history per company, not just the latest — Raviga alone contributes 120 of those, 12 monthly assessments × 10 companies).
- `assessments.p1`..`p8` map 1:1 to `PILLARS` order in `src/data/portfolio/pillars.ts` (`org, onboarding, health, escalation, revenue, leadership, planning, ai`); `"NA"` is stored literally for null/insufficient-data scores.
- The `companies` table has no field for `RawCompany`'s id/sector/hq/ARR/etc. — only `name` migrated, matching the existing schema. Do not assume DB companies carry that richer data; it still only lives in the TS files.
- Verified after running: recomputing company count, tier distribution, and average composite straight from the inserted DB rows (independently re-deriving tier/composite logic from the DB text values) matched the live `engine.ts`-computed values exactly for all 5 tenants, with 0 mismatches.

### Tenant portal DB cutover

The tenant portal routes (`/:firmSlug/portfolio` and the Raviga-specific findings/benchmarks/risk/gameplan sub-routes, plus `/firms`) now read live from Postgres instead of the static TS tenant files:

- `artifacts/api-server/src/lib/portfolioData.ts` loads `firms`/`companies`/`assessments` from the DB, reshapes rows back into the original `RawCompany` shape, and runs the existing `validateFirmData` at server startup (before the server accepts traffic) — a validation failure here is a boot-time failure, not a silently-served bad response. Exposed via `GET /api/portfolio/bootstrap`.
- On the frontend, `src/data/portfolio/PortfolioDataProvider.tsx` fetches that endpoint once (via the generated `useGetPortfolioBootstrap` hook) and calls `engine.ts`'s `hydratePortfolioData()`, which runs the *same* unchanged `buildCompany`/`computeSummary`/`validateFirmData` pipeline against the fetched data. `PortfolioGate` (also in that file) blocks rendering of firm-scoped routes only until hydration completes, so `engine.ts`'s query API (`getFirmCompanies`, `getFirmSummary`, etc.) stays fully synchronous for every consumer page — no page-level changes were needed.
- The static TS tenant files (`stg.ts`, `pamlico.ts`, `raviga.ts`, `longarc.ts`, `solen.ts`) are no longer imported by `engine.ts` or any live route. They're still imported by two backup/reference scripts: `migrate-portfolio-to-db.ts` (the one-time migration, guarded so it can't re-run once `firms` has rows) and `scripts/verify-portfolio-parity.ts` — a standalone, zero-write script (`pnpm --filter @workspace/cs-rescue run verify-portfolio-parity`) that recomputes each tenant's companyCount/tierCounts/avgComposite from the files and independently from the DB and diffs them; re-run anytime to confirm the DB hasn't drifted from the original data.
- `firms.ts` (the static `FIRMS`/`FIRMS_BY_SLUG` registry — slugs, display names, status labels) is intentionally **not** part of this cutover; it's metadata, not portfolio data, and stays a static file.

### Production data repair: legacy tenant seed endpoint

`POST /api/admin/seed-legacy-tenants` (admin-only, same auth gate as the rest of `/admin`) exists to fix production databases that are missing some or all of the 5 legacy demo tenants (`stg`/`pamlico`/`raviga`/`longarc`/`solen`) — e.g. because the DB was provisioned after `migrate-portfolio-to-db.ts` had already been run once elsewhere, or a deploy target never got the one-time migration.

- Implementation: `artifacts/api-server/src/lib/seedLegacyTenants.ts`. Raw portfolio data lives in `lib/portfolio-engine/src/data/*` (moved there from the cs-rescue-only TS files so the server can import it without depending on the frontend package).
- Per-slug, idempotent, and additive-only: for each of the 5 slugs, it checks whether a firm with that exact slug already exists; if so it is left completely untouched and reported `"skipped"` with a reason. Only missing slugs get a `db.transaction`-wrapped insert (firm + companies + assessments). Safe to call repeatedly, including against a DB that already has all 5, or one with only some of them.
- This is slug-exact matching, so it cannot collide with an unrelated real client firm even if the display name looks similar (e.g. the legacy demo tenant slug is `pamlico`, distinct from any real client firm that might be named/slugged `pamlico-capital`).
- Pre-flight validates each tenant's data via `buildFirmPortfolio` before any write, and calls `invalidatePortfolioCache()` afterward if anything was seeded, so `/api/portfolio/bootstrap` picks up newly-seeded tenants without a server restart.
- UI: a "Seed legacy demo tenants" card on `/admin` (`AdminHome.tsx`) calls this via the generated `useSeedLegacyTenants` hook and renders a per-slug result table (seeded/skipped + counts + reason).
- Verified in dev: with all 5 tenants already present, calling it reports all 5 as `"skipped"` with the correct existing firm ids, zero rows written.
