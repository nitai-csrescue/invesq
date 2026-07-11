import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { assessmentsTable } from "./assessments";

// An admin-edited revision of a company report's NARRATIVE sections (exec
// summary, composite context, existing systems, path forward, per-gap
// impact/recommendation, next steps). Computed fields (scores/tier/gap titles)
// are never stored here as authoritative — the server always re-merges edited
// narrative onto its own freshly-computed base at read time.
//
// Append-only history: every Save inserts a new row. The "current" revision for
// a company is the latest (desc createdAt, desc id) row for the company's latest
// assessment whose rubricVersion matches the current RUBRIC_VERSION; older or
// stale-version rows are ignored. Because validations (report_validations) key
// off revisionId, a new revision automatically starts with zero validations,
// which is how "any Save invalidates existing validations" falls out for free.
export const reportRevisionsTable = pgTable(
  "report_revisions",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessmentsTable.id),
    rubricVersion: text("rubric_version").notNull(),
    // Shape: DiagnosticReportData (lib/api-spec/openapi.yaml). Only the
    // narrative fields are meaningful; computed fields are placeholders that
    // the read path overwrites with freshly-computed values.
    reportData: jsonb("report_data").notNull(),
    editedByEmail: text("edited_by_email").notNull(),
    editedByName: text("edited_by_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("report_revisions_company_id_idx").on(table.companyId),
    index("report_revisions_assessment_id_idx").on(table.assessmentId),
  ],
);

export const insertReportRevisionSchema = createInsertSchema(reportRevisionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReportRevision = z.infer<typeof insertReportRevisionSchema>;
export type ReportRevision = typeof reportRevisionsTable.$inferSelect;
