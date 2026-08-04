// ---------------------------------------------------------------------------
// TEMPORARY startup repair for STG tenant company id 64 ("Trellix") in
// PRODUCTION. Remove after the repair is verified live (one-shot, tracked in
// BUILD-LOG). Follows the same boot-backfill pattern as
// removePamlicoCapitalDuplicate.ts — the agent has no direct prod write
// channel, so an idempotent startup routine + Publish is the supported path
// (replit.md convention #3).
//
// Background: "Add company" on the live admin dashboard inserted a bare
// name/website/slug row for Trellix (company 64, STG). STG is a hand-authored
// legacy tenant whose bootstrap validation requires meta + >=1 assessment on
// EVERY company row — the bare row would fail the whole tenant bootstrap on
// the next cache reload. This routine writes the exact meta object and single
// assessment that were created and screenshot-verified in dev (company 208).
//
// Safety gates — ALL must hold or the routine no-ops with a log:
//   - company id 64 exists, slug "trellix", name "Trellix", status "active"
//   - it belongs to the firm with slug "stg"
//   - meta is only written when meta IS NULL (never overwrites)
//   - the assessment is only inserted when the company has ZERO assessments
// In dev, company id 64 is a different company in a different firm, so the
// guards no-op there. On every prod boot after the first, both writes are
// already present, so it no-ops as well (idempotent). No other company or
// firm is ever read for write or touched.
// ---------------------------------------------------------------------------
import { count, eq } from "drizzle-orm";
import { db, firmsTable, companiesTable, assessmentsTable } from "@workspace/db";
import { invalidatePortfolioCache } from "./portfolioData.js";
import { logger } from "./logger.js";

const TARGET_COMPANY_ID = 64;

const TRELLIX_META = {
  "hq": "San Jose, CA",
  "sector": "Cybersecurity (XDR) SaaS",
  "summary": "Trellix operates a customer success motion built around distinct organizational roles — Customer Success Managers, Enterprise Account Managers, and a dedicated Renewals function — supported by a formal tiered customer success program with structured onboarding and adoption offerings. Recent hiring signals describe AI-powered health and engagement monitoring, quarterly business reviews with strategic accounts, and structured multi-year account planning tied to expansion objectives — indicating a comparatively mature approach to health visibility and renewal/expansion motion.\n\nThe clearest opportunity for value creation sits in CS organizational stability and onboarding capacity: public signals point to a recent restructuring of the CS function, and hiring/review signals suggest onboarding capacity hasn't fully kept pace with account growth. Addressing CS leadership continuity and right-sizing onboarding capacity would convert an already above-average external signal profile into a fully mature CS motion.",
  "gapNotes": {
    "org": "Public signals point to a recent restructuring of the customer success function. Structural change is a common precursor to inconsistent account coverage at scale — establish continuity in the CS organization before scaling further.",
    "leadership": "Augment — structural building blocks exist (distinct CSM/AM/Renewals functions, an established CS program) but signals point to recent organizational change; an experienced operator alongside current leadership would help stabilize and scale the function.",
    "onboarding": "Public signals point to a recent restructuring of the customer success function and to onboarding capacity that hasn't fully kept pace with account growth. Structural change and under-resourced onboarding are common precursors to slower time-to-value and inconsistent account coverage at scale — right-size onboarding capacity relative to account volume before scaling further."
  },
  "arrDisplay": "Undisclosed",
  "confidence": "Medium",
  "engagement": "A focused CS Org Design and Onboarding capacity assessment to validate structural stability and sizing ahead of further scale.",
  "arrForRollup": null,
  "invesqSignal": "Above-average external signal profile — mature health visibility and renewal/expansion motion; the opportunity is CS organizational stability and onboarding capacity, not customer sentiment.",
  "investmentDate": "2022-01-01",
  "sectorCategory": "Security",
  "portfolioStatus": "Active",
  "employeesDisplay": "Unconfirmed"
} as const;

const TRELLIX_ASSESSMENT = {
  date: "2026-08-04",
  p1: "1", // org — Medium
  p2: "1", // onboarding — Medium
  p3: "2", // health — High
  p4: "NA", // escalation — insufficient signal
  p5: "2", // revenue — High
  p6: "1", // leadership — Medium
  p7: "2", // planning — High
  p8: "2", // ai — High
  orgDesignScore: "Medium",
  onboardingScore: "Medium",
  healthScoringScore: "High",
  renewalExpansionScore: "High",
  portcoScore: "High", // 4-pillar composite 6/8
  rubricVersion: "v6", // matches the stored tag on all existing rows
};

export async function repairStgTrellix(): Promise<void> {
  try {
    const [row] = await db
      .select({
        companyId: companiesTable.id,
        name: companiesTable.name,
        slug: companiesTable.slug,
        status: companiesTable.status,
        meta: companiesTable.meta,
        firmSlug: firmsTable.slug,
      })
      .from(companiesTable)
      .innerJoin(firmsTable, eq(firmsTable.id, companiesTable.firmId))
      .where(eq(companiesTable.id, TARGET_COMPANY_ID))
      .limit(1);

    if (
      !row ||
      row.firmSlug !== "stg" ||
      row.slug !== "trellix" ||
      row.name !== "Trellix" ||
      row.status !== "active"
    ) {
      // Dev (id 64 is a different company) or unexpected prod state: no-op.
      logger.info(
        { found: row ?? null },
        "repairStgTrellix: guards not met, skipping (expected in dev)",
      );
      return;
    }

    const [assessCount] = await db
      .select({ value: count() })
      .from(assessmentsTable)
      .where(eq(assessmentsTable.companyId, TARGET_COMPANY_ID));
    const hasAssessments = (assessCount?.value ?? 0) > 0;
    const hasMeta = row.meta !== null;

    if (hasMeta && hasAssessments) {
      logger.info("repairStgTrellix: already repaired, nothing to do");
      return;
    }

    await db.transaction(async (tx) => {
      if (!hasMeta) {
        await tx
          .update(companiesTable)
          .set({ meta: TRELLIX_META })
          .where(eq(companiesTable.id, TARGET_COMPANY_ID));
      }
      if (!hasAssessments) {
        await tx.insert(assessmentsTable).values({
          companyId: TARGET_COMPANY_ID,
          ...TRELLIX_ASSESSMENT,
        });
      }
    });

    invalidatePortfolioCache();
    logger.info(
      { wroteMeta: !hasMeta, wroteAssessment: !hasAssessments },
      "repairStgTrellix: STG Trellix (company 64) repaired and cache invalidated",
    );
  } catch (err) {
    logger.error({ err }, "repairStgTrellix: repair failed (left untouched)");
  }
}
