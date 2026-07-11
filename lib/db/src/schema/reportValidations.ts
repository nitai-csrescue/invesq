import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { reportRevisionsTable } from "./reportRevisions";

// A single validator's sign-off on a specific report revision. A report is
// "dual-validated" (and its clean client PDF unlocks) only when the CURRENT
// revision carries validations from BOTH configured validator emails (see
// VALIDATOR_EMAILS / lib/validators.ts), OR when one validator has submitted
// an override for the other's missing sign-off (overrideFor + overrideReason).
// Because each row is keyed to a revisionId, saving a new revision resets
// validation state to 0/2 with no extra bookkeeping.
export const reportValidationsTable = pgTable(
  "report_validations",
  {
    id: serial("id").primaryKey(),
    revisionId: integer("revision_id")
      .notNull()
      .references(() => reportRevisionsTable.id),
    validatorEmail: text("validator_email").notNull(),
    validatorName: text("validator_name").notNull(),
    // Override support: when a validator waives the other's missing sign-off,
    // overrideFor holds the overridden validator's email and overrideReason
    // holds the mandatory typed justification. Null on a normal sign-off.
    // The override row counts as the submitter's own sign-off AND unlocks the
    // report (server unlock rule: all signed OR any row has overrideFor set).
    overrideFor: text("override_for"),
    overrideReason: text("override_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // At most one validation per (revision, validator) — makes the Validate
    // action idempotent and prevents a single validator from counting twice.
    // Use ON CONFLICT DO UPDATE (upsert) in the validate route so a validator
    // can upgrade a normal sign-off to include an override without re-inserting.
    uniqueIndex("report_validations_revision_validator_uq").on(table.revisionId, table.validatorEmail),
  ],
);

export const insertReportValidationSchema = createInsertSchema(reportValidationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReportValidation = z.infer<typeof insertReportValidationSchema>;
export type ReportValidation = typeof reportValidationsTable.$inferSelect;
