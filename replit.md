# CS Rescue

## Overview

CS Rescue is an investor-demo MVP for an AI-driven Customer Success platform. The product is positioned as a **system of action** — not just a dashboard — with a primary IA built around the daily CS workflow: see what's at risk, get the next best action, run the playbook, report on impact.

The Architecture page (a true interactive React Flow graph) and AI Copilot still exist as a deeper "Platform" surface for technical buyers, but the primary entry points are now Landing → Overview → Dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24, **TypeScript**: 5.9
- **API**: Express 5, validated with Zod (Orval codegen)
- **Frontend**: React + Vite + Tailwind + shadcn/ui + Wouter routing
- **Graph (Architecture page)**: React Flow (`reactflow`)
- **Charts**: in-house lightweight SVG sparklines + bar/funnel cards (no Recharts dep used in new pages)
- **Data**: Local in-file mock data (`src/data/*`) — no DB, no API for the new CS-product pages

## Artifacts

- **cs-rescue** (preview path `/`) — React/Vite frontend (the demo)
- **api-server** (preview path `/api`) — Express backend (used only by the legacy Architecture / AI Copilot pages)
- **mockup-sandbox** — component preview server

## Key Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run backend
- `pnpm --filter @workspace/cs-rescue run dev` — run frontend

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

**Redirects:**
- `/resources`, `/deployments`, `/connectors` → `/overview` (files kept in `src/pages/` with archive header, not routed)
- `/ai-copilot` → `/platform/ai-copilot`

## Mock data layer

All new pages read from `src/data/*` — one coherent universe of 18 accounts, 7 team members, 10 signal definitions + 12 fired events, 10 playbooks, 19 actions, 3 AI insights, 9 integrations, and metrics derived from accounts. Fully self-consistent.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |

(Original architecture/copilot endpoints are still served — see legacy `Resources.tsx`/`Deployments.tsx`/`Connectors.tsx` archive files.)
