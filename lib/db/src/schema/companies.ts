import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { firmsTable } from "./firms";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  firmId: integer("firm_id")
    .notNull()
    .references(() => firmsTable.id),
  name: text("name").notNull(),
  website: text("website"),
  status: text("status").notNull().default("active"),
  // URL identifier used by the portfolio portals (RawCompany.id in the
  // portfolio engine, e.g. "renaissance-systems").
  slug: text("slug"),
  // Rich descriptive fields consumed by the portfolio engine (sector, hq,
  // ARR display/rollup, summaries, gap notes, actions log, ...). Shape is
  // CompanyMeta in @workspace/portfolio-engine.
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
