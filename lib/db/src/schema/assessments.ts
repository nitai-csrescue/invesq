import { date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { jobsTable } from "./jobs";

// p1-p8 scores are stored as TEXT (not integer) because the literal value
// "NA" (insufficient data) is a valid score alongside numeric strings.
export const assessmentsTable = pgTable(
  "assessments",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    date: date("date", { mode: "string" }).notNull(),
    p1: text("p1"),
    p2: text("p2"),
    p3: text("p3"),
    p4: text("p4"),
    p5: text("p5"),
    p6: text("p6"),
    p7: text("p7"),
    p8: text("p8"),
    p1Evidence: text("p1_evidence"),
    p2Evidence: text("p2_evidence"),
    p3Evidence: text("p3_evidence"),
    p4Evidence: text("p4_evidence"),
    p5Evidence: text("p5_evidence"),
    p6Evidence: text("p6_evidence"),
    p7Evidence: text("p7_evidence"),
    p8Evidence: text("p8_evidence"),
    // Provenance: which `jobs` row (if any) produced this assessment. Null
    // for every row today, same reasoning/deferral as companies.sourceJobId
    // above — wiring this into build.ts's insert call is Phase 5 scope.
    sourceJobId: integer("source_job_id").references(() => jobsTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("assessments_company_id_idx").on(table.companyId),
    // Re-added in Publish 2 (2026-07-11) after the one-time repair cleared the
    // duplicate (company_id, date) rows. This is the production guard against a
    // build-job retry re-inserting a duplicate assessment for the same day.
    uniqueIndex("assessments_company_date_uq").on(table.companyId, table.date),
  ],
);

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({ id: true, createdAt: true });
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessmentsTable.$inferSelect;
