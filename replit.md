# CS Rescue

## Overview

CS Rescue is a visually-led, dark-mode enterprise web app that maps a company's full customer lifecycle architecture. The Architecture page is a true interactive graph (React Flow) showing how lifecycle stages, delivery orchestration, and platform systems interconnect — with edge highlighting, faux telemetry, and a rich inspector drawer. Designed for CS leadership, solutions teams, and executives.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24, **TypeScript**: 5.9
- **API**: Express 5, validated with Zod (Orval codegen)
- **Frontend**: React + Vite + Tailwind + shadcn/ui + Framer Motion
- **Graph**: React Flow (`reactflow`)
- **Charts**: Recharts (line, bar, radial)
- **Data**: In-memory mock data (no DB)

## Artifacts

- **cs-rescue** (preview path `/`) — React/Vite frontend
- **api-server** (preview path `/api`) — Express backend with mock data

## Key Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run backend
- `pnpm --filter @workspace/cs-rescue run dev` — run frontend

## Pages

- `/` — **Architecture** — true interactive React Flow graph: pan/zoom, swimlanes (Lifecycle / Delivery / Platform), color-coded edges by relationship type (data_flow, dependency, sync, composition, control), node click highlights neighbors and opens inspector drawer with KPI chips, line/bar/radial charts, linked resources, and dependencies. Top filters: layer + health.
- `/resources` — **Resource Explorer** — searchable, filterable grid of integrations.
- `/deployments` — **Deployment Workspace** — per-customer rollout tracking.
- `/connectors` — **Connector Admin** — connector registry table with toggles.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/graph` | Full graph: nodes + edges + groups (used by Architecture) |
| GET | `/api/edges` | Architecture edges only |
| GET | `/api/metrics/:nodeId` | Time-series metric series for a node (used by Inspector) |
| GET | `/api/architecture` | Legacy: nodes + connections + layers |
| GET | `/api/architecture/nodes` | List/filter nodes |
| GET | `/api/architecture/nodes/:id` | Get a node |
| GET | `/api/architecture/summary` | Overview stats |
| GET/POST/PATCH | `/api/resources[/:id]` | Resources CRUD |
| GET/POST/PATCH | `/api/connectors[/:id]` | Connectors CRUD |
| GET | `/api/connectors/health` | Connector health summary |
| GET | `/api/deployments[/:id]` | Deployments |
| GET | `/api/accounts` | Accounts |
| GET | `/api/lifecycle-motions` | Lifecycle motions |

## File Map

```
artifacts/api-server/src/
├── data/
│   ├── mockData.ts           # Nodes, resources, connectors, deployments, accounts
│   └── graphData.ts          # Edges, groups, healthScores, positions, metrics
└── routes/
    ├── graph.ts              # /graph, /edges, /metrics/:nodeId
    ├── architecture.ts       # /architecture/*
    └── ... (resources, connectors, deployments, accounts, lifecycle, health)

artifacts/cs-rescue/src/
├── components/architecture/
│   ├── ArchitectureNode.tsx  # Custom React Flow node (icon, status dot, health ring)
│   └── Inspector.tsx         # Right-side drawer with Recharts visualizations
└── pages/
    ├── Architecture.tsx      # Main graph canvas with React Flow
    ├── Resources.tsx
    ├── Deployments.tsx
    └── Connectors.tsx

lib/api-spec/openapi.yaml     # OpenAPI source of truth — run codegen after changes
```

## Where to edit

- **Add or change a node** → `mockData.ts` (`architectureNodes`) + `graphData.ts` (position + healthScore + metrics)
- **Add or change an edge** → `graphData.ts` (`architectureEdges`)
- **Change metrics shown in inspector** → `graphData.ts` (`nodeMetrics`)
- **Change API contract** → `openapi.yaml` then run codegen

## Customization

- Replace mock data with database queries in `data/*.ts` files.
- Add auth via the auth skill.
- Branding: edit CSS custom properties in `artifacts/cs-rescue/src/index.css`.

## AI Copilot — scoping model

- **Scope**: `"company"` (default) or `"customer"`. Source of truth: `Scope` type in `artifacts/cs-rescue/src/services/ai/generateBriefing.ts`.
- **Persona** (vp/sales/post-sales/cs/support/engineering/customer) determines framing/tone; **scope** determines data slice. Persona is global (`usePersona` context); scope is local to the AI Copilot page.
- **Company scope**: `aggregateCompanySignals` runs `scoreSignals` once per deployment + a baseline pass with no deployment, dedupes by signal text, accumulates affected-deployment counts, and stores them on `Signal.affectedDeploymentCount`. The `(affects N deployments)` suffix is rendered LAST via `withAffectedSuffix`, after `customerizeText` has run, so the regexes still match. Customer-persona variant of the suffix is `— also affecting N other rollouts`.
- **Customer persona guardrail**: when persona flips to `"customer"`, scope auto-flips to `"customer"` and the Company toggle button is disabled (book-of-business view doesn't fit the outside-in lens).
- **Auto-generate**: the page generates the first briefing on mount once data is ready, so the user sees value without picking an account.
- **Account/Deployment selectors** are hidden in Company scope and replaced with an "All accounts · all deployments" placeholder.
