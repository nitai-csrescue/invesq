// ---------------------------------------------------------------------------
// RLS-scoped database access for authenticated tenant sessions.
//
// withTenantDb(firmId, fn) runs fn's queries inside a transaction where the
// connection has dropped to the non-owner `tenant_reader` role with
// `app.firm_id` pinned — so Postgres itself guarantees only that firm's rows
// are visible, even if the SQL inside fn has a bug or omits a WHERE clause.
// Both SETs are LOCAL: role and setting evaporate at COMMIT/ROLLBACK, so the
// pooled connection returns to the pool with full owner privileges.
// ---------------------------------------------------------------------------
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { pool } from "@workspace/db";
import * as schema from "@workspace/db";

export type TenantDb = NodePgDatabase<typeof schema>;

export async function withTenantDb<T>(
  firmId: number,
  fn: (tdb: TenantDb) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE tenant_reader");
    // set_config with is_local=true; parameterized (firmId is a number from a
    // verified signed session, but never interpolate into SQL anyway).
    await client.query("SELECT set_config('app.firm_id', $1, true)", [String(firmId)]);
    const tdb = drizzle(client, { schema });
    const result = await fn(tdb);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
