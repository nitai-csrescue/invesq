// ---------------------------------------------------------------------------
// Startup removal of the duplicate "pamlico-capital" firm tenant.
//
// Production carries two Pamlico tenants: the AI-onboarded pipeline firm
// (slug "pamlico-capital", created 2026-07-10) and the canonical legacy
// hand-authored tenant (slug "pamlico"). The user confirmed "pamlico-capital"
// is the outdated duplicate and must be removed; "pamlico" and all of its
// companies stay fully intact. The dev DB never had "pamlico-capital", so
// this routine no-ops there and on every prod boot after the first run.
//
// Safety gate (per explicit user instruction): the deletion runs ONLY if a
// separate "pamlico" firm exists with at least one active company. If that
// invariant does not hold, the routine logs an error and leaves everything
// untouched for human follow-up.
//
// Deletion is a single transaction cascading child tables in FK-safe order
// via the shared deleteFirmCascade helper (same code path as the admin
// DELETE /api/admin/firms/:id route, so the order can never diverge).
// ---------------------------------------------------------------------------
import { and, eq, ne } from "drizzle-orm";
import { db, firmsTable, companiesTable } from "@workspace/db";
import { deleteFirmCascade } from "./deleteFirmCascade.js";
import { logger } from "./logger.js";

const DUPLICATE_SLUG = "pamlico-capital";
const CANONICAL_SLUG = "pamlico";

export async function removePamlicoCapitalDuplicate(): Promise<void> {
  try {
    const [duplicate] = await db
      .select({ id: firmsTable.id, slug: firmsTable.slug })
      .from(firmsTable)
      .where(eq(firmsTable.slug, DUPLICATE_SLUG))
      .limit(1);

    // Dev, and prod after the first successful run: nothing to do.
    if (!duplicate) return;

    // Safety gate: a separate canonical "pamlico" tenant with at least one
    // active company MUST remain after removal, otherwise abort untouched.
    const [canonical] = await db
      .select({ id: firmsTable.id })
      .from(firmsTable)
      .where(eq(firmsTable.slug, CANONICAL_SLUG))
      .limit(1);
    if (!canonical || canonical.id === duplicate.id) {
      logger.error(
        { duplicateFirmId: duplicate.id },
        "pamlico-capital removal ABORTED: no separate canonical 'pamlico' firm found",
      );
      return;
    }
    const canonicalActive = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(
        and(
          eq(companiesTable.firmId, canonical.id),
          ne(companiesTable.status, "excluded"),
        ),
      );
    if (canonicalActive.length === 0) {
      logger.error(
        { duplicateFirmId: duplicate.id, canonicalFirmId: canonical.id },
        "pamlico-capital removal ABORTED: canonical 'pamlico' firm has no companies",
      );
      return;
    }

    const { removedCompanies, removedAssessments } = await deleteFirmCascade(duplicate.id);

    logger.info(
      {
        removedFirmId: duplicate.id,
        removedCompanies,
        removedAssessments,
        canonicalFirmId: canonical.id,
        canonicalCompanies: canonicalActive.length,
      },
      "pamlico-capital duplicate firm removed; canonical 'pamlico' tenant intact",
    );
  } catch (err) {
    logger.error({ err }, "pamlico-capital removal failed (non-fatal)");
  }
}
