import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// target_id is polymorphic (may reference a firm or a company depending on
// `type`), so it is a plain text column with no foreign key constraint.
export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  targetId: text("target_id").notNull(),
  status: text("status").notNull().default("queued"),
  progressPct: integer("progress_pct").notNull().default(0),
  etaSeconds: integer("eta_seconds"),
  // Set when status is "failed" so the caller has a human-readable reason.
  // Always cleared (null) when a job is queued/running/completed successfully.
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
