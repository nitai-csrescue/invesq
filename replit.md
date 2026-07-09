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
- `/accounts` — Filterable book of business with right-side Sheet drawer (Summary / Usage / Risk / Expansion / Activity / Actions)
- `/signals` — 5 category blocks (Churn, Expansion, Adoption, Renewal, Support) + live signal feed
- `/playbooks` — Tabbed library + drawer with steps, outcomes, active accounts, Run CTA (toast on run)
- `/actions` — Queued / In Progress / Completed tabs with status transitions (toasts)
- `/reports` — Net retention, expansion funnel, playbook impact, TTV, team capacity

Sidebar group `Configure`
- `/integrations` — 9 integrations across 6 categories with status pills (connected / mock / planned)
- `/settings` — Workspace, Team, Scoring thresholds, AI prefs, Notifications

Sidebar group `Platform` (demoted, kept for technical buyers)
- `/platform/architecture` — original React Flow graph
- `/platform/ai-copilot` — supports `?prompt=&accountId=&autoRun=1` deep-link from the Dashboard insight rail

`/admin` (internal, unlinked from the sidebar) — gated by Replit Auth (Google OAuth via `@csrescue.com` allowlist), see "Admin auth" below. Includes a firm-onboarding CRUD scaffold: `/admin/firms` (list), `/admin/firms/:id` (`FirmReview.tsx` — add/select companies, confirm & queue a stub build job, plus the Export panel described below).

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
- This auth layer applies globally (`app.use(authMiddleware)` in `app.ts`), but only `/admin` actually branches on `req.user` — every other route is public and behaves exactly as before.

## Export panel (`/admin/firms/:id`)

`FirmReview.tsx` includes an Export panel (`src/pages/admin/ExportPanel.tsx`) that assembles a `report-data.json` payload for the "Diagnostic Report — Programmatic Update & Export Runbook" pattern, then hands the user a ready-to-paste Claude prompt. It does not call Claude directly.

- Company picker is restricted to companies with `hasAssessment: true` (a field computed server-side by checking for at least one `assessments` row per company, returned on `Company` from `GET /api/admin/firms/:id`).
- `GET /api/admin/companies/:id/report-data` (`artifacts/api-server/src/routes/admin.ts`) builds the payload from that company's latest assessment (by `date`): raw `p1`-`p8` text scores (including `"NA"`), plus `composite`/`compositeMax`/`tier` re-derived via `@workspace/portfolio-engine`'s `PILLARS`/`getTier`/`textToScore` (same substitution rules as the portfolio engine — NA counts as 1 for the tier composite, is excluded from the raw composite). `parentFund` is the firm's `name` — there is no separate "parent fund" field in the schema. Returns 404 if the company has no assessments.
- Narrative fields (`execSummary`, `gaps`, `nextSteps`) and `preparedForName`/`preparedForTitle` are left empty — no runbook doc matching that exact schema exists in-repo, so these are populated later by Claude's research, not by this endpoint. `reportDate` defaults to today (when the JSON was assembled); `assessmentDate` is the source assessment's date.
- The panel's "Client PDF" vs "Editable" toggle only changes the wording of the copy-to-clipboard prompt (target format PDF vs PPTX) — the underlying JSON is identical either way.
- Verified against real data: STG firm / Nomis Solutions (company id 1, one of the 5 migrated tenants) — independently recomputed composite (3) and tier (`Tier 1 · Significant Opportunities`) match the endpoint's output for that company's real assessment row.

## Database

Postgres (Replit built-in) via `@workspace/db` (Drizzle). Tables: `users`, `sessions` (Replit Auth), `firms`, `companies`, `assessments`, `jobs` (schema in `lib/db/src/schema/*`). `firms`/`companies`/`assessments` are now the live source for the tenant portal pages (see "Tenant portal DB cutover" below); `jobs` and the rest of `/admin`'s future tooling remain unwired beyond the placeholder page.

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
