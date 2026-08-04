// ---------------------------------------------------------------------------
// Shared, FK-safe cascade deletion of a firm and every row that hangs off it.
//
// Used by BOTH the admin DELETE /api/admin/firms/:id route and the one-off
// pamlico-capital startup removal, so the deletion order can never diverge
// between the two. Order (children first):
//   report_validations (via revision ids) -> drive_shipments ->
//   report_revisions -> notion_sync_state (via assessment ids) ->
//   report_exports -> signals -> findings -> assessments -> companies ->
//   jobs (polymorphic text target_id: firm id + company ids) ->
//   ingestion_sources -> firm.
//
// Runs in a single transaction; either everything is removed or nothing is.
// Callers are responsible for their own guards (legacy-tenant checks, active
// job checks, safety gates) and for invalidating the portfolio bootstrap
// cache afterwards when the firm could be tenant-visible.
// ---------------------------------------------------------------------------
import { eq, inArray } from "drizzle-orm";
import {
  db,
  firmsTable,
  companiesTable,
  assessmentsTable,
  findingsTable,
  reportExportsTable,
  reportRevisionsTable,
  reportValidationsTable,
  driveShipmentsTable,
  notionSyncStateTable,
  ingestionSourcesTable,
  jobsTable,
  signalsTable,
  tierAuditLogTable,
  tierDisputesTable,
  backengineAccountsTable,
  outcomeInterventionsTable,
  calibrationPredictionsTable,
  calibrationObservationsTable,
  confirmationRequestsTable,
} from "@workspace/db";

export interface DeleteFirmCascadeResult {
  removedCompanies: number;
  removedAssessments: number;
}

/**
 * Delete ALL companies of a firm plus every row hanging off them, but keep
 * the firm row (and its ingestion_sources / firm-targeted jobs) intact.
 * Shares the exact child-deletion order with deleteFirmCascade below so the
 * two can never diverge. Used by the STG de-legacize migration.
 */
export async function deleteFirmCompaniesCascade(
  firmId: number,
  opts?: { stampFirmMeta?: Record<string, unknown> },
): Promise<DeleteFirmCascadeResult> {
  return runCascade(firmId, { deleteFirmRow: false, stampFirmMeta: opts?.stampFirmMeta });
}

export async function deleteFirmCascade(firmId: number): Promise<DeleteFirmCascadeResult> {
  return runCascade(firmId, { deleteFirmRow: true });
}

async function runCascade(
  firmId: number,
  opts: {
    deleteFirmRow: boolean;
    // Optional replacement firms.meta written INSIDE the same transaction as
    // the deletes (keep-firm mode only). Lets one-shot migrations make their
    // durable completion marker atomic with the destructive wipe, so a crash
    // between "wiped" and "marked done" can never leave an unmarked firm that
    // would be re-wiped on the next boot.
    stampFirmMeta?: Record<string, unknown>;
  },
): Promise<DeleteFirmCascadeResult> {
  const companies = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.firmId, firmId));
  const companyIds = companies.map((c) => c.id);

  const assessmentIds =
    companyIds.length > 0
      ? (
          await db
            .select({ id: assessmentsTable.id })
            .from(assessmentsTable)
            .where(inArray(assessmentsTable.companyId, companyIds))
        ).map((a) => a.id)
      : [];

  const revisionIds =
    companyIds.length > 0
      ? (
          await db
            .select({ id: reportRevisionsTable.id })
            .from(reportRevisionsTable)
            .where(inArray(reportRevisionsTable.companyId, companyIds))
        ).map((r) => r.id)
      : [];

  // Polymorphic jobs.target_id is text and may hold the firm id or a company
  // id depending on job type; remove both forms (companies only when the
  // firm row itself is kept).
  const jobTargetIds = opts.deleteFirmRow
    ? [String(firmId), ...companyIds.map(String)]
    : companyIds.map(String);

  await db.transaction(async (tx) => {
    if (revisionIds.length > 0) {
      await tx
        .delete(reportValidationsTable)
        .where(inArray(reportValidationsTable.revisionId, revisionIds));
    }
    if (companyIds.length > 0) {
      await tx
        .delete(driveShipmentsTable)
        .where(inArray(driveShipmentsTable.companyId, companyIds));
      await tx
        .delete(reportRevisionsTable)
        .where(inArray(reportRevisionsTable.companyId, companyIds));
    }
    if (assessmentIds.length > 0) {
      await tx
        .delete(notionSyncStateTable)
        .where(inArray(notionSyncStateTable.assessmentId, assessmentIds));
    }
    if (companyIds.length > 0) {
      await tx
        .delete(reportExportsTable)
        .where(inArray(reportExportsTable.companyId, companyIds));
    }
    if (companyIds.length > 0) {
      // Calibration Ledger: predictions FK BOTH companies and assessments,
      // so they must be deleted before the assessments delete just below.
      await tx
        .delete(calibrationPredictionsTable)
        .where(inArray(calibrationPredictionsTable.companyId, companyIds));
      await tx
        .delete(calibrationObservationsTable)
        .where(inArray(calibrationObservationsTable.companyId, companyIds));
      // Confirmation-ask links FK companies; delete before companies below.
      await tx
        .delete(confirmationRequestsTable)
        .where(inArray(confirmationRequestsTable.companyId, companyIds));
    }
    if (assessmentIds.length > 0) {
      await tx.delete(signalsTable).where(inArray(signalsTable.assessmentId, assessmentIds));
      await tx.delete(findingsTable).where(inArray(findingsTable.assessmentId, assessmentIds));
      await tx.delete(assessmentsTable).where(inArray(assessmentsTable.id, assessmentIds));
    }
    if (companyIds.length > 0) {
      // Dogfood BackEngine children (anonymized rows only; the admin-only
      // name map is firm-independent and intentionally NOT cascaded here).
      await tx
        .delete(backengineAccountsTable)
        .where(inArray(backengineAccountsTable.companyId, companyIds));
      // Data Moat action #3: outcome interventions log (FK -> companies).
      await tx
        .delete(outcomeInterventionsTable)
        .where(inArray(outcomeInterventionsTable.companyId, companyIds));
      // CQ-37 tier-model children: audit log first (it FKs tier_disputes),
      // then disputes, then the companies rows they reference.
      await tx
        .delete(tierAuditLogTable)
        .where(inArray(tierAuditLogTable.companyId, companyIds));
      await tx
        .delete(tierDisputesTable)
        .where(inArray(tierDisputesTable.companyId, companyIds));
      await tx.delete(companiesTable).where(inArray(companiesTable.id, companyIds));
    }
    if (jobTargetIds.length > 0) {
      await tx.delete(jobsTable).where(inArray(jobsTable.targetId, jobTargetIds));
    }
    if (opts.deleteFirmRow) {
      await tx
        .delete(ingestionSourcesTable)
        .where(eq(ingestionSourcesTable.firmId, firmId));
      await tx.delete(firmsTable).where(eq(firmsTable.id, firmId));
    } else if (opts.stampFirmMeta !== undefined) {
      await tx
        .update(firmsTable)
        .set({ meta: opts.stampFirmMeta })
        .where(eq(firmsTable.id, firmId));
    }
  });

  return {
    removedCompanies: companyIds.length,
    removedAssessments: assessmentIds.length,
  };
}
