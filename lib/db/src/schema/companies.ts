import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("companies_firm_id_idx").on(table.firmId),
    // companies_firm_normalized_name_active_uq TEMPORARILY REMOVED 2026-07-11:
    // production has one duplicate (firm_id=1, name="ClarisHealth") pair.
    // The repair endpoint sets company_id=6 status='excluded' in Publish 1,
    // after which the partial index would apply cleanly. Re-added in Publish 2.
    // See BUILD-LOG.md "Production conflicting-assessments repair".
  ],
);

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
