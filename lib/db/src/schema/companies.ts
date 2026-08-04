import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { firmsTable } from "./firms";
import { jobsTable } from "./jobs";

export const companiesTable = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    firmId: integer("firm_id")
      .notNull()
      .references(() => firmsTable.id),
    name: text("name").notNull(),
    website: text("website"),
    // "active" | "excluded" | "candidate" (AI-discovered, not yet reviewed/confirmed).
    status: text("status").notNull().default("active"),
    // URL identifier used by the portfolio portals (RawCompany.id in the
    // portfolio engine, e.g. "renaissance-systems").
    slug: text("slug"),
    // Canonical dedup key: @workspace/portfolio-engine's normalizeCompanyName(name)
    // (same algorithm as routes/admin.ts's slugify). See
    // ARCHITECTURE-UNIFIED-DB.md Section 3.2/Risk #2. Nullable for now — a
    // one-time backfill script (scripts/backfill-unified-db.ts) populates it
    // for all existing rows; NOT NULL was deliberately not applied in this
    // phase because `ALTER TABLE ... ADD COLUMN ... NOT NULL` fails outright
    // against the table's existing populated rows with no default value.
    // Going forward, every insert path should set it; enforcing NOT NULL at
    // the DB level is left as a later tightening pass once 100% backfilled
    // coverage is confirmed.
    normalizedName: text("normalized_name"),
    // Provenance: which `jobs` row (if any) created this company. Null for
    // every row today — legacy migrated companies were never job-created,
    // and wiring this into discovery.ts's insert call is explicitly Phase 5
    // scope (ARCHITECTURE-UNIFIED-DB.md), not this phase. Additive-only column.
    sourceJobId: integer("source_job_id").references(() => jobsTable.id),
    // Rich descriptive fields consumed by the portfolio engine (sector, hq,
    // ARR display/rollup, summaries, gap notes, actions log, ...). Shape is
    // CompanyMeta in @workspace/portfolio-engine.
    meta: jsonb("meta"),
    // Diagnostic-report cover metadata (admin-editable, per-company). All
    // nullable: null = "use the default" (blank Prepared For fields, the
    // static INVESQ Prepared By constants, company name, today's date).
    // These are read fresh from this row on every report load, so they are
    // never captured into report_exports / report_revisions caches.
    preparedForName: text("prepared_for_name"),
    preparedForTitle: text("prepared_for_title"),
    // Overrides the "Company" line of the Prepared For card ONLY (the report
    // H1 / narrative always uses `name`).
    preparedForCompanyOverride: text("prepared_for_company_override"),
    preparedByName: text("prepared_by_name"),
    preparedByOrg: text("prepared_by_org"),
    // Overrides reportData.reportDate (the Prepared By card's Date line).
    // Calendar day, stored as YYYY-MM-DD.
    preparedByDate: date("prepared_by_date", { mode: "string" }),
    // ---- CQ-15: supplemental-enrichment-only fields. Populated EXCLUSIVELY
    // by third-party enrichment adapters (PDL now, Revelio later) — the
    // legacy web-research scrape never writes these two columns, and the
    // adapters never write anything the legacy scrape owns (headcount
    // display, ratings, leadership, job-posting evidence). A matching
    // "Funding History" / "Country Headcount" pair should exist on the Notion
    // diagnostic database when Notion sync (Phase 5) is wired; noted here so
    // that mapping isn't forgotten. ----
    // Array of funding rounds: { amountUsd: number|null, round: string|null,
    //   stage: string|null, date: string|null } plus a summary object
    //   { totalRaisedUsd, roundCount, latestStage, source, pulledAt }.
    fundingHistory: jsonb("funding_history"),
    // Country -> employee-count map plus { source, pulledAt } metadata.
    countryHeadcount: jsonb("country_headcount"),
    // ---- CQ-45: first-class ARR with provenance. All three nullable; null =
    // Undisclosed (the platform-wide convention: excluded from rollups, never
    // zero-filled). No backfill was performed — every pre-existing row keeps
    // null. When `arr` is set, the portfolio engine derives the ARR-at-risk
    // dollar range from the tier's published risk-% band, and any tenant-facing
    // surface must qualify the figure with "as of <arr_as_of>" (copy policy:
    // a dated figure is never presented as current). ----
    // Annual recurring revenue in whole dollars (numeric to avoid float drift).
    arr: numeric("arr"),
    // Calendar date the ARR figure was reported/valid as of (YYYY-MM-DD).
    arrAsOf: date("arr_as_of", { mode: "string" }),
    // Free-text provenance, e.g. "press release 2025-06", "company filing".
    arrSource: text("arr_source"),
    // ---- CQ-37: tiered confidence model. Tiers are INDEPENDENT, never
    // cumulative (design locked by Nitai, Aug 3 2026) — any combination is
    // valid. Tier 1 (INVESQ Initial Scan) has NO column: it is derived from
    // the company having Phase 1 assessment rows. ----
    // Tier 2 (Portco Telemetry Integration): per-connector-type status map,
    // shape Tier2Status below. null = no connector has ever been set =
    // every connector "not_connected" (matches today's Phase 2 placeholder
    // cards). Admin-editable only; nothing tenant-facing writes this.
    tier2Status: jsonb("tier2_status"),
    // Tier 3 (Portco Validation), CQ-12 locked vocabulary:
    // "unconfirmed" | "portco_confirmed" | "pe_confirmed". Default backfills
    // every existing row to unconfirmed. Mutations MUST go through the admin
    // tier routes, which write a tier_audit_log row in the same transaction.
    tier3Status: text("tier3_status").notNull().default("unconfirmed"),
    // ---- Data Moat action #3: Outcome Data (2026-08-04). INTERNAL-ONLY
    // retention outcomes, shape OutcomeMetrics below. null = never entered.
    // Admin-Lens-editable ONLY (routes/adminOutcomes.ts). NEVER surfaced on
    // any tenant-facing route, client report, or exported PDF — the
    // portfolio bootstrap mapper spreads companies.meta plus explicit
    // fields, so this top-level column is structurally excluded; keep it
    // that way. Standing rule: real GRR/NRR figures never appear in
    // real-tenant client-facing material.
    outcomeMetrics: jsonb("outcome_metrics"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("companies_firm_id_idx").on(table.firmId),
    // Re-added in Publish 2 (2026-07-11) after the repair excluded the duplicate
    // ClarisHealth row. Partial unique index: at most one active/candidate
    // company per (firm, normalized name); 'excluded' rows are outside its scope.
    uniqueIndex("companies_firm_normalized_name_active_uq")
      .on(table.firmId, table.normalizedName)
      .where(sql`${table.status} <> 'excluded'`),
  ],
);

// CQ-37 tier-model vocabularies. Kept here (next to the columns) so every
// consumer — api-server routes, admin UI via api-zod — shares one source.
export const TIER2_CONNECTOR_TYPES = [
  "backengine",
  "crm",
  "conversation_intelligence",
  "product_telemetry",
] as const;
export type Tier2ConnectorType = (typeof TIER2_CONNECTOR_TYPES)[number];
export const TIER2_CONNECTOR_STATUSES = ["not_connected", "partial", "connected"] as const;
export type Tier2ConnectorStatus = (typeof TIER2_CONNECTOR_STATUSES)[number];
// Shape of companies.tier2_status. Missing keys mean "not_connected".
export type Tier2Status = Partial<Record<Tier2ConnectorType, Tier2ConnectorStatus>>;
export const TIER3_STATUSES = ["unconfirmed", "portco_confirmed", "pe_confirmed"] as const;
export type Tier3Status = (typeof TIER3_STATUSES)[number];

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
