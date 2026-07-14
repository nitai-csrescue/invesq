import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

/**
 * Startup schema guard: the production database is separate from dev, and
 * nothing runs drizzle-kit push against it at deploy time. GET /api/admin/firms
 * selects firms.sort_order unconditionally, so the column must exist before
 * the first request or the whole admin firms list 500s in production.
 *
 * ADD COLUMN IF NOT EXISTS is additive and idempotent: it no-ops in dev (the
 * column was pushed there already) and on every boot after the first prod run.
 * Non-fatal by design; a failure is logged loudly but never crashes boot.
 */
export async function ensureFirmsSortOrderColumn(): Promise<void> {
  try {
    await db.execute(
      sql`ALTER TABLE firms ADD COLUMN IF NOT EXISTS sort_order integer`,
    );
    logger.info("ensureFirmsSortOrderColumn: firms.sort_order present");
  } catch (err) {
    logger.error(
      { err },
      "ensureFirmsSortOrderColumn: failed to ensure firms.sort_order; admin firm list may 500 until resolved",
    );
  }
}
