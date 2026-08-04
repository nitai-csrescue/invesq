import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

// ---------------------------------------------------------------------------
// Engagement Entry Step 2 — Portco/PE confirmation requests (2026-08-04).
//
// A confirmation request is a single-purpose, expiring, unguessable link sent
// to a portco CS lead or PE operating partner asking them to confirm or
// correct the pillars our Stage 1/2 scoring flagged as Insufficient Data /
// low-confidence. It is deliberately NOT a portal login:
//   - the raw token is returned exactly once at creation (to the admin, for
//     sending); only its SHA-256 hash is stored (same pattern as
//     tenant_login_tokens in lib/tenantAuth.ts);
//   - the public page resolves one company only — no firm or company
//     enumeration is possible from a token;
//   - requests are single-submission: status pending -> submitted.
//
// Confirmation Status itself is the EXISTING companies.tier3_status column
// (unconfirmed | portco_confirmed | pe_confirmed — CQ-12 locked vocabulary).
// Do NOT add a parallel status field. Every tier3_status mutation (including
// the public confirm flow) must write a tier_audit_log row in the same
// transaction, per that column's contract.
//
// Confirmed/corrected pillar values write through to the Calibration Ledger
// as calibration_observations rows (source portco_confirmation /
// pe_confirmation) — they are the "actual" against the locked "predicted".
// ---------------------------------------------------------------------------
export const confirmationRequestsTable = pgTable(
  "confirmation_requests",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // SHA-256 hex of the link token. The raw token is never stored.
    tokenHash: text("token_hash").notNull().unique(),
    // Who the ask is addressed to; also decides which tier3_status value a
    // submission sets (portco_confirmed vs pe_confirmed).
    recipientRole: text("recipient_role").notNull(),
    // Snapshot of the auto-flagged pillars at creation time:
    // [{ pillarId, label, predicted, reason }] — so the ask page shows
    // exactly what was flagged even if the company is re-scored later.
    flaggedPillars: jsonb("flagged_pillars").notNull(),
    // pending | submitted | revoked
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    // The raw responses as submitted: [{ pillarId, response, correctedScore, note }]
    response: jsonb("response"),
  },
  (table) => [index("confirmation_requests_company_idx").on(table.companyId)],
);

export const CONFIRMATION_RECIPIENT_ROLES = ["portco_cs_lead", "pe_operating_partner"] as const;
export type ConfirmationRecipientRole = (typeof CONFIRMATION_RECIPIENT_ROLES)[number];

export type ConfirmationRequest = typeof confirmationRequestsTable.$inferSelect;
