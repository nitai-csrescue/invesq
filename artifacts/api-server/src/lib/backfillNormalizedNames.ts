// ---------------------------------------------------------------------------
// Startup backfill for companies.normalized_name.
//
// normalized_name was added as a nullable column; every production row predates
// the insert-path wiring and is therefore NULL, which makes the partial unique
// index companies_firm_normalized_name_active_uq inert (Postgres treats NULLs
// as distinct). This idempotent routine fills any still-NULL row on boot so the
// index actually protects against duplicate-company inserts.
//
// It is deliberately additive and non-fatal:
//  - Only touches rows where normalized_name IS NULL, so it no-ops once every
//    row is populated (e.g. every boot after the first successful run, and in
//    dev where the backfill script already ran).
//  - Updates row-by-row with a per-row try/catch: if two non-excluded rows in a
//    firm normalize to the same key, the second update hits the unique index —
//    that row is logged and left NULL for human follow-up instead of crashing
//    the server on boot.
// ---------------------------------------------------------------------------
import { eq, isNull } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
import { logger } from "./logger.js";

export async function backfillCompanyNormalizedNames(): Promise<void> {
  try {
    const rows = await db
      .select({ id: companiesTable.id, name: companiesTable.name, firmId: companiesTable.firmId })
      .from(companiesTable)
      .where(isNull(companiesTable.normalizedName));

    if (rows.length === 0) return;

    let updated = 0;
    let skipped = 0;
    for (const row of rows) {
      const normalizedName = normalizeCompanyName(row.name);
      try {
        await db.update(companiesTable).set({ normalizedName }).where(eq(companiesTable.id, row.id));
        updated += 1;
      } catch (err) {
        skipped += 1;
        logger.warn(
          { err, companyId: row.id, firmId: row.firmId, normalizedName },
          "normalized_name backfill skipped a row (likely a firm-normalized-name uniqueness conflict); left NULL for human follow-up",
        );
      }
    }

    logger.info({ total: rows.length, updated, skipped }, "companies.normalized_name backfill complete");
  } catch (err) {
    logger.error({ err }, "companies.normalized_name backfill failed (non-fatal)");
  }
}
