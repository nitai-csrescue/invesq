# INVESQ — Unified Database Architecture Proposal

**Status:** Proposal (no application code changed by this document)
**Author:** Agent audit, 2026-07-10
**Scope:** How INVESQ converges on **one** Postgres database as the sole source of truth for portfolio/firm/company/assessment data, replacing the current static-file + DB hybrid, and how that database scales to hundreds of firms / thousands of companies with proper tenant isolation, provenance, and an idempotent Notion sync.

This document is descriptive of a target state and a path to get there. It does not modify schema, routes, or scripts. Every claim about "today" below was verified directly against the current codebase and the live development database (row counts as of 2026-07-10, `DATABASE_URL` dev environment).

---

## 1. Executive summary

**Recommendation: keep Postgres + Drizzle** (already in use — `@workspace/db`, `drizzle-kit push`). No new database technology is needed. The problems in this codebase are not "wrong database," they are:

1. One **behavioral fork** at the bootstrap layer (`LEGACY_SLUGS`) that treats hand-authored firms and AI-onboarded firms differently, which is the thing standing between "DB has the data" and "DB **is** the single source of truth."
2. **Missing structural guarantees** the app currently enforces by convention/cleanup scripts instead of by schema: no FK indexes, no unique constraint preventing duplicate companies, no link from a `jobs` row to the rows it produced, no place to record "this composite was computed by rubric version X on date Y" versus "this is the live number."
3. An **outbound sync (Notion) with no idempotency key**, so every run is a blind `POST`.
4. **No tenant/role model** — auth exists (Replit Auth `users`/`sessions`) but nothing yet says who may see which firm's data.
5. Two **generations of migration script** (`migrate-portfolio-to-db.ts`, then a separate `backfill-portfolio-meta.ts`) because the original migration didn't carry the full row shape — proof that "run the migration once and move on" undersells how much still depends on the static files today (scripts + admin repair endpoints), and that any new migration should ship complete on day one.

The plan below is schema-first, keeps Postgres/Drizzle, adds a handful of new tables (`findings`, `notion_sync_state`, `roles`/`firm_members`, and a placeholder `ingestion_sources`), tightens indexes/constraints on existing tables, and only deletes the static tenant files and `LEGACY_FIRMS_META` at the very end, after an automated parity gate (extending a pattern this repo already has) proves the DB and the files agree.

---

## 2. Current state — ground truth audit

### 2.1 Data footprint today (dev DB, live-queried)

| Table | Rows | Notes |
|---|---|---|
| `firms` | 6 | 5 hand-authored ("legacy") + 1 AI-onboarded (`mainsail-partners`, status `ready`) |
| `companies` | 30 | 27 legacy + 3 AI-onboarded |
| `assessments` | 140 | 137 legacy (full monthly history, e.g. Raviga alone = 120) + 3 AI-onboarded (one each) |
| `jobs` | 2 | 1 `discovery` completed, 1 `build` completed |
| `report_exports` | 12 | cached Claude-generated narrative payloads |
| `users` / `sessions` | Replit Auth only | no app-level roles |

No duplicate rows exist in `companies` or `firms` right now — the Notion-duplicate-pages and company-dedup issues described below are **real, already-triggered failure modes** (the Notion write path and the `/admin/backfill-pipeline-meta` repair endpoint both exist *because* they happened), not hypothetical ones. The absence of duplicates today reflects that they were cleaned up after the fact, not that the system prevents them.

### 2.2 Schema as it exists (`lib/db/src/schema/*`)

- **`firms`**: `id serial pk`, `name`, `slug unique`, `website`, `status` (`pending → queued → reviewed → ready`, plus legacy firms seeded straight to `active`), `createdByEmail`, `meta jsonb` (`FirmMeta`: `statusLabel`, `internalOnly`), `createdAt`.
- **`companies`**: `id serial pk`, `firmId` (FK, **no index**), `name`, `website`, `status` (`candidate → active/excluded`), `slug`, `meta jsonb` (`CompanyMeta`: sector, hq, ARR, confidence, engagement, summary, `gapNotes`, `actionsLog`, everything on `RawCompany` except id/name/assessments), `createdAt`.
- **`assessments`**: `id serial pk`, `companyId` (FK, **no index**), `date`, `p1`..`p8` **text** columns holding `"0"|"1"|"2"|"NA"` (deliberately text, not int, to store the `"NA"` literal), plus (per report-export work) per-pillar evidence text columns, `createdAt`. Already append-only in practice — nothing ever updates a past row; a re-run just inserts a new row with a later `date`.
- **`jobs`**: `id serial pk`, `type` (`discovery`|`build`), `targetId` **text, no FK** (polymorphic — currently always a firm id, but nothing enforces that), `status`, `progressPct`, `etaSeconds`, `error`, `createdAt`, `completedAt`, and one good pattern already in place: a **partial unique index** on `(type, targetId)` where `status in ('queued','running')`, which prevents two simultaneously-active jobs of the same type against the same target. There is **no** column linking a completed job to the `companies`/`assessments` rows it wrote.
- **`reportExports`**: `id serial pk`, `companyId` (FK), `assessmentId` (FK), `rubricVersion`, `reportData jsonb` (the full `DiagnosticReportData` payload, including `meta.composite`/`compositeMax`/`tier` — a **computed, cached** snapshot, keyed by `(assessmentId, rubricVersion)` unique), `model`, `createdAt`. This is the one place in the schema that **does** store a derived composite/tier — deliberately, as a versioned cache (bumping `RUBRIC_VERSION` naturally orphans stale rows rather than silently serving them). It is the concrete example this proposal uses below for "how do we guarantee a cached derived number never drifts from a fresh recompute."
- **`users`/`sessions`**: Replit Auth's mandatory tables only. No roles, no firm membership, no notion of "which admin can see which firm."

### 2.3 Where "source of truth" actually splits today

It is narrower than it looks. `artifacts/api-server/src/lib/portfolioData.ts` (the bootstrap loader behind `GET /api/portfolio/bootstrap`) **already reads only from Postgres** at runtime — both legacy and AI-onboarded firms come from the same `firms`/`companies`/`assessments` tables. The static TS files (`lib/portfolio-engine/src/data/{stg,pamlico,raviga,longarc,solen}.ts`, `firmsMeta.ts`'s `LEGACY_FIRMS_META`) are **not** a second live data source; they are read only by three scripts (`migrate-portfolio-to-db.ts`, `backfill-portfolio-meta.ts`, `verify-portfolio-parity.ts`).

The actual fork is **behavioral**, not "which table": `portfolioData.ts` builds a `LEGACY_SLUGS` set from `LEGACY_FIRMS_META` purely to decide *how strictly* to validate a firm's DB rows:

- **Legacy firm** → every company must have `slug` + `meta`, every row is included regardless of `status`, any violation **throws and fails the whole bootstrap** (all tenants go down together).
- **Pipeline firm** → filtered to `status === "active"` rows that already have `slug` + `meta` + ≥1 assessment; a broken firm is **skipped with a log**, the rest of the bootstrap still serves.

This means today's system has two different reliability contracts for the exact same table structure, selected by a hardcoded slug list imported from a file this task wants deleted. That is the concrete thing "single source of truth" needs to fix — not a storage location, a **behavior**. Once this fork is gone, every firm needs the *pipeline* semantics (fail-soft per firm) with an explicit, DB-driven flag for "this firm's data is authoritative enough that a hard failure should be loud" rather than an identity check against a slug list.

### 2.4 Compute-vs-store today

The core engine (`lib/portfolio-engine/src/engine.ts` — `buildFirmPortfolio` / `validateFirmData`) already recomputes composite, tier, weighted composite, and gaps from raw pillar scores on every read, for both legacy and pipeline firms, and throws on invariant violations. This part of requirement #3 is **already true** for the live app. The one place a derived number is **stored** is `report_exports.reportData.meta.composite`/`compositeMax`/`tier` — an intentional versioned cache, not a live value. The existing precedent (`migrate-portfolio-to-db.ts`) already treats "stored/derived vs freshly computed" mismatches as fatal: it recomputes each tenant's rollup straight from the DB and diffs it against the file-based rollup, exiting nonzero — never reconciling silently — on any mismatch. `verify-portfolio-parity.ts` re-runs that same two-path comparison on demand, at any time post-cutover, with zero writes. **These two scripts are the parity-gate pattern this proposal generalizes**, not a pattern to invent from scratch.

### 2.5 Notion sync — no idempotency (root cause of the duplicate-pages bug)

`artifacts/api-server/src/lib/notion.ts#writeDiagnosticToNotion` always does:

```
await notionFetch(apiKey, "/pages", { method: "POST", body: JSON.stringify({ parent: { database_id: db.id }, properties }) });
```

There is no query-by-title/query-by-relation step before the `POST`, and nothing in Postgres records "a Notion page already exists for assessment N." Every build-job run (including retries, resumed-on-restart jobs, or a company re-scored later) creates a brand-new Notion page. This is a one-way, best-effort, non-blocking sync (Postgres write always happens; Notion failure is logged and swallowed) — the fix belongs entirely on the Notion side of the boundary, not in how/when Postgres is written.

### 2.6 Job provenance today

`jobs.targetId` is a bare text column (currently always a firm id as a string) with no FK and no reverse link. Nothing records which `companies`/`assessments` rows a given `jobs` row created. Diagnosing "which build run wrote this row" or "did this discovery run re-create a company that already existed" currently requires reading logs, not the database.

### 2.7 Duplicate handling today — reactive, not structural

`POST /api/admin/backfill-pipeline-meta` (`routes/admin.ts`) is a standing **repair** endpoint: for every non-legacy firm, it groups `active` companies by `slugify(name)` and marks every row after the first (lowest id) as `status: "excluded"` — a soft, never-delete cleanup. This exists precisely because nothing in the schema stops the discovery/build pipeline from inserting a second row with the same normalized name under the same firm. It is a real, already-shipped mitigation for a real, already-observed problem — but it is app-level cleanup after the fact, not a database guarantee.

### 2.8 Auth-readiness today

Only Replit Auth's mandatory `users`/`sessions` tables exist. `/admin/*` is gated by an **email-domain allowlist** checked in route middleware (`isAllowedAdminEmail`, `@csrescue.com`) — there is no `roles` concept and no per-firm scoping table. Every allowlisted admin currently sees every firm; there is no representation of "PE firm X's users should only see firm X's portfolio" anywhere in the schema. (INVESQ's demo audience today is internal; this matters once real client logins are added.)

---

## 3. Target architecture

### 3.1 Principles

1. **One physical database, one logical model.** `firms → companies → assessments` stays the backbone. No table or file outside Postgres is ever read by a running server process.
2. **Compute, never store**, for anything derivable from raw pillar scores (composite, tier, weighted composite, gaps, ARR-at-risk). The one exception (`report_exports`) stays an explicit, versioned **cache**, not a second truth — and every write path that produces a cached derived value must independently recompute-and-compare against a fresh derivation before accepting it, exactly like the existing migration script already does for rollups.
3. **Append-only history.** `assessments` never gets `UPDATE`d for a past row; a re-score is always a new row with a later date. This is already true in practice — codify it with a trigger/constraint instead of only convention (see 3.3).
4. **Findings/gaps are rows, not JSON.** Per-pillar evidence and the "top 3 gaps" narrative currently live as jsonb blobs (`companies.meta.gapNotes`, `report_exports.reportData.gaps[]`) or get recomputed purely in memory (`engine.ts`'s `GapItem[]`). At the scale this proposal targets (hundreds of firms), gaps/findings need to be queryable ("show me every portfolio company across every firm with an Infrastructure-Gap CS-Leadership pillar") without deserializing jsonb — that means a first-class `findings` table, populated at assessment-write time.
5. **Every row has provenance.** Every `companies`/`assessments` row that did not come from a human admin UI action should carry a nullable `sourceJobId` back to the `jobs` row that created it. Legacy/migrated rows carry a distinct migration marker instead (see 3.2).
6. **Tenant scoping is explicit and enforced by FK + index, not by convention.** Every table below `firms` carries `firmId` (directly or transitively) and every one of those FKs is indexed.
7. **Room for Phase 2 ingestion** (real system connectors instead of Claude web-search) without another schema rewrite: `assessments`/`findings` already model "one evidence-bearing snapshot"; Phase 2 only needs a new `source` discriminator, not a new shape.

### 3.2 Schema changes (additive + tightening; illustrative Drizzle-style sketches, not literal diffs to apply now)

**Tightened existing tables:**

```ts
// firms — add explicit tenant-tier flag to replace LEGACY_SLUGS branching
firms: {
  ...existing columns...
  dataAuthority: pgEnum(["strict", "best_effort"]).notNull().default("best_effort"),
  // "strict" = bootstrap load fails loud on any invariant violation for this
  // firm (today's LEGACY_SLUGS behavior); "best_effort" = today's pipeline
  // behavior (skip + log). Replaces the hardcoded slug-list import entirely;
  // migrated legacy firms are seeded with "strict", everyone else defaults
  // to "best_effort". An admin can flip a firm to "strict" once its data has
  // been through the parity gate, instead of that guarantee being tied to
  // "was this one of the original 5."
}

// companies — index the FK, add a structural dedup guarantee, add provenance
companies: {
  ...existing columns...
  normalizedName: text("normalized_name").notNull(), // slugify(name), maintained at write time
  sourceJobId: integer("source_job_id").references(() => jobsTable.id), // null for admin/migrated rows
}
// indexes:
index("companies_firm_id_idx").on(companiesTable.firmId)
uniqueIndex("companies_firm_normalized_name_active_uq")
  .on(companiesTable.firmId, companiesTable.normalizedName)
  .where(sql`status <> 'excluded'`)
// ^ makes the /admin/backfill-pipeline-meta cleanup unnecessary going
//   forward: a second discovery/build run inserting the same company name
//   under the same firm fails the INSERT instead of needing a later repair
//   pass. The existing repair endpoint still runs once, before this
//   constraint is added, to resolve any pre-existing duplicates (there are
//   none today, but the constraint add must not assume that stays true).

// assessments — index the FK, enforce append-only, add provenance
assessments: {
  ...existing columns...
  sourceJobId: integer("source_job_id").references(() => jobsTable.id),
}
index("assessments_company_id_idx").on(assessmentsTable.companyId)
uniqueIndex("assessments_company_date_uq").on(assessmentsTable.companyId, assessmentsTable.date)
// a DB trigger (or, more simply, a documented "no UPDATE/DELETE on
// assessments outside the migration scripts" rule enforced by only granting
// INSERT/SELECT to the application's runtime role) makes append-only a
// guarantee rather than a convention.

// jobs — real FK to firm, so targetId stops being an untyped polymorphic text column
jobs: {
  ...existing columns except targetId...
  firmId: integer("firm_id").notNull().references(() => firmsTable.id),
}
index("jobs_firm_id_idx").on(jobsTable.firmId)
```

**New tables:**

```ts
// findings — one row per (assessment, pillar). Makes evidence/gaps queryable
// across firms without deserializing jsonb, and is the thing Phase 2
// ingestion sources write into instead of just a p1..p8 column set.
findingsTable = pgTable("findings", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull().references(() => assessmentsTable.id),
  pillarId: text("pillar_id").notNull(), // "org" | "onboarding" | ... (matches PILLARS[].id)
  score: text("score").notNull(), // "0" | "1" | "2" | "NA" — same text convention as today's p1..p8
  evidence: text("evidence"),
  source: text("source").notNull().default("claude_web_search"), // Phase 2: "crm_sync", "support_ticket_export", etc.
  createdAt: timestamp(...).defaultNow(),
});
uniqueIndex("findings_assessment_pillar_uq").on(findingsTable.assessmentId, findingsTable.pillarId);
index("findings_pillar_id_idx").on(findingsTable.pillarId); // enables the cross-firm pillar query above
// p1..p8 on `assessments` can stay as a denormalized fast-path for the
// existing bootstrap/engine read pattern (avoids an 8x row fan-out on every
// portfolio load) — findings becomes additive, not a breaking replacement,
// written in the same transaction as the assessments row. See migration
// Phase 1 for how existing assessments backfill into findings.

// notion_sync_state — the idempotency key Notion currently lacks
notionSyncStateTable = pgTable("notion_sync_state", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull().references(() => assessmentsTable.id),
  notionPageId: text("notion_page_id").notNull(),
  lastSyncedAt: timestamp(...).notNull(),
  lastSyncStatus: text("last_sync_status").notNull(), // "success" | "failed"
  lastError: text("last_error"),
});
uniqueIndex("notion_sync_state_assessment_uq").on(notionSyncStateTable.assessmentId);
// writeDiagnosticToNotion becomes: look up this row by assessmentId first;
// if a notionPageId exists, PATCH /pages/{id} instead of POST /pages; only
// insert a new notion_sync_state row (and POST) when none exists. This is a
// Postgres-side idempotency key — it does not require querying Notion's API
// for existing pages (which would need a reliable match key on their side
// that doesn't exist today either).

// roles / firm membership — auth-ready, not yet auth-enforced
rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull(), // "invesq_admin" | "firm_viewer" | "firm_editor"
  firmId: integer("firm_id").references(() => firmsTable.id), // null for invesq_admin (global)
});
uniqueIndex("roles_user_firm_uq").on(rolesTable.userId, rolesTable.firmId);
index("roles_firm_id_idx").on(rolesTable.firmId);

// ingestion_sources — Phase 2 placeholder, not built now, just given a slot
ingestionSourcesTable = pgTable("ingestion_sources", {
  id: serial("id").primaryKey(),
  firmId: integer("firm_id").notNull().references(() => firmsTable.id),
  kind: text("kind").notNull(), // "crm", "support_desk", "product_analytics", ...
  config: jsonb("config"), // connector-specific, encrypted-at-rest secrets live in Replit secrets, not here
  status: text("status").notNull().default("pending"),
  createdAt: timestamp(...).defaultNow(),
});
index("ingestion_sources_firm_id_idx").on(ingestionSourcesTable.firmId);
```

### 3.3 Tenant scoping & row-level isolation notes

Every data table below `firms` reaches it via an indexed FK chain: `companies.firmId → firms.id`, `assessments.companyId → companies.id`, `findings.assessmentId → assessments.id`, `jobs.firmId → firms.id`, `report_exports.companyId → companies.id`, `roles.firmId → firms.id`. At hundreds-of-firms scale this is what makes "give me firm X's dashboard" and "which admin can see firm X" both indexed lookups instead of table scans or jsonb filtering.

Enforcement today is, and for the near term should remain, **application-layer**: every query in `portfolioData.ts`/`routes/admin.ts` already filters by `firmId`/`slug` explicitly. Postgres **Row-Level Security (RLS)** is the natural next step once `roles`/`firm_members` exist and real (non-`@csrescue.com`) tenant logins are added — a policy like `USING (firm_id = current_setting('app.current_firm_id')::int)` on `companies`/`assessments`/`findings` would make cross-tenant leakage a database-level impossibility instead of an app-review concern. This proposal does **not** recommend turning RLS on yet: today's only tenant-scoped consumers (`/:firmSlug/portfolio/*`) already have their own DB session pooled by `@workspace/db`'s single `db` client (not one connection per tenant), so RLS would require per-request `SET LOCAL` session variables threaded through every query — real work, and premature before there is a second class of real (not `@csrescue.com`-admin) authenticated user. Flagged as the concrete trigger condition in Open Questions.

### 3.4 Compute-never-store enforcement, concretely

- **Where it already holds:** `engine.ts` (composite/tier/gaps at read time), and the existing migration/parity scripts (recompute + diff + fail loud on mismatch, never silently reconcile).
- **Where it needs to be added:** any new pipeline that writes a `report_exports`-shaped cache (i.e., anything that could store `meta.composite`) must run the same recompute-and-compare check `migrate-portfolio-to-db.ts` already runs, as a guard *before* the row is persisted — not just at migration time. Concretely: `getOrGenerateReportExport()` should independently derive `composite`/`compositeMax`/`tier` from the assessment's `findings`/`p1..p8` via the shared engine function, compare it against whatever the narrative-generation step produced, and refuse to persist (loud error, not silent substitution) on any mismatch, mirroring the migration script's `anyMismatch` exit behavior.
- **New import/ingestion boundary rule:** any future bulk import (the Phase 1 migration in Section 4, and Phase 2 ingestion connectors later) must never accept a pre-computed composite/tier/score from its source data — only raw per-pillar scores/evidence — and must derive everything else via `@workspace/portfolio-engine` at import time, comparing against the source's own claimed rollup (where one exists, e.g. the static files' file-based summary) and failing the import on mismatch, exactly as `migrate-portfolio-to-db.ts` does today.

### 3.5 Notion sync boundary — redesigned

Direction stays one-way, Postgres → Notion, best-effort, non-blocking (unchanged: a Notion failure must never fail a build job or block a Postgres write). What changes:

1. Before writing, `writeDiagnosticToNotion` (or its caller) looks up `notion_sync_state` by `assessmentId`.
2. **No row found** → `POST /pages` as today, then insert a `notion_sync_state` row with the returned Notion page id and `lastSyncStatus: "success"`.
3. **Row found** → `PATCH /pages/{notionPageId}` (update properties in place) instead of creating a new page. If the Notion page was deleted/archived out-of-band, Notion's API returns a 404/410 on PATCH — treat that as "stale pointer," log it, and fall back to a fresh `POST` + row update (self-healing, still never blocks).
4. A resumed/retried job (server restart mid-run, the documented startup `resumeQueuedBuildJobs()` behavior) now naturally becomes idempotent against Notion: re-running the same assessment finds its existing `notion_sync_state` row and `PATCH`es instead of creating a duplicate.
5. `lastSyncStatus`/`lastError` give the admin UI a real per-assessment sync status to surface, instead of only a server log line.

### 3.6 Auth-ready schema

`roles`/`firm_members` (3.2) is intentionally minimal and additive — it does not require ripping out the current `@csrescue.com`-domain-allowlist gate for `/admin/*` (that stays exactly as documented in `replit.md`, defense-in-depth, server-side). It adds a second, orthogonal axis: once real tenant users exist, `requireFirmAccess(firmId)` middleware can check `roles` the same way `requireAdminAuth` already checks the domain allowlist — same pattern, new table, no schema migration needed later because the table already exists from this phase.

---

## 4. Phased migration plan

Every phase respects the platform's dev/prod schema flow (`.local/skills/database/references/database-migrations-on-publish.md`): schema changes are made in `lib/db/src/schema/*` only; `pnpm --filter @workspace/db run push-force` (already run automatically post-merge) applies them to the **development** database; **production** schema only ever changes via the Publish-flow diff-and-confirm UI. No phase below involves hand-written SQL migration files, deploy-time DDL hooks, or direct `psql`/`drizzle-kit push` against a production connection string — all of that is explicitly out of bounds per that reference doc, and this plan does not need any of it because `drizzle-kit push` is schema-diff-based, not a linear migration-file chain.

### Phase 1 — Schema + tooling (small)
Add the tightened columns/indexes and new tables from Section 3.2 to `lib/db/src/schema/*`. Write (but do not yet switch anything over to) a backfill step that populates `companies.normalizedName` for existing rows and a one-time `findings` backfill that fans each existing `assessments.p1..p8` row out into 8 `findings` rows (reusing the existing `textToScore`/pillar-id-mapping helpers already proven correct by `migrate-portfolio-to-db.ts`). Ships behind no flag yet — additive columns/tables are safe to add without touching any read path. Verify with `pnpm run typecheck` after `push-force` runs the new schema to dev.

### Phase 2 — Import + parity gate (medium)
This phase does **not** re-run the original file→DB migration (that already happened; 137 assessments are already in Postgres). Its job is narrower and newly necessary because of Section 3.1's principle #6: retrofit provenance and the new dedup constraint onto **existing** rows before the constraint goes live, and extend the parity pattern to the new `findings` table.
1. Run `/admin/backfill-pipeline-meta`-equivalent dedup logic (already exists, already proven safe — never deletes) once more immediately before adding the `companies_firm_normalized_name_active_uq` index, to guarantee zero pre-existing violators.
2. Backfill `findings` from `assessments.p1..p8` for all 140 existing rows.
3. Extend `verify-portfolio-parity.ts`'s pattern (independent recompute, diff, nonzero exit on any mismatch, zero writes) to also assert: every `assessments` row has exactly 8 `findings` rows, every `companies` row satisfies the new normalized-name uniqueness, and every stored `report_exports.meta.composite` still matches a fresh recompute from its `findings`. This becomes the permanent, re-runnable **parity gate** referenced throughout this document — not a one-off script that gets deleted after use.

### Phase 3 — Flag-based cutover of the behavioral fork (small)
Replace the `LEGACY_SLUGS` check in `portfolioData.ts` with the new `firms.dataAuthority` column (Section 3.2). Seed the 5 legacy firms to `"strict"` (identical behavior to today) and every other firm to `"best_effort"` (also identical to today) — this phase is a **pure refactor with zero behavior change**, verified by running the parity gate before and after and confirming byte-identical output. Only after this ships does "which firm is treated as authoritative" become a database fact instead of an imported constant, which is the actual precondition for Phase 4.

### Phase 4 — Delete static files + `LEGACY_FIRMS_META` (small, but the point of no return)
Delete `lib/portfolio-engine/src/data/{stg,pamlico,raviga,longarc,solen}.ts` and `firmsMeta.ts`'s `LEGACY_FIRMS_META` export, and the three scripts that read them (`migrate-portfolio-to-db.ts`, `backfill-portfolio-meta.ts`, `verify-portfolio-parity.ts` in their *current file-comparing* form). **Before deleting**, `verify-portfolio-parity.ts`'s DB-only assertions (row counts, invariant checks, the new `findings`/dedup/report-export checks from Phase 2) must be extracted into a **file-independent** successor script kept permanently in the repo — parity checking does not stop being useful once there's no second copy to diff against; it just stops being a *file-vs-DB* diff and becomes a pure DB invariant check (append-only assessments, FK integrity, no orphaned findings, no duplicate active companies). This is the one phase that is irreversible without a checkpoint rollback, so it should not ship in the same change as Phase 3.

### Phase 5 — Admin-overlay / export follow-through (medium)
With the static files gone, anything that still imports from `@workspace/portfolio-engine/data` (grep-verify zero remaining call sites — the components skill's own audit already confirms `AdminReportPreview.tsx`/`ExportPanel.tsx` don't) is a compile error, not a runtime surprise, which is the intended safety net of doing this in TypeScript rather than a scripting language. Wire the new `notion_sync_state` idempotency check into `writeDiagnosticToNotion` (Section 3.5) and the `sourceJobId` provenance columns into `discovery.ts`/`build.ts`'s insert calls (Section 3.2) in this phase — both are additive to already-working code paths, not a rewrite.

### Dev/prod divergence handling
Phases 1–2 are schema-additive and data-repair-only against **development**; nothing in them requires a production decision yet. Phase 3 is a dev-only behavior refactor (no schema change at all). Phase 4/5 are the first phases where production needs the new columns — at that point, the standard flow applies: merge → dev auto-`push-force`s the new schema → verify in dev → user clicks **Publish**, which diffs dev/prod schemas and applies them to production with rename-confirmation, exactly as `database-migrations-on-publish.md` describes. Because production's `firms`/`companies`/`assessments` data is presumably a copy of (or independently seeded from) the same static files/migration history as dev, the parity gate from Phase 2 should be re-run against production data too (via `executeSql({ environment: "production" })`, read-only) **before** Phase 4 deletes the comparison files for good — if production ever diverged from dev (e.g., a prod-only admin-created firm that dev doesn't have), the file-based comparison obviously can't validate it, but the DB-invariant successor script from Phase 4 can and should run against both.

---

## 5. Tech recommendation

**Postgres (Replit-managed) + Drizzle ORM, unchanged.** Rationale:
- Already fully adopted (`@workspace/db`, `drizzle-kit push`), already handles the append-only/jsonb/FK patterns this proposal extends rather than replaces.
- `jsonb` columns (`meta`, `reportData`) are adequate for the "rich descriptive fields with no current normalization pressure" (sector, hq, ARR, gapNotes, actionsLog) — Section 3 does not propose normalizing these now; they are read wholesale by the engine and have no query pattern that needs column-level filtering, unlike `findings.pillarId`/`score`, which do.
- Postgres's native `jsonb` + relational FKs + partial/unique indexes cover every requirement in this document (append-only via role grants, dedup via partial unique index, provenance via FK, tenant scoping via indexed FK chain) without introducing a second storage technology, a search index, or a NoSQL layer. At "hundreds of firms / thousands of companies / tens of thousands of assessments," this is comfortably within a single well-indexed Postgres instance's normal operating range — no sharding, read-replica, or queue-based write path is warranted by this proposal's scale target.

## 6. Relative phase sizing

| Phase | Relative size | Why |
|---|---|---|
| 1 — Schema + tooling | S | Additive columns/tables only, no read-path change |
| 2 — Import + parity gate | M | Backfill script + dedup pre-check + extending an existing verify script's assertions |
| 3 — Flag-based cutover | S | Pure refactor, one column, one call site, verified by re-running Phase 2's gate |
| 4 — Delete static files | S (execution) / high-stakes | Small diff, but irreversible-without-rollback; gated on Phase 2/3 passing clean |
| 5 — Admin-overlay/export follow-through | M | Notion idempotency + job provenance wiring touch two independently-working pipelines |

No phase here is "large" in isolation — the largest single risk is sequencing (doing Phase 4 before Phase 2's gate has actually run clean), not any individual phase's code size.

---

## 7. Risks

1. **Deleting the static files before the parity gate is truly file-independent** removes the only ground truth to compare against if a subtle drift is later discovered — Phase 4 explicitly requires extracting DB-only invariant checks *before* deletion for this reason.
2. **The new `companies_firm_normalized_name_active_uq` constraint could reject a legitimate re-discovery** (e.g., a portfolio company that was `excluded` and should later become `active` again under a different, intentionally-similar name) if the normalization function is too aggressive — needs a small test matrix against the 30 existing company names before going live, not just the 3 pipeline ones.
3. **RLS is explicitly deferred** (Section 3.3) — until it lands, tenant isolation remains an application-code guarantee. A new route added without the existing `firmId`/`slug` filter convention would leak cross-tenant data with no database-level backstop.
4. **`jobs.firmId` becoming `NOT NULL`** breaks the `targetId`-as-text polymorphism if a future job type ever targets something other than a firm (e.g., a per-company rescore job) — worth deciding the job-target model before Phase 1 ships this column, not after.
5. **Notion's own duplicate pages from before this proposal ships** are not retroactively cleaned up by `notion_sync_state` — it only prevents *future* duplicates. Existing duplicate Notion pages need a manual one-time cleanup in Notion itself (out of scope for a Postgres-side schema doc).
6. **Production/dev data divergence** (Section 4's "dev/prod divergence handling") is asserted as a risk, not a known fact — this document has not verified whether production already has admin-created firms that dev lacks. That must be checked (read-only) before Phase 4 runs.

## 8. Open questions

1. Should `firms.dataAuthority` default flip to `"strict"` automatically once a firm passes the parity gate once, or should that always require an explicit admin action? (Section 3.2/Phase 3 assumes explicit for now.)
2. Is there a real, previously-observed incident behind "reject mismatches on stored composites" beyond the `report_exports.meta.composite` cache this audit found — i.e., did a *Notion*-side stored composite ever disagree with a live recompute, or was the composite-drift risk always specifically about `report_exports`? This document treats `report_exports` as the concrete, verified example; if there's a distinct Notion incident, it should be named and folded into Section 3.5.
3. What is the actual trigger condition for turning on RLS — a specific number of non-`@csrescue.com` tenant users, or the first time a non-admin login type is added at all?
4. Should `findings` fully replace the `assessments.p1..p8` denormalized columns eventually (single source within Postgres itself), or is the two-representation design (fast columns + queryable rows) intended to be permanent? This proposal keeps both indefinitely; a future doc could revisit collapsing to one.
5. For Phase 2's production parity check — who has already confirmed production's `firms`/`companies`/`assessments` came from the same migration history as dev, versus being seeded independently? If independent, the "compare to dev" framing in Phase 4 doesn't apply and production needs its own from-scratch parity run against whatever its actual origin data was.
6. Does the eventual Phase 2 ingestion layer (`ingestion_sources`, Section 3.2) need per-connector credentials stored anywhere in Postgres, or does every connector's auth live entirely in Replit-managed secrets/integrations with only non-secret config (endpoint, sync cadence, field mappings) in the `config` jsonb column? This document assumes the latter but it is not yet decided.
