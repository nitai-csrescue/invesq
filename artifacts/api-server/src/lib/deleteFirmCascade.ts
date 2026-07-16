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
} from "@workspace/db";

export interface DeleteFirmCascadeResult {
  removedCompanies: number;
  removedAssessments: number;
}

export async function deleteFirmCascade(firmId: number): Promise<DeleteFirmCascadeResult> {
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
  // id depending on job type; remove both forms.
  const jobTargetIds = [String(firmId), ...companyIds.map(String)];

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
    if (assessmentIds.length > 0) {
      await tx.delete(signalsTable).where(inArray(signalsTable.assessmentId, assessmentIds));
      await tx.delete(findingsTable).where(inArray(findingsTable.assessmentId, assessmentIds));
      await tx.delete(assessmentsTable).where(inArray(assessmentsTable.id, assessmentIds));
    }
    if (companyIds.length > 0) {
      await tx.delete(companiesTable).where(inArray(companiesTable.id, companyIds));
    }
    await tx.delete(jobsTable).where(inArray(jobsTable.targetId, jobTargetIds));
    await tx
      .delete(ingestionSourcesTable)
      .where(eq(ingestionSourcesTable.firmId, firmId));
    await tx.delete(firmsTable).where(eq(firmsTable.id, firmId));
  });

  return {
    removedCompanies: companyIds.length,
    removedAssessments: assessmentIds.length,
  };
}
