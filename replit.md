# INVESQ (project dir: cs-rescue)

## Overview

INVESQ is an investor-demo MVP for an automated **Operational Due Diligence** platform for PE/VC firms: a "Ground Truth" layer that reconstructs the real customer journey across fragmented enterprise systems, surfacing operational risk before capital is committed.

Formerly branded "CS Rescue". The artifact slug and directory keep that name, but **all user-visible chrome must say INVESQ, never "CS Rescue"**. The CS-flavored mock data (accounts, signals, playbooks) represents a sample portfolio company being assessed. Primary flow: Landing (`/`, the Executive Brief) → Overview → Dashboard; Architecture + AI Copilot live under a demoted "Platform" surface for technical buyers.

## Cost Discipline

The goal is to minimize spend. Every request triggers a full investigate-build-verify cycle that carries all available context, so cost is driven by how many cycles are triggered and how much context each one carries.

Standing rules for how the user will work with the agent, and how the agent should keep costs down:

1. **Batch handling.** Requests will often contain several related fixes in one message. Handle them together in one pass rather than re-investigating per item.
2. **Go straight to the fix** when a request names an exact route/file/behavior, gives expected-vs-actual, and specifies the environment (published app vs. workspace preview). Do not re-explore the codebase.
3. **Right-size verification.** When the user says a change is copy/text-only or "no need to test," skip restarts, screenshots, and end-to-end tests. Reserve full verification for changes touching the pipeline, database, scoring, or tenant isolation.
4. **Keep replit.md and BUILD-LOG.md accurate** so fresh sessions start with context instead of re-investigating.
5. **Avoid the Plan-mode trap.** When asked to build, execute immediately rather than only reading files and proposing a plan.
6. **Documentation-only edits never need a test cycle.**

## Stack

- **Monorepo**: pnpm workspaces, Node 24, TypeScript 5.9.
- **API**: Express 5, Zod-validated, Orval codegen from `lib/api-spec/openapi.yaml`.
- **Frontend**: React + Vite + Tailwind + shadcn/ui + Wouter. React Flow for the Architecture graph; in-house SVG chart cards (no Recharts).
- **Auth**: Replit Auth (OIDC) gating `/admin/*` (see Admin auth).
- **Data**: Tenant portal pages (`/:firmSlug/portfolio` + related) hydrate from Postgres via `GET /api/portfolio/bootstrap`. Static TS tenant files (`src/data/portfolio/*.ts`) are read-only reference for migration/parity scripts only. Other CS-demo pages (accounts, signals, playbooks, actions, reports) still read local mock data in `src/data/*`.

## Artifacts

- **cs-rescue** (preview `/`) — React/Vite frontend (the demo).
- **api-server** (preview `/api`) — Express backend: auth, portfolio bootstrap, `/api/admin/*` pipeline, build-status, legacy Architecture/AI-Copilot endpoints.
- **mockup-sandbox** — component preview server.

## Key Commands

- `pnpm run typecheck` — all packages (NOTE: `cs-rescue-video` has pre-existing errors; for this app use `pnpm run typecheck:libs` + `pnpm --filter @workspace/{api-server,cs-rescue} run typecheck`).
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks/Zod from the OpenAPI spec.
- `pnpm --filter @workspace/cs-rescue run verify-db-invariants` — permanent DB invariants gate (see Database).
- `pnpm --filter @workspace/cs-rescue run pipeline-smoke-test` — pipeline state-machine gate.

## Routes

- **Bare (no shell):** `/` Landing · `/overview` investor pitch.
- **Shell, Product:** `/dashboard` · `/accounts` (right-side Sheet drawer with Rollouts deep-linking to AI Copilot) · `/signals` · `/playbooks` · `/actions` · `/reports`.
- **Shell, Configure:** `/integrations` · `/settings`.
- **Shell, Platform:** `/platform/architecture` · `/platform/ai-copilot` (deep-link `?prompt=&accountId=&deploymentId=&persona=&autoRun=1`).
- **`/admin`** (internal, unlinked): firm onboarding — `/admin/firms` list, `/admin/firms/:id` review/build/export. Routed above the `/:firmSlug/*` wildcard so `admin` is never swallowed as a firm slug.
- **Redirects:** `/resources`, `/deployments`, `/connectors` → `/overview`; `/ai-copilot` → `/platform/ai-copilot`.
- **Tenant portal:** `/:firmSlug/portfolio/:companyId` matches `companies.slug`, not the DB id. `firms.ts` (`FIRMS_BY_SLUG` registry) is static metadata, intentionally NOT in the DB cutover; AI-onboarded firms 404 on portal routes until added there.
- `PersonaSwitcher` reshapes Dashboard/Accounts/Reports per persona; persisted to `localStorage` (`cs-rescue:persona`). See `src/lib/persona.tsx`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/build-status` | Latest parseable BUILD-LOG.md entry as JSON (public) |
| GET | `/api/portfolio/bootstrap` | Live `firms`/`companies`/`assessments` reshaped to `RawCompany[]` |
| GET | `/api/portfolio/:firmSlug/companies/:companySlug/report-pdf` | Public tenant PDF (cache-only; 404/403/409 semantics in route) |
| GET | `/api/auth/user` · `/api/login` · `/api/callback` · `/api/logout` | Auth state + Replit OIDC flow |
| POST | `/api/mobile-auth/token-exchange` · `/api/mobile-auth/logout` | Mobile auth |
| * | `/api/admin/*` | Firm onboarding, report data/export, cover metadata, firm management (all `requireAdminAuth`) |
| POST | `/api/admin/firms/:id/clearance` | Password-gated toggle of `firm.meta.internalOnly` (verifies `CLEARANCE_ADMIN_PASSWORD` server-side; 401 mismatch, 503 unset) |

Firm management notes: list order comes from `firms.sortOrder` (PUT `/api/admin/firms/order` reorders); POST `/api/admin/firms/manual` creates a no-pipeline firm (kebab slug, `RESERVED_FIRM_SLUGS` denylist); DELETE `/api/admin/firms/:id` cascade-deletes (409 for legacy tenants / active jobs). Concrete `/firms/order` + `/firms/manual` routes are registered before `/firms/:id`. The admin show/hide firm filter is localStorage-only.

## Admin auth (`/admin`)

Restricted to `@csrescue.com` emails via an email-domain allowlist (`isAllowedAdminEmail` in `api-server/src/lib/auth.ts`) — OIDC claims don't expose the upstream IdP, so the domain check is the enforceable proxy.

- Client: `ProtectedRoute` redirects unauthenticated users to login. **Client-side gating gives ZERO protection to that page's API routes.**
- Server: domain checked on the OIDC callback before session creation; `authMiddleware` only *populates* `req.user` (never blocks); **every `/api/admin/*` route requires `requireAdminAuth`** (`router.use` at the top of `routes/admin.ts`) — that is the actual gate. All other routes are public.

## Report export (`/admin/firms/:id` → ExportPanel)

Assembles `report-data.json` matching the Notion "External CS Diagnostic" rubric schema. Key rules (details in code: `api-server/src/lib/reportExport.ts`):

- `getReportData()` is **cache-only** (safe on page load); `getOrGenerateReportExport()` generates via Claude once and persists to `report_exports` (keyed `assessmentId` + `rubricVersion`).
- `RUBRIC_VERSION` (currently `"v5"`) must be bumped whenever the prompt/output shape changes; cached rows are never mutated. Fixing template/fallback copy does nothing to already-cached rows.
- Scores/gaps are derived deterministically via `@workspace/portfolio-engine` (zero Claude calls); narrative fields are Claude-generated.
- **Tone policy**: the prompt must explicitly forbid echoing named individuals from evidence; name redaction is applied render-time in the shared response funnel (`lib/nameRedaction.ts`), never as a data migration.
- Pillar evidence (`PATCH .../pillar-evidence`) and cover metadata (`PATCH .../report-meta`) edits deliberately do NOT create revisions or reset sign-offs, and never require a RUBRIC_VERSION bump (effective values are rebuilt/overlaid on every read).
- No-em-dash enforcement is three-layered: prompt instruction + deterministic post-generation stripping + fixed static copy.

## AI firm onboarding (discovery + build jobs)

Async two-job pipeline (`api-server/src/lib/jobs/{discovery,build}.ts`) backed by the `jobs` table; both call Claude directly via `ANTHROPIC_API_KEY` (NOT the Replit AI proxy) with `web_search`, fire-and-forget.

- **Discovery** inserts 0–5 verified candidate companies (never invents; dedups on `normalizedName`). **Confirm** activates picks, excludes the rest, queues a build. **Build** scores all 8 pillars per active company (0/1/2/"Insufficient Data" + evidence), replaces same-day assessments in a transaction, best-effort mirrors to Notion, and marks the firm `ready` only when every company is scored.
- **Startup resume**: boot re-executes ANY `queued`/`running` jobs row — including stray test rows, which re-fire real Claude calls. Clean scratch `jobs`/`companies`/`firms` rows before restarting the api-server.
- Progress bars are wall-clock tickers (cosmetic only). Build-complete email via Resend is best-effort and never fails the build.
- **Dedup guard**: partial unique index `companies_firm_normalized_name_active_uq` on `(firmId, normalizedName)` where status <> 'excluded'; all insert paths must set `normalizedName`; a boot-time backfill (`backfillNormalizedNames.ts`) fills NULL rows idempotently.
- **Notion duplicate guard** (`notion.ts`): before POSTing a Portfolio Company Diagnostics page, `writeDiagnosticToNotion` checks `notion_sync_state` by assessment id, then runs a live Notion query matching **(Company Name + Parent Fund)** — trimmed, whitespace-collapsed, case-insensitive — and PATCHes a hit instead of creating a duplicate. Dedup is never on name alone (multi-owner rows like Appfire stay separate). Forward-only: pre-existing duplicates in Notion are untouched (separate hard-gated cleanup task). See FIRM-ONBOARDING.md "Notion sync — duplicate protection".

## Database

Postgres (Replit built-in) via `@workspace/db` (Drizzle). Tables: `users`, `sessions`, `firms`, `companies`, `assessments`, `findings`, `report_exports`, `jobs`.

- **Rubric v2 (Phase 2)**: additive `assessments` columns `org_design_score` / `onboarding_score` / `health_scoring_score` / `renewal_expansion_score` / `portco_score` + `rubric_version` ("v1"/"v2"). Single mapping implementation: `computeRubricV2()` in `@workspace/portfolio-engine` (rubricV2.ts); never re-implement the bucketing. The 3 tenant portal routes display this 4-pillar Low/Medium/High rubric (stored values via bootstrap, client-side fallback when absent); p1-p8 and the report_exports/PDF pipeline are unchanged and still read 8-pillar scores.
- **Invariants gate**: `verify-db-invariants` checks findings completeness, dedup, report composite recompute, FK integrity. Run after any pipeline/schema change; must PASS.
- **Prod schema**: the Publish flow auto-diffs dev-vs-prod schema and applies it. Never add startup DDL or custom prod migration scripts — make the change in dev and republish.
- **Prod data**: the agent cannot write prod directly. Additive/idempotent fixes ride an idempotent startup routine + Republish; destructive repairs need the two-Publish dance (`.agents/memory/prod-data-repair-two-publish.md`).
- **Pool resilience**: `lib/db/src/index.ts` MUST keep `pool.on("error", ...)` (log-only, never exit) or idle-connection terminations crash-loop prod (`.agents/memory/pg-pool-crash-loop.md`).
- **Bootstrap**: `portfolioData.ts` validates firm data at server startup (validation failure = boot failure); the frontend shape-guards the bootstrap payload so a malformed 200 shows an error state instead of white-screening. `PortfolioGate` blocks only firm-scoped routes.
- **Migration/parity (historical)**: `migrate-portfolio-to-db.ts` seeded the 5 legacy tenants (refuses to re-run); `verify-portfolio-parity` re-diffs files vs DB anytime. `assessments.p1..p8` map 1:1 to `PILLARS` order; `"NA"` stored literally.

## `/api/build-status`

Surfaces the latest **parseable** BUILD-LOG.md entry (reads dist-adjacent copy first — `build.mjs` ships it — then repo root). Append entries in canonical format: `## <task>`, then `- Date:` / `- Status:` / `- Files changed:` / `- Validation:` / `- Republish needed:` / `- QA notes:` bullets, `---` separated.

## Durable QA and operational conventions

Lessons from production incidents. Honor them in every future build.

1. **No dead-end admin states.** Every firm in every lifecycle status must be reachable in the admin UI with a clear recovery path (live pipeline view, guided company entry, or retry). Zero-candidate discovery is a soft flag for human review, never a clean "done". Failed jobs must surface their error and a retry path. Every `ready` firm must resolve `/:firmSlug/portfolio` without a 404.
2. **Discovery must cross-reference multiple sources** (Crunchbase, PitchBook, news, LinkedIn — not just the firm's website; logo-only portfolio pages are a known failure mode). Zero candidates means "try harder". `seedStuckFirms.ts` is a last resort, not the primary recovery path.
3. **Prod DB is separate from dev.** The only prod data fix path: idempotent startup routine → Republish → verify prod state. Never report a prod issue "fixed" before that verification.
4. **A build is not done until writes are confirmed.** Verify changed files with `git --no-optional-locks status`; a firm is onboarded only when its portal resolves with companies + assessments; a code change is "shipped" only after Republish is confirmed live.
5. **Post-build QA gates** after every pipeline or admin change: `verify-db-invariants` (must PASS), `pipeline-smoke-test` (must PASS), and `GET /api/admin/system-health` / the `/admin/health` page showing zero issues. Resolve the pre-publish blocking banner before republishing.
6. **Confirmation Status is `companies.tier3_status`** (`unconfirmed`|`portco_confirmed`|`pe_confirmed`) — never add a parallel status field, never conflate with the internal Validated/Complete-Sendable report status. Every mutation writes a `tier_audit_log` row in-transaction. The `/confirm/<token>` ask page (Engagement Entry Step 2) is the platform's ONE public token-scoped surface: 64-hex token, SHA-256 hash stored only, expiring, single-submission, single-company payload with no enumeration; submissions write through to `calibration_observations` as the ledger "actual". See FIRM-ONBOARDING.md "Portco/PE confirmation flow".
7. **Copy and data policies (non-negotiable):**
   - No em-dashes anywhere in user-visible copy or generated narrative (use double hyphens or restructure).
   - INVESQ branding everywhere in visible chrome; never "CS Rescue".
   - No named individuals in generated narratives; redact to "the current CS leader".
   - Composite scores exclude NA pillars from the denominator; never divide by a fixed 16.

## User preferences

- GitHub versioning: `origin` = https://github.com/nitai-csrescue/invesq. Push `main` after each completed task/milestone so the repo stays current.
- Keep this file lean: durable architecture, conventions, and incident-derived rules only; deep implementation detail belongs in code comments or `.agents/memory/` topic files.
