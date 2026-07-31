import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentsTable } from "./assessments";
import { companiesTable } from "./companies";

// Structured, queryable evidence records captured per pillar during a
// diagnostic run — the machine-readable complement to the free-text
// assessments.pNEvidence strings. Evidence metadata ONLY: signals never
// participate in composite/tier/denominator math anywhere. Multiple signals
// per (assessment, pillar) are expected, hence the non-unique index (unlike
// findings, which is one row per pillar).
export const signalsTable = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessmentsTable.id),
    // Denormalized for direct per-company querying without a join through
    // assessments (mirrors how the tenant portal reads by company).
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // Matches PILLARS[].id in @workspace/portfolio-engine.
    pillarId: text("pillar_id").notNull(),
    // Where the signal was observed: "linkedin" | "job_posting" |
    // "g2_capterra" | "press" | "crunchbase" | "pitchbook" | "company_site" |
    // "other". Stored as text (not a pg enum) so new source kinds never need
    // a migration; writers normalize to the known set.
    source: text("source").notNull(),
    // ISO date string (YYYY-MM-DD) when the underlying artifact is dated
    // (e.g. a press release or job posting date); null when undatable.
    dateObserved: text("date_observed"),
    url: text("url"),
    // "positive" | "negative" | "neutral" — which way this signal points for
    // the pillar it informs.
    direction: text("direction").notNull(),
    // "High" | "Medium" | "Low" — the researcher's confidence in this single
    // signal (NOT the company-level confidence, which stays derived from NA
    // count in build.ts).
    confidence: text("confidence").notNull(),
    // Short plain-English note (target ≤ 2 sentences). Copy policy applies:
    // no em-dashes, no named individuals.
    note: text("note").notNull(),
    // ---- CQ-15 additive columns (all nullable or defaulted: existing rows
    // are untouched by this migration; only NEW writes populate them). ----
    // Which collection SYSTEM produced the record: "legacy_scrape" (the
    // Claude web-research pipeline, authoritative for CS-specific qualitative
    // signals and total headcount) | "pdl" | "revelio" | future supplemental
    // adapters. Distinct from `source`, which is the artifact kind
    // (linkedin/job_posting/...). Text, not a pg enum, so adding an adapter
    // never needs a migration.
    sourceSystem: text("source_system").notNull().default("legacy_scrape"),
    // Machine-readable field name for structured signals (e.g.
    // "total_headcount", "funding_history", "country_headcount"). Null for
    // narrative pillar-evidence signals, whose content lives in `note`.
    field: text("field"),
    // Normalized value for structured signals (stringified number or compact
    // JSON). Null for narrative signals.
    value: text("value"),
    // Rubric version in force when this signal was collected (RUBRIC_VERSION
    // from @workspace/portfolio-engine). Null on rows written before CQ-15.
    rubricVersion: text("rubric_version"),
    // True when a SUPPLEMENTAL source disagreed with the legacy scrape by
    // more than 20% on an overlapping field (today: total_headcount). The
    // legacy value stays authoritative and is never overwritten; this flag
    // surfaces the conflict for human review instead of silently resolving it.
    divergenceFlag: boolean("divergence_flag").notNull().default(false),
    // `createdAt` doubles as the "date pulled" timestamp for the record.
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("signals_assessment_pillar_idx").on(table.assessmentId, table.pillarId),
    index("signals_company_id_idx").on(table.companyId),
  ],
);

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
