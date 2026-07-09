import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const firmsTable = pgTable("firms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  // Portal display metadata (statusLabel, internalOnly). Shape is FirmMeta
  // in @workspace/portfolio-engine.
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFirmSchema = createInsertSchema(firmsTable).omit({ id: true, createdAt: true });
export type InsertFirm = z.infer<typeof insertFirmSchema>;
export type Firm = typeof firmsTable.$inferSelect;
