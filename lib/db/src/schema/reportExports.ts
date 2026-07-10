import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { assessmentsTable } from "./assessments";

// A generated, cacheable "branded report" payload for one company's assessment.
// Regenerated (new row) only when a new assessment lands for the company or
// `rubricVersion` changes — never mutated in place, so history accumulates.
export const reportExportsTable = pgTable(
  "report_exports",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessmentsTable.id),
    rubricVersion: text("rubric_version").notNull(),
    // Shape: DiagnosticReportData (lib/api-spec/openapi.yaml).
    reportData: jsonb("report_data").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Cache key: at most one export per (assessment, rubric version). A new
    // assessment or a rubric version bump naturally produces a new row
    // instead of invalidating/mutating an old one.
    uniqueIndex("report_exports_assessment_rubric_unique").on(table.assessmentId, table.rubricVersion),
  ],
);

export const insertReportExportSchema = createInsertSchema(reportExportsTable).omit({ id: true, createdAt: true });
export type InsertReportExport = z.infer<typeof insertReportExportSchema>;
export type ReportExport = typeof reportExportsTable.$inferSelect;
