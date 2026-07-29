import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { firmsTable } from "./firms";

// One-time magic-link login tokens for the tenant portal (STG-only rollout).
// Only the SHA-256 hash of the token is stored — a DB leak cannot be replayed
// as a login link. Rows are single-use (used_at) and short-lived (expires_at).
// The session itself is NOT stored here: after verification the server issues
// a stateless HMAC-signed httpOnly cookie (see api-server lib/tenantAuth.ts).
export const tenantLoginTokensTable = pgTable("tenant_login_tokens", {
  id: serial("id").primaryKey(),
  firmId: integer("firm_id")
    .notNull()
    .references(() => firmsTable.id),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantLoginToken = typeof tenantLoginTokensTable.$inferSelect;
