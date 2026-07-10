import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const firmsTable = pgTable("firms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  // Email of the admin who created this firm via /admin (captured from the
  // authenticated session at creation time). Null for firms created before
  // this column existed, or created outside an authenticated session (e.g.
  // scripts/migrations). Used to notify the creator when a build job
  // finishes scoring the firm's portfolio companies.
  createdByEmail: text("created_by_email"),
  // Portal display metadata (statusLabel, internalOnly). Shape is FirmMeta
  // in @workspace/portfolio-engine.
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFirmSchema = createInsertSchema(firmsTable).omit({ id: true, createdAt: true });
export type InsertFirm = z.infer<typeof insertFirmSchema>;
export type Firm = typeof firmsTable.$inferSelect;
