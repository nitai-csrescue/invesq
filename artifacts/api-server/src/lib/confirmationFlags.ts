// ---------------------------------------------------------------------------
// Engagement Entry Step 2 — auto-flagging of pillars that need external
// confirmation.
//
// After Stage 2 scoring completes, any pillar scored "Insufficient Data"
// (stored as NA in p1-p8, which also drives the company's Low/Medium/High
// confidence in buildCompanyMeta) is flagged for confirmation. Flags are
// DERIVED live from the latest scored assessment — never stored on the
// company — so a re-score automatically re-flags; each confirmation request
// additionally snapshots the flags at creation time so an already-sent link
// keeps showing exactly what was asked.
// ---------------------------------------------------------------------------
import { desc, eq } from "drizzle-orm";
import { db, assessmentsTable } from "@workspace/db";
import { PILLAR_IDS } from "@workspace/portfolio-engine";

export const PILLAR_LABELS: Record<string, string> = {
  org: "CS Org Design & Coverage",
  onboarding: "Customer Onboarding Motion",
  health: "Customer Health Visibility",
  escalation: "Escalation & Risk Process",
  revenue: "Renewal & Expansion Motion",
  leadership: "CS Leadership Structure",
  planning: "Account Planning Discipline",
  ai: "AI & Automation Leverage",
};

export interface FlaggedPillar {
  pillarId: string;
  label: string;
  predicted: string | null;
  reason: string; // "insufficient_data" | "low_confidence"
}

// Compute the auto-flagged pillars from the company's latest scored
// assessment. Returns null when the company has no scored assessment yet.
export async function computeFlaggedPillars(companyId: number): Promise<FlaggedPillar[] | null> {
  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.companyId, companyId))
    .orderBy(desc(assessmentsTable.date), desc(assessmentsTable.id))
    .limit(1);
  if (!assessment || assessment.p1 === null) return null;

  const cols = [
    assessment.p1, assessment.p2, assessment.p3, assessment.p4,
    assessment.p5, assessment.p6, assessment.p7, assessment.p8,
  ];
  const flagged: FlaggedPillar[] = [];
  PILLAR_IDS.forEach((pillarId, i) => {
    const score = cols[i];
    // "NA" is how "Insufficient Data" is stored in p1-p8; these are exactly
    // the pillars that drag confidence to Medium/Low in buildCompanyMeta.
    if (score === "NA" || score === null) {
      flagged.push({
        pillarId,
        label: PILLAR_LABELS[pillarId] ?? pillarId,
        predicted: score,
        reason: "insufficient_data",
      });
    }
  });
  return flagged;
}
