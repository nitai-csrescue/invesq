// ---------------------------------------------------------------------------
// TEMPORARY startup seed: log Malgosia's feedback as Manual-source pillar
// evidence on the STG tenant's Trellix record. Remove after verified in prod.
//
// Scope: firm slug "stg", company "Trellix", latest assessment ONLY. Never
// touches any other company, firm, score, band, or composite — this is
// additive evidence text plus a per-company Sources Reviewed extension.
//
// What it does, once per environment (naturally idempotent — every step
// checks whether its content is already present before writing):
//   1. Appends a "[Source: Manual]"-tagged evidence entry to p3_evidence
//      (Health Scoring, the rubric-v2 primary column for that pillar).
//   2. Appends a "[Source: Manual]"-tagged evidence entry to p5_evidence
//      (Revenue Motion, the rubric-v2 primary column for Renewal & Expansion).
//   3. Merges companies.meta.additionalSourcesReviewed (rendered as extra
//      rows on the PDF Page 7 Sources list for this company only).
//
// The model stores pillar evidence as plain text columns (no per-entry source
// field), so the Manual tag is carried inline as a "[Source: Manual]" prefix —
// visible verbatim in the admin Edit Pillar Evidence modal and the report.
// The evidence text mirrors savePillarEvidence semantics (trim; the copy
// contains no em-dashes or named individuals by construction). findings rows
// are not touched: pipeline-built STG assessments have none to mirror into.
// ---------------------------------------------------------------------------
import { and, desc, eq } from "drizzle-orm";
import { db, firmsTable, companiesTable, assessmentsTable } from "@workspace/db";
import { invalidatePortfolioCache } from "./portfolioData.js";
import { logger } from "./logger.js";

const MANUAL_TAG = "[Source: Manual]";

const HEALTH_SCORING_MANUAL_EVIDENCE =
  "A comprehensive health-scoring methodology should extend beyond product-usage and support-ticket signal to include external context that can move renewal risk independent of the customer's engagement with the product -- shifts in the buyer's budget cycle, procurement ownership, or the regulatory/compliance driver that originally justified the purchase. For a security platform, the most relevant version of this is monitoring whether a customer's compliance mandate, cyber-insurance requirement, or security budget allocation changes, since these can drive deprioritization even when in-product engagement looks healthy. This should be layered onto the existing Gainsight/Totango-based tooling once internal health data is available to validate.";

const RENEWAL_EXPANSION_MANUAL_EVIDENCE =
  "Structural readiness on this pillar (distinct CSM/AM/Growth Manager mandates) should be paired with a data-integrity check before any renewal or retention/expansion metric is trusted at the board level: confirming that up-for-renewal cadence reporting reconciles cleanly against source CRM and bookings data. Common failure points worth validating internally include duplicate or split opportunities, contract start/end dates that drift from the original term, unresolved co-terming exceptions, and credit/rebill adjustments that were never reflected back into the CRM. These are typical causes of retention and expansion metrics that don't tie out between what CS reports and what Finance recognizes.";

const REVIEW_SITE_NOTE =
  "Reviewed for review volume, rating trend, and reviewer-reported onboarding/support sentiment.";

const ADDITIONAL_SOURCES = [
  { label: "G2", note: REVIEW_SITE_NOTE },
  { label: "Capterra", note: REVIEW_SITE_NOTE },
  { label: "Gartner Peer Insights", note: REVIEW_SITE_NOTE },
  { label: "TrustRadius", note: REVIEW_SITE_NOTE },
  {
    label: "Partner/Channel Program Pages",
    note: "Reviewed for partner-reported enablement, co-sell, and channel health signals.",
  },
];

function appendEntry(existing: string | null, text: string): string {
  const entry = `${MANUAL_TAG} ${text}`;
  return existing && existing.trim() !== "" ? `${existing.trim()}\n\n${entry}` : entry;
}

export async function seedTrellixManualEvidence(): Promise<void> {
  try {
    const [firm] = await db
      .select({ id: firmsTable.id })
      .from(firmsTable)
      .where(eq(firmsTable.slug, "stg"))
      .limit(1);
    if (!firm) return;

    const [company] = await db
      .select({ id: companiesTable.id, meta: companiesTable.meta })
      .from(companiesTable)
      .where(and(eq(companiesTable.firmId, firm.id), eq(companiesTable.name, "Trellix")))
      .limit(1);
    if (!company) {
      logger.warn("seedTrellixManualEvidence: STG Trellix company not found; skipping");
      return;
    }

    const [assessment] = await db
      .select({
        id: assessmentsTable.id,
        p3Evidence: assessmentsTable.p3Evidence,
        p5Evidence: assessmentsTable.p5Evidence,
      })
      .from(assessmentsTable)
      .where(eq(assessmentsTable.companyId, company.id))
      .orderBy(desc(assessmentsTable.date), desc(assessmentsTable.id))
      .limit(1);
    if (!assessment) {
      logger.warn("seedTrellixManualEvidence: Trellix has no assessment; skipping");
      return;
    }

    let changed = false;

    const evidenceUpdates: Partial<typeof assessmentsTable.$inferInsert> = {};
    if (!assessment.p3Evidence?.includes(HEALTH_SCORING_MANUAL_EVIDENCE)) {
      evidenceUpdates.p3Evidence = appendEntry(
        assessment.p3Evidence,
        HEALTH_SCORING_MANUAL_EVIDENCE,
      );
    }
    if (!assessment.p5Evidence?.includes(RENEWAL_EXPANSION_MANUAL_EVIDENCE)) {
      evidenceUpdates.p5Evidence = appendEntry(
        assessment.p5Evidence,
        RENEWAL_EXPANSION_MANUAL_EVIDENCE,
      );
    }
    if (Object.keys(evidenceUpdates).length > 0) {
      await db
        .update(assessmentsTable)
        .set(evidenceUpdates)
        .where(eq(assessmentsTable.id, assessment.id));
      changed = true;
    }

    const meta = (company.meta ?? {}) as Record<string, unknown>;
    const existingSources = Array.isArray(meta["additionalSourcesReviewed"])
      ? (meta["additionalSourcesReviewed"] as Array<{ label?: unknown }>)
      : [];
    const missing = ADDITIONAL_SOURCES.filter(
      (s) => !existingSources.some((e) => e && e.label === s.label),
    );
    if (missing.length > 0) {
      await db
        .update(companiesTable)
        .set({
          meta: {
            ...meta,
            additionalSourcesReviewed: [...existingSources, ...missing],
          },
        })
        .where(eq(companiesTable.id, company.id));
      changed = true;
    }

    if (changed) {
      invalidatePortfolioCache();
      logger.info(
        { companyId: company.id, assessmentId: assessment.id },
        "seedTrellixManualEvidence: applied Manual evidence + sources extension",
      );
    }
  } catch (err) {
    logger.error({ err }, "seedTrellixManualEvidence failed (left as-is)");
  }
}
