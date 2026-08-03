import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { tierDisputesTable } from "./tierDisputes";

// ---------------------------------------------------------------------------
// CQ-37 — Append-only audit log for every tier-model mutation.
//
// Every admin write to a company's tier2_status / tier3_status (direct edit
// or dispute resolution) MUST insert exactly one row here, in the same
// transaction as the mutation. There is deliberately no update/delete path
// for this table anywhere in the codebase — silent overwrites are the
// failure mode this exists to prevent.
// ---------------------------------------------------------------------------
export const tierAuditLogTable = pgTable(
  "tier_audit_log",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // e.g. "tier3_status", "tier2_status.crm"
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    // Admin (email) who made the change — from the validated Admin Lens
    // session, never client-supplied.
    editor: text("editor").notNull(),
    // Free-form context; for dispute resolutions this carries the dispute
    // reason plus any resolution note.
    note: text("note"),
    // Set when this change was the resolution of a dispute.
    disputeId: integer("dispute_id").references(() => tierDisputesTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tier_audit_log_company_id_idx").on(table.companyId)],
);

export const insertTierAuditLogSchema = createInsertSchema(tierAuditLogTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTierAuditLog = z.infer<typeof insertTierAuditLogSchema>;
export type TierAuditLogRow = typeof tierAuditLogTable.$inferSelect;
