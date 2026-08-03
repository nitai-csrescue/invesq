import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// ADMIN-ONLY real-name → placeholder mapping for BackEngine imports.
//
// This is the ONLY table in the system permitted to hold a real BackEngine
// account/contact name. It is reachable exclusively through Admin-Lens-gated
// /api/admin routes — never through any tenant-facing route, export, or PDF.
//
// Placeholder assignment is deterministic and stable across re-imports:
// keyed by sha256(normalized real name) — NOT row order — so re-running an
// import can never reassign a different placeholder to the same account.
// New names within one import batch are ordered by hash before numbering, so
// even first-time assignment is row-order-independent.
// ---------------------------------------------------------------------------
export const backengineNameMapTable = pgTable(
  "backengine_name_map",
  {
    id: serial("id").primaryKey(),
    // sha256 hex of the normalized (lowercased, whitespace-collapsed) name.
    nameHash: text("name_hash").notNull(),
    realName: text("real_name").notNull(),
    placeholder: text("placeholder").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("backengine_name_map_hash_uq").on(table.nameHash),
    uniqueIndex("backengine_name_map_placeholder_uq").on(table.placeholder),
  ],
);

export type BackengineNameMapRow = typeof backengineNameMapTable.$inferSelect;
