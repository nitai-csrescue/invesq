import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

// ---------------------------------------------------------------------------
// CQ-37 — Tier 3 (Portco Validation) dispute queue.
//
// When a portco disputes a Tier 3 item, that dispute must NEVER auto-change
// the underlying score/evidence. It only creates a row here with
// status "pending". A separate, explicit admin action resolves it
// (applied/rejected), and the apply path is the ONLY thing that mutates the
// disputed value — and always alongside a tier_audit_log row. Until CQ-11
// ships the portco-facing flow, disputes are entered manually by an admin.
// ---------------------------------------------------------------------------
export const tierDisputesTable = pgTable(
  "tier_disputes",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // What is being disputed. "tier3_status" is the only field the resolve
    // endpoint can auto-apply today; kept as text for CQ-11 generality.
    field: text("field").notNull(),
    // The portco's dispute reason/note (required — a dispute with no reason
    // is not reviewable).
    reason: text("reason").notNull(),
    // Optional value the disputer proposes.
    proposedValue: text("proposed_value"),
    // "pending" | "applied" | "rejected"
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    // Admin (email) who resolved it.
    resolvedBy: text("resolved_by"),
    resolutionNote: text("resolution_note"),
  },
  (table) => [
    index("tier_disputes_company_id_idx").on(table.companyId),
    index("tier_disputes_status_idx").on(table.status),
  ],
);

export const insertTierDisputeSchema = createInsertSchema(tierDisputesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTierDispute = z.infer<typeof insertTierDisputeSchema>;
export type TierDispute = typeof tierDisputesTable.$inferSelect;
