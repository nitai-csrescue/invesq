import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

// p1-p8 scores are stored as TEXT (not integer) because the literal value
// "NA" (insufficient data) is a valid score alongside numeric strings.
export const assessmentsTable = pgTable("assessments", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({ id: true, createdAt: true });
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessmentsTable.$inferSelect;
