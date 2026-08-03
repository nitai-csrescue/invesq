import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

// ---------------------------------------------------------------------------
// CS Rescue Internal dogfood — anonymized BackEngine Accounts-tab rows.
//
// HARD INVARIANT: this table is tenant-visible (it renders on the
// cs-rescue-internal company detail page), so it must NEVER contain a real
// account/company name. Only the deterministic placeholder ("Prospect N")
// assigned via backengine_name_map is stored here. The real-name → placeholder
// mapping lives exclusively in backengine_name_map, which is Admin-Lens-only.
//
// Engagement metric columns are nullable on purpose: BackEngine exports with
// unpopulated quantitative history are a valid real-world shape, not
// malformed data.
// ---------------------------------------------------------------------------
export const backengineAccountsTable = pgTable(
  "backengine_accounts",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // "Prospect N" — never a real name (enforced at import time).
    placeholder: text("placeholder").notNull(),
    quarterlySentiment: text("quarterly_sentiment"),
    monthlySentiment: text("monthly_sentiment"),
    emailsReceived: integer("emails_received"),
    emailsSent: integer("emails_sent"),
    meetings: integer("meetings"),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("backengine_accounts_company_placeholder_uq").on(table.companyId, table.placeholder),
    index("backengine_accounts_company_id_idx").on(table.companyId),
  ],
);

export type BackengineAccount = typeof backengineAccountsTable.$inferSelect;
