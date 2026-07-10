import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// "strict" | "best_effort". See ARCHITECTURE-UNIFIED-DB.md Section 3.2 /
// Open Question 1 (resolved 2026-07-10): a bad/inconsistent row for a
// "strict" firm should fail loudly (e.g. reject the whole bootstrap) instead
// of silently degrading, because that firm's data has been through the
// parity/consistency gate; "best_effort" firms (every newly onboarded firm,
// by default) degrade gracefully instead. Promotion from best_effort to
// strict is ALWAYS an explicit admin action — it is never flipped
// automatically, even after a firm passes every automated check, because
// passing the gate proves data *consistency*, not organizational readiness
// for that stricter failure mode. This column is additive-only in this
// phase: no code path reads it yet (Phase 3 wires it in and seeds the 5
// legacy tenants to "strict", replacing the current hardcoded LEGACY_SLUGS
// check) and no existing firm's value is changed here.
export type DataAuthority = "strict" | "best_effort";

export const firmsTable = pgTable("firms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  dataAuthority: text("data_authority").notNull().default("best_effort").$type<DataAuthority>(),
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
