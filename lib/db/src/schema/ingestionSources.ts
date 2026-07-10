import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { firmsTable } from "./firms";

// Phase 2 ingestion placeholder (ARCHITECTURE-UNIFIED-DB.md Section 3.2 /
// Open Question 6, resolved 2026-07-10): real system connectors (CRM,
// support desk, product analytics, ...) instead of Claude web-search. Per
// OQ6, connector CREDENTIALS live ONLY in Replit-managed secrets/
// integrations — never in this table. `config` is strictly non-secret
// connector configuration (endpoint URL, sync cadence, field mappings, the
// name of the Replit secret/integration slot to read credentials from —
// never a credential value itself). No connector is built in this phase;
// this table has zero callers today.
export const ingestionSourcesTable = pgTable(
  "ingestion_sources",
  {
    id: serial("id").primaryKey(),
    firmId: integer("firm_id")
      .notNull()
      .references(() => firmsTable.id),
    kind: text("kind").notNull(), // "crm" | "support_desk" | "product_analytics" | ...
    // Connector-specific, NON-SECRET config only (endpoint, cadence, field
    // mappings). Secrets/credentials must never be stored here — see OQ6
    // resolution above.
    config: jsonb("config"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ingestion_sources_firm_id_idx").on(table.firmId)],
);

export const insertIngestionSourceSchema = createInsertSchema(ingestionSourcesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertIngestionSource = z.infer<typeof insertIngestionSourceSchema>;
export type IngestionSource = typeof ingestionSourcesTable.$inferSelect;
