import { date, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

// ---------------------------------------------------------------------------
// Data Moat action #3 — Outcome Data: structured interventions log.
//
// One row per intervention taken at a company, tagged to a 4-pillar rubric
// pillar. INTERNAL-ONLY, same policy as companies.outcome_metrics: written
// and read exclusively through Admin-Lens-gated routes
// (routes/adminOutcomes.ts); never joined into any tenant-facing payload,
// client report, or exported PDF. Purely additive — nothing here touches
// p1-p8 columns, composite math, or tier derivation.
// ---------------------------------------------------------------------------
export const outcomeInterventionsTable = pgTable(
  "outcome_interventions",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // 4-pillar rubric vocabulary (OUTCOME_PILLARS below).
    pillar: text("pillar").notNull(),
    // What was done (free text, required).
    action: text("action").notNull(),
    // Calendar day the intervention happened, stored as YYYY-MM-DD.
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    // Who owns/drove it (free text — name or role).
    owner: text("owner").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Admin (email) who entered the row — from the Admin Lens session,
    // never client-supplied.
    createdBy: text("created_by").notNull(),
  },
  (table) => [index("outcome_interventions_company_id_idx").on(table.companyId)],
);

// Pillar vocabulary for interventions — the 4-pillar rubric v2 names.
export const OUTCOME_PILLARS = ["org_design", "onboarding", "health_scoring", "renewal_expansion"] as const;
export type OutcomePillar = (typeof OUTCOME_PILLARS)[number];

// Shape of companies.outcome_metrics. All percentages (e.g. 92.5), all
// optional/nullable — null/missing = not yet measured.
export interface OutcomeMetrics {
  grrEntry?: number | null;
  nrrEntry?: number | null;
  grr90d?: number | null;
  nrr90d?: number | null;
  grr180d?: number | null;
  nrr180d?: number | null;
  grrAnnual?: number | null;
  nrrAnnual?: number | null;
}
export const OUTCOME_METRIC_KEYS = [
  "grrEntry",
  "nrrEntry",
  "grr90d",
  "nrr90d",
  "grr180d",
  "nrr180d",
  "grrAnnual",
  "nrrAnnual",
] as const;
export type OutcomeMetricKey = (typeof OUTCOME_METRIC_KEYS)[number];

export const insertOutcomeInterventionSchema = createInsertSchema(outcomeInterventionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOutcomeIntervention = z.infer<typeof insertOutcomeInterventionSchema>;
export type OutcomeIntervention = typeof outcomeInterventionsTable.$inferSelect;
