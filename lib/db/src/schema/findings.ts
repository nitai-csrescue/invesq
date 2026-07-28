import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentsTable } from "./assessments";

// One row per (assessment, pillar) — makes evidence/gaps queryable across
// firms without deserializing jsonb (ARCHITECTURE-UNIFIED-DB.md Section 3.1
// principle #4, Section 3.2). This is additive alongside assessments.p1..p8
// (which stay as the denormalized fast-path for the existing bootstrap/engine
// read pattern) — findings is not a breaking replacement in this phase.
export const findingsTable = pgTable(
  "findings",
  {
    id: serial("id").primaryKey(),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessmentsTable.id),
    // Canonical rubric version (RUBRIC_VERSION in @workspace/portfolio-engine)
    // in effect when this finding was written. Additive + nullable: legacy
    // rows are backfilled from their parent assessment's rubric_version by
    // the boot backfill; all new writes must stamp it explicitly.
    rubricVersion: text("rubric_version"),
    // Matches PILLARS[].id in @workspace/portfolio-engine, e.g. "org",
    // "onboarding", "health", "escalation", "revenue", "leadership",
    // "planning", "ai".
    pillarId: text("pillar_id").notNull(),
    // "0" | "1" | "2" | "NA" — same text convention as assessments.p1..p8.
    score: text("score").notNull(),
    evidence: text("evidence"),
    // "claude_web_search" (today's only pipeline) | "assessment_backfill"
    // (rows fanned out from pre-existing assessments.p1..p8 by the Phase 2
    // backfill script, not from a live Claude call) | Phase 2 connector
    // kinds ("crm_sync", "support_ticket_export", etc.) once ingestion
    // sources exist.
    source: text("source").notNull().default("claude_web_search"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("findings_assessment_pillar_uq").on(table.assessmentId, table.pillarId),
    index("findings_pillar_id_idx").on(table.pillarId),
  ],
);

export const insertFindingSchema = createInsertSchema(findingsTable).omit({ id: true, createdAt: true });
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findingsTable.$inferSelect;
