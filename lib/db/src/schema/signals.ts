import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
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
