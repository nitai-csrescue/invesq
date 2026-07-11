import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { reportRevisionsTable } from "./reportRevisions";

// A single validator's sign-off on a specific report revision. A report is
// "dual-validated" (and its clean client PDF unlocks) only when the CURRENT
// revision carries validations from BOTH configured validator emails (see
// VALIDATOR_EMAILS / lib/validators.ts). Because each row is keyed to a
// revisionId, saving a new revision resets validation state to 0/2 with no
// extra bookkeeping.
export const reportValidationsTable = pgTable(
  "report_validations",
  {
    id: serial("id").primaryKey(),
    revisionId: integer("revision_id")
      .notNull()
      .references(() => reportRevisionsTable.id),
    validatorEmail: text("validator_email").notNull(),
    validatorName: text("validator_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // At most one validation per (revision, validator) — makes the Validate
    // action idempotent and prevents a single validator from counting twice.
    uniqueIndex("report_validations_revision_validator_uq").on(table.revisionId, table.validatorEmail),
  ],
);

export const insertReportValidationSchema = createInsertSchema(reportValidationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReportValidation = z.infer<typeof insertReportValidationSchema>;
export type ReportValidation = typeof reportValidationsTable.$inferSelect;
