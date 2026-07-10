import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentsTable } from "./assessments";

// The idempotency key Notion currently lacks (ARCHITECTURE-UNIFIED-DB.md
// Section 2.5 / 3.5). Once wired in (Phase 5, out of scope for this phase),
// writeDiagnosticToNotion looks this row up by assessmentId first: no row ->
// POST /pages then insert this row; row exists -> PATCH /pages/{notionPageId}
// instead of creating a duplicate page. This table is created now with zero
// callers — additive only, no behavior change in this phase.
export const notionSyncStateTable = pgTable(
  "notion_sync_state",
  {
    id: serial("id").primaryKey(),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessmentsTable.id),
    notionPageId: text("notion_page_id").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
    lastSyncStatus: text("last_sync_status").notNull(), // "success" | "failed"
    lastError: text("last_error"),
  },
  (table) => [uniqueIndex("notion_sync_state_assessment_uq").on(table.assessmentId)],
);

export const insertNotionSyncStateSchema = createInsertSchema(notionSyncStateTable).omit({ id: true });
export type InsertNotionSyncState = z.infer<typeof insertNotionSyncStateSchema>;
export type NotionSyncState = typeof notionSyncStateTable.$inferSelect;
