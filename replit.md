# CS Rescue

## Overview

CS Rescue is a visually-led, dark-mode enterprise web app that maps a company's full customer lifecycle architecture. It shows how lifecycle stages, delivery orchestration, and platform systems interconnect — designed for CS leadership, solutions teams, and executives.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Validation**: Zod (via Orval codegen)
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Data**: In-memory mock data (no database required)

## Artifacts

- **cs-rescue** (preview path `/`) — Main React/Vite frontend app
- **api-server** (preview path `/api`) — Express backend with mock data

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Frontend Pages

- `/` — **Architecture View** — layered visual map of lifecycle nodes, delivery, and platform systems
- `/resources` — **Resource Explorer** — grid of connected tools and integrations with filtering
- `/deployments` — **Deployment Workspace** — per-customer rollout tracking with health scores and workstreams
- `/connectors` — **Connector Admin** — manage integration connectors, toggle enable/disable

### Backend Structure

```
artifacts/api-server/src/
├── data/
│   └── mockData.ts          # All mock data: nodes, resources, connectors, deployments, accounts
├── routes/
│   ├── architecture.ts      # GET /api/architecture, /api/architecture/nodes, /api/architecture/summary
│   ├── resources.ts         # GET/POST /api/resources, GET/PATCH /api/resources/:id
│   ├── connectors.ts        # GET/POST /api/connectors, PATCH /api/connectors/:id, GET /api/connectors/health
│   ├── deployments.ts       # GET /api/deployments, GET /api/deployments/:id
│   ├── accounts.ts          # GET /api/accounts
│   └── lifecycle.ts         # GET /api/lifecycle-motions
```

### Data Models

- **ArchitectureNode** — lifecycle/delivery/platform nodes with KPIs, connected nodes, resources
- **Resource** — external system integrations (CRM, ticketing, data warehouse, etc.)
- **Connector** — integration connectors with auth type, health, and configuration schema
- **Deployment** — customer rollout with stages, milestones, workstreams, and blockers
- **Account** — customer accounts with lifecycle stages and owner info
- **LifecycleMotion** — the 5 primary lifecycle stages with KPIs

## Customization

- **Swap mock data for real APIs**: Replace data in `artifacts/api-server/src/data/mockData.ts` with database queries
- **Add authentication**: Integrate Clerk auth or Replit auth
- **Branding**: Update colors in `artifacts/cs-rescue/src/index.css` CSS custom properties
- **Add new nodes/connectors**: Extend the arrays in `mockData.ts` and update the OpenAPI spec

## API Spec

See `lib/api-spec/openapi.yaml` for the full OpenAPI contract. After any spec change, run codegen.
