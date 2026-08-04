import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { assessmentsTable } from "./assessments";

// ---- Data Moat: Calibration Ledger (2026-08-04). INTERNAL-ONLY. ----
// Predicted vs Observed vs Delta for the Stage 1 diagnostic predictions.
// Purely additive: nothing here participates in composite/tier math or any
// tenant-facing payload. Admin-Lens routes (routes/adminCalibration.ts) are
// the ONLY writers/readers. Deltas are COMPUTED (Observed minus Predicted)
// at read time, never stored, so they can't go stale.

// One locked Stage 1 prediction snapshot per company. Immutability contract:
// rows are created already-locked by the admin route, and the route layer
// rejects every mutation of a locked row (there is deliberately no UPDATE
// path in the API). If you are adding an UPDATE path, you are breaking the
// Calibration Ledger's core guarantee - don't.
export const calibrationPredictionsTable = pgTable(
  "calibration_predictions",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // Which assessment row the snapshot was derived from (provenance).
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessmentsTable.id),
    // Frozen per-pillar scores keyed by PILLAR_IDS from
    // @workspace/portfolio-engine (org, onboarding, health, escalation,
    // revenue, leadership, planning, ai). Values are the assessment's text
    // scores ("0" | "1" | "2" | "NA") exactly as scored at snapshot time.
    pillars: jsonb("pillars").notNull(),
    // Phase 1 tier composite (0-16, NA substituted as 1 - same rule as the
    // rest of the app) frozen at snapshot time.
    composite: integer("composite").notNull(),
    // Tier band label frozen at snapshot time (TIERS[].label).
    band: text("band").notNull(),
    // Rubric version in force when the prediction was made.
    rubricVersion: text("rubric_version").notNull(),
    // When the underlying prediction was made (the assessment date).
    predictedAt: timestamp("predicted_at", { withTimezone: true }).notNull(),
    // When the snapshot was locked. Set at creation; never changes.
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Exactly one locked prediction snapshot per company.
    uniqueIndex("calibration_predictions_company_uq").on(table.companyId),
  ],
);

// Observed reality, recorded whenever real signal arrives from any source.
// Multiple rows per company are expected (signal trickles in over time).
export const calibrationObservationsTable = pgTable(
  "calibration_observations",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    // Partial per-pillar observed scores, same key/value vocabulary as
    // calibration_predictions.pillars. Only pillars with real observed
    // signal are present; absent keys mean "not yet observed".
    pillars: jsonb("pillars").notNull(),
    // When the real-world signal was observed (its own timestamp,
    // independent of when the row was entered).
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    // Where the observed signal came from (free text: "portco_interview",
    // "backengine_telemetry", "manual_backfill", ...).
    source: text("source").notNull(),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("calibration_observations_company_idx").on(table.companyId)],
);

// Weekly Slack digest ledger: one row per ISO week actually POSTED to Slack.
// Existence of a row is what makes the hourly scheduler skip re-posting; a
// missing SLACK_WEBHOOK_URL therefore never writes a row, so the first week
// after configuration still gets its digest.
export const calibrationDigestsTable = pgTable("calibration_digests", {
  id: serial("id").primaryKey(),
  // ISO week key, e.g. "2026-W32".
  weekKey: text("week_key").notNull().unique(),
  eventCount: integer("event_count").notNull(),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
});

// Resolution-event vocabulary for signals.event_type (the Resolution Events
// deliverable lives in the existing signals table, NOT a new one).
export const RESOLUTION_EVENT_TYPES = [
  "leadership_departure",
  "cs_layoffs",
  "rating_drop",
  "funding_cs_rebuild",
  "acquisition_distress",
] as const;
export type ResolutionEventType = (typeof RESOLUTION_EVENT_TYPES)[number];
export const CALIBRATION_VERDICTS = ["confirms", "contradicts"] as const;
export type CalibrationVerdict = (typeof CALIBRATION_VERDICTS)[number];

export const insertCalibrationPredictionSchema = createInsertSchema(
  calibrationPredictionsTable,
).omit({ id: true, createdAt: true, lockedAt: true });
export type InsertCalibrationPrediction = z.infer<typeof insertCalibrationPredictionSchema>;
export type CalibrationPrediction = typeof calibrationPredictionsTable.$inferSelect;

export const insertCalibrationObservationSchema = createInsertSchema(
  calibrationObservationsTable,
).omit({ id: true, createdAt: true });
export type InsertCalibrationObservation = z.infer<typeof insertCalibrationObservationSchema>;
export type CalibrationObservation = typeof calibrationObservationsTable.$inferSelect;
