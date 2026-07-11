# INVESQ (project dir: cs-rescue)

## Overview

INVESQ is an investor-demo MVP for an automated **Operational Due Diligence** platform for PE/VC firms. It provides a "Ground Truth" layer that reconstructs the real customer journey across fragmented enterprise systems, surfacing operational risk before capital is committed.

Formerly branded "CS Rescue" (an AI Customer Success platform). The artifact slug and directory still use that name, but **all user-visible chrome must say INVESQ, never "CS Rescue"** (Landing, Overview, Sidebar, subtitles, AI Copilot output, Architecture title, browser title). Underlying CS-flavored mock data (accounts, signals, playbooks) represents a sample portfolio company being assessed.

Landing (`/`) is the **Executive Brief**. Architecture (React Flow graph) and AI Copilot are a deeper "Platform" surface for technical buyers; the primary flow is Landing → Overview → Dashboard.

## Stack

- **Monorepo**: pnpm workspaces. **Node** 24, **TypeScript** 5.9.
- **API**: Express 5, Zod-validated (Orval codegen from `lib/api-spec/openapi.yaml`).
- **Frontend**: React + Vite + Tailwind + shadcn/ui + Wouter routing.
- **Graph**: React Flow (`reactflow`). **Charts**: in-house SVG sparkline/bar/funnel cards (no Recharts).
- **Auth**: Replit Auth (OIDC), gates `/admin/*` (see Admin auth).
- **Data**: Tenant portal pages (`/:firmSlug/portfolio` + related) hydrate from Postgres via `GET /api/portfolio/bootstrap`. The static TS tenant files (`src/data/portfolio/{stg,pamlico,raviga,longarc,solen}.ts`) are read-only backup/reference for migration + parity scripts only, no longer imported by any live page. Other CS-demo pages (accounts, signals, playbooks, actions, reports) still read local mock data in `src/data/*`.

## Artifacts

- **cs-rescue** (preview `/`) — React/Vite frontend (the demo).
- **api-server** (preview `/api`) — Express backend. Serves legacy Architecture/AI-Copilot endpoints plus Replit Auth (`/api/login|callback|logout|auth/user|mobile-auth/*`), the portfolio bootstrap, the `/api/admin/*` pipeline, and `/api/build-status`.
- **mockup-sandbox** — component preview server.

## Key Commands

- `pnpm run typecheck` — all packages (NOTE: `cs-rescue-video` has pre-existing errors; for this app use `pnpm run typecheck:libs` + `pnpm --filter @workspace/{api-server,cs-rescue} run typecheck`).
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks/Zod from the OpenAPI spec.
- `pnpm --filter @workspace/cs-rescue run verify-db-invariants` — the permanent DB invariants gate (see Database).
- `pnpm --filter @workspace/{api-server,cs-rescue} run dev` — backend / frontend.

## Persona switcher

`PersonaSwitcher` reshapes several pages; persisted to `localStorage` (`cs-rescue:persona`), survives reload + cross-tab.
- **Dashboard**: per-persona `PERSONA_LAYOUTS` (KPI subset, section order, action/insight filters, which playbooks/accounts surface); customer persona collapses to a single-account snapshot.
- **Accounts**: defaults owner filter to the persona's `PERSONA_CURRENT_USER` (`src/lib/persona.tsx`); support defaults to `at-risk`, sales sorts by expansion potential, customer pins one account drawer.
- **Reports**: reorders the four trend cards; hides team capacity for customer.

## Information Architecture

**Bare (no shell):** `/` Landing (Executive Brief) · `/overview` investor pitch (7-section narrative).

**Shell — `Product`:** `/dashboard` · `/accounts` (right-side Sheet drawer: Summary/Rollouts/Usage/Risk/Expansion/Activity/Actions; Rollouts lists each Deployment via `getDemoDeploymentsForAccount`, deep-linking to `/platform/ai-copilot?accountId=&deploymentId=`) · `/signals` · `/playbooks` · `/actions` · `/reports`.

**Shell — `Configure`:** `/integrations` · `/settings`.

**Shell — `Platform` (demoted, technical buyers):** `/platform/architecture` (React Flow) · `/platform/ai-copilot` (deep-link `?prompt=&accountId=&deploymentId=&persona=&autoRun=1`).

**`/admin`** (internal, unlinked): firm-onboarding flow — `/admin/firms` (list), `/admin/firms/:id` (`FirmReview.tsx`: add/select companies, confirm+queue a build, Export panel). Gated by Replit Auth; placed above the `/:firmSlug/*` wildcard in `App.tsx` so `admin` is never swallowed as a firm slug.

**Redirects:** `/resources`,`/deployments`,`/connectors` → `/overview` (archived files, unrouted); `/ai-copilot` → `/platform/ai-copilot`.

Tenant portal note: `/:firmSlug/portfolio/:companyId` matches on `companies.slug`, not the numeric DB id. `firms.ts` (`FIRMS`/`FIRMS_BY_SLUG` registry — slugs, display names, status labels) is static metadata, intentionally NOT part of the DB cutover; AI-onboarded firms 404 on portal routes until added there.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/build-status` | Latest parseable BUILD-LOG.md entry as JSON (public, no auth) |
| GET | `/api/portfolio/bootstrap` | Live `firms`/`companies`/`assessments` reshaped to `RawCompany[]` |
| GET | `/api/portfolio/:firmSlug/companies/:companySlug/report-pdf` | Public tenant PDF download (cache-only; 404 unresolved/non-active slug, 403 internal-only/login-gated, 409 no narrative) |
| GET | `/api/auth/user` | Current auth state (`{ user \| null }`) |
| GET | `/api/login` · `/api/callback` · `/api/logout` | Replit OIDC login / callback / end-session |
| POST | `/api/mobile-auth/token-exchange` · `/api/mobile-auth/logout` | Mobile auth |
| * | `/api/admin/*` | Firm onboarding, report-data/export (all `requireAdminAuth`) |

## Admin auth (`/admin`)

Restricted to `@csrescue.com` emails. Replit's OIDC claims don't expose the upstream IdP, so an email-domain allowlist (`isAllowedAdminEmail` in `api-server/src/lib/auth.ts`) is the enforceable proxy for "Google accounts on the csrescue.com Workspace domain".

- **Client gate**: `ProtectedRoute` (`src/lib/protected-route.tsx`) redirects to `login()` when unauthenticated.
- **Server, defense-in-depth**: (1) `routes/auth.ts` checks the domain on the OIDC callback / mobile token-exchange *before* creating a session or users row; (2) `authMiddleware` re-checks each session's stored email and clears any that fail. `authMiddleware` only *populates* `req.user` — it never blocks. **Every `/api/admin/*` route additionally requires `requireAdminAuth`** (`router.use` at the top of `routes/admin.ts`); this is the actual server-side gate. All other routes are public. (Client-side page gating gives ZERO protection to that page's API routes — verify by grepping handlers.)

## Report export (`/admin/firms/:id` → `ExportPanel.tsx`)

Assembles a `report-data.json` matching the Notion "External CS Diagnostic — Scoring Rubric & Cowork Instructions" (Step 7) schema for the manual paste-to-Claude PPTX/PDF workflow.

- **Default view**: the rendered `AdminReportPreview.tsx` (composite/tier header, shared `PillarScorecard.tsx` — same component the public `/portfolio/[company]` pages use — plus exec summary, systems, path forward, gaps, next steps). Raw JSON is never shown; a "Copy prompt" button copies it to the clipboard. "Client PDF" vs "Editable" toggle only changes prompt wording, not the JSON.
- Company picker restricted to `hasAssessment: true` (computed server-side per company). `GET /api/admin/companies/:id/report-data` returns `{ reportData, meta }`: `reportData` is the spec-exact `DiagnosticReportData`; `meta` is display-only bookkeeping kept out of the exported JSON. `generatedAt`/`model` are null until a narrative is generated.
- `scores` are raw `number | "NA"` (never the DB's stringified `"0"/"1"/"2"`), re-derived via `@workspace/portfolio-engine` (`PILLARS`/`getTier`/`textToScore`, NA→1 for tier composite). Derived with zero Claude calls: `scores`, `gaps[].title`/`description` (3 lowest pillars, NA treated as 1; `description` falls back to the pillar's static `gapNote`), and the CS-leadership label of `p6Recommendation`.
- **Name redaction (render-time only)**: `gaps[].description` (when title === "CS Leadership") and `pillarEvidence.p6` are verbatim passthroughs of upstream assessment evidence that can name individuals. `lib/nameRedaction.ts`, applied in `reportExport.ts`'s shared `toResponse()`/`sanitizeReportData()`, strips named individuals to "the current CS leader". This is a display-time filter over the shared response funnel (covers cache + future consumers), NOT a data migration — it does not touch stored `assessments` rows or bump `RUBRIC_VERSION`. Residual (out of scope): evidence for pillars other than CS-Leadership is left untouched.

### Generation pipeline (`report_exports` table)

Narrative fields (`execSummary`, `compositeContext`, `existingSystems`, `pathForward`, `pillarSignals`, `gaps[].impact`/`recommendation`, `nextSteps`, `p6Recommendation` evidence) are Claude-generated and persisted.

- `reportExport.ts`: `getReportData()` is **cache-only** (never calls Claude — safe on page load). `getOrGenerateReportExport()` generates on first call, persists to `report_exports` (keyed `assessmentId` + `rubricVersion`), and returns the cached row thereafter. Model `claude-sonnet-4-6`.
- Grounded in the same Notion rubric (`fetchScoringRubricText()`, falls back to a `PILLARS`-built rubric if Notion is down) plus the company's scored data; never invents facts/scores.
- **Tone policy**: forward-looking/structural; the prompt must **explicitly forbid echoing any named individual** found in the evidence (a generic "don't judge people" is insufficient — see `.agents/memory/report-export-tone-policy.md`).
- **No-em-dash** in three layers: prompt instruction; deterministic `stripEmDashes`/`sanitizeNarrativeEmDashes` post-generation (prompt-only compliance proved unreliable); and hardcoded em-dashes fixed in static PDF copy (`lib/pdf/*`) and `PILLARS`/`TIERS` copy.
- `RUBRIC_VERSION` (currently `"v5"`) is bumped whenever the prompt/output shape changes — a bump yields a fresh row instead of serving stale-format/policy rows. Old rows are never mutated/deleted. **Fixing fallback/template copy has no effect on already-cached rows; you must bump the version key (or delete rows) to see it.**
- Residual (out of scope): raw `pillarEvidence`/`gaps[].description` from the separate `scoring.ts` pipeline can still contain em-dashes/names — fixing means changing the scoring prompt (affects 137+ existing assessment rows).

## AI firm onboarding: discovery + build jobs

Confirming a firm's companies kicks off an async two-job pipeline (`api-server/src/lib/jobs/{discovery,build}.ts`) backed by the `jobs` table. Both call Claude **directly** via `ANTHROPIC_API_KEY` (`lib/anthropic.ts`, NOT the Replit AI proxy) with `web_search`, and are fire-and-forget (the route returns immediately; the job persists its own status/progress/error).

- **Discovery** (`POST /api/admin/firms`): web-searches the firm's real current portfolio, inserts 0–5 verified `companies` (`status: "candidate"`). Never invents a holding. Sets `normalizedName` and skips any candidate whose normalized name already belongs to a non-excluded company in the firm (see Write-path guards).
- **Confirm** (`POST /api/admin/firms/:id/confirm`): picked → `active`, rest → `excluded`, firm → `reviewed`, inserts a `build` job, fires `runBuildJob`.
- **Build** (`runBuildJob`): per active company, Claude scores all 8 pillars (`lib/jobs/scoring.ts`, same `PILLARS` rubric) as `0`/`1`/`2`/`"Insufficient Data"` with 1–3 sentence evidence, grounded in web search; the prompt forbids guessing on thin signal. Writes one `assessments` row (Postgres is source of truth; **replaces** an existing same-day row rather than blind-inserting — see guards). Best-effort mirrors to Notion's "Portfolio Company Diagnostics" DB (`lib/notion.ts`, raw fetch, `NOTION_API_KEY`, schema discovered at runtime); a Notion failure logs but never fails the job. Marks job `completed` + firm `ready` only once every active company is scored; any Claude failure marks the whole job `failed` (prior rows kept).
- **Startup resume**: `resumeQueuedDiscoveryJobs()` + `resumeQueuedBuildJobs()` run on boot and re-execute ANY `queued`/`running` `jobs` row — **including stray test rows, which silently re-fire real Claude calls. Clean up scratch `jobs`/`companies`/`firms` rows before restarting the API server.**
- **Progress/ETA + email**: `createJobTicker(jobId, totalMs)` (`lib/jobs/common.ts`) drives `progressPct`/`etaSeconds` from wall-clock elapsed vs budget (discovery 45s; build 90s × active count); it only drives the displayed number, never delays real completion. On flipping a firm to `ready`, `sendBuildCompleteEmail()` (`lib/email.ts`, Resend via raw fetch, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` overrides sender) emails `firms.createdByEmail` (captured from `req.user?.email` at create) if set; the send never throws and never fails the build. UI: `JobStatus.tsx` + `FirmReview.tsx` show ready/failed banners and a "Notified <email>" chip.

## Write-path guards & normalizedName

`companies.normalized_name` + the partial unique index `companies_firm_normalized_name_active_uq` (`.on(firmId, normalizedName).where(status <> 'excluded')`, i.e. covering active + candidate) are the guard against duplicate companies in a firm. Postgres treats NULLs as distinct, so the index is only effective once every row has a non-null `normalizedName`.

- **All company insert paths set `normalizedName`** (`normalizeCompanyName` from `@workspace/portfolio-engine`): discovery.ts, admin add-company (`POST /firms/:id/companies`). build.ts inserts no companies.
- **Dedup**: discovery.ts skips a candidate whose normalized name matches a non-excluded company in the firm (and intra-batch dups), rather than hard-failing the index.
- **Prod backfill**: `backfillCompanyNormalizedNames()` (`api-server/src/lib/backfillNormalizedNames.ts`, called from `index.ts` on boot) fills any still-NULL row. Idempotent (no-ops once populated) and non-fatal (row-by-row with per-row try/catch, so a firm-normalized-name conflict is logged + left NULL, never crashing boot). Runs in prod on Republish; no-op in dev.
- **Re-score**: build.ts `scoreAndPersistCompany` **replaces** an existing `(companyId, date)` assessment (deliberate re-score) in a transaction — deletes the old row's `report_exports` then `findings` then the assessment, then inserts — instead of hard-failing `assessments_company_date_uq`. It does not regenerate findings (operationally re-fanned-out by `scripts/backfill-unified-db.ts`, same as any fresh build).

## Bootstrap robustness

`PortfolioDataProvider.tsx` shape-guards the `/api/portfolio/bootstrap` payload: a malformed/partial 200 (no `firms` array) or a hydration throw sets a visible error state instead of white-screening or infinite-spinning the SPA (the generated client does no runtime body validation). `PortfolioGate` blocks only firm-scoped routes until hydration completes; every other route passes through.

## `/api/build-status`

`buildLog.ts` surfaces the latest **parseable** BUILD-LOG.md entry (scans blocks from the end, skipping freeform trailing blocks that lack the canonical `- Date:`/`- Status:` bullets). It reads a dist-adjacent `BUILD-LOG.md` first (copied into `dist/` by `build.mjs` so it ships with the deploy — the repo-root file is not in the bundle), then falls back to the repo root. Append new entries in canonical format (`## <task>`, then `- Date:`/`- Status:`/`- Files changed:`/`- Validation:`/`- Republish needed:`/`- QA notes:` bullets, `---` separated).

## Database

Postgres (Replit built-in) via `@workspace/db` (Drizzle). Tables: `users`, `sessions` (Replit Auth), `firms`, `companies`, `assessments`, `findings`, `report_exports`, `jobs`. `firms`/`companies`/`assessments` are the live source for tenant portal pages; `jobs` drives the onboarding pipeline.

- **Invariants gate**: `scripts/verify-db-invariants.ts` (`verify-db-invariants`) is a permanent, file-independent gate — (a) exactly 8 findings/assessment, (b) no non-excluded company dedup violations, (c) `report_exports` composite recompute matches, (d) FK integrity + no duplicate `(companyId, date)`. Run it after any change touching the pipeline or schema; it must PASS.
- **Prod DB writes**: the agent cannot write to prod directly. Additive/idempotent fixes ride a startup routine (like the normalizedName backfill). A destructive repair needs a temporary admin endpoint + the two-Publish index dance (see `.agents/memory/prod-data-repair-two-publish.md`).
- **Connection resilience**: the pg `Pool` in `lib/db/src/index.ts` MUST keep its `pool.on("error", ...)` listener. Managed Postgres periodically terminates idle pooled connections ("terminating connection due to administrator command"); with no listener pg emits an unhandled `'error'` event that crashes the whole api-server process, producing a prod crash loop (repeated `healthcheck /api returned status 500`). Log-only — never `process.exit` in that handler. See `.agents/memory/pg-pool-crash-loop.md`.

### Tenant portal DB cutover

`api-server/src/lib/portfolioData.ts` loads `firms`/`companies`/`assessments`, reshapes to `RawCompany`, and runs `validateFirmData` at server startup (a validation failure is a boot-time failure, not a bad response). Exposed via `GET /api/portfolio/bootstrap`. The frontend fetches it once (`useGetPortfolioBootstrap`) and calls `hydratePortfolioData()`, which runs the same unchanged `buildCompany`/`computeSummary`/`validateFirmData` pipeline, keeping `engine.ts`'s query API synchronous for every page.

### One-time migration + parity

`cs-rescue/scripts/migrate-portfolio-to-db.ts` (`migrate-portfolio`) copied the 5 tenants' hardcoded data into the DB (5 firms, 27 companies, 137 assessments — full history; Raviga alone = 120). Read-only against the TS files; refuses to run once `firms` has rows. `assessments.p1..p8` map 1:1 to `PILLARS` order (`org,onboarding,health,escalation,revenue,leadership,planning,ai`); `"NA"` stored literally. The `companies` table only carries `name` (not `RawCompany`'s id/sector/hq/ARR — those still live in the TS files). `scripts/verify-portfolio-parity.ts` (`verify-portfolio-parity`) recomputes each tenant's counts/avg from files vs DB and diffs them (zero-write); re-run anytime.
