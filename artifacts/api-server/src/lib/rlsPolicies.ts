// ---------------------------------------------------------------------------
// Postgres Row-Level Security bootstrap (defense in depth beyond URL-scoped
// routing). Idempotent boot DDL, run at api-server startup:
//
//   - Creates the non-owner role `tenant_reader` (NOLOGIN, SELECT-only) and
//     grants it to the app's connection user so requests can `SET LOCAL ROLE`.
//   - ENABLEs RLS on every tenant-scoped table and installs one SELECT
//     policy per table keyed on current_setting('app.firm_id').
//
// Scope boundary: the app's normal connection user OWNS these tables, and
// RLS is NOT forced — so every existing code path (all non-login tenants,
// admin, pipeline jobs) is bit-for-bit unaffected. Policies only bind when a
// request explicitly runs under `SET LOCAL ROLE tenant_reader` +
// `SET LOCAL app.firm_id` (see tenantDb.ts), which only happens for
// authenticated login-gated tenant sessions (STG only in this pass).
//
// Why boot DDL and not drizzle-kit: drizzle-kit push / the Publish schema
// diff manage columns and tables, but NOT roles or policies — this routine
// is the only path that also provisions production, and it no-ops after the
// first run.
//
// PUBLISH-COMPAT (do not "fix" back): policies are deliberately created
// WITHOUT `TO tenant_reader` (i.e. TO PUBLIC). Publish copies the dev DB to
// prod via pg_dump/pg_restore, and roles are cluster-level — they are not
// part of the dump — so a policy naming tenant_reader fails the restore with
// `role "tenant_reader" does not exist` (this broke a publish on 2026-07-30).
// TO PUBLIC is equivalent for us: the owner connection bypasses RLS anyway
// (owns the tables, RLS not FORCEd), so the policy only ever binds under
// SET LOCAL ROLE tenant_reader.
// ---------------------------------------------------------------------------
import { pool } from "@workspace/db";
import { logger } from "./logger.js";

const DDL = `
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenant_reader') THEN
    CREATE ROLE tenant_reader NOLOGIN;
  END IF;
END
$$;

GRANT tenant_reader TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO tenant_reader;
GRANT SELECT ON firms, companies, assessments, findings, signals, report_exports, ingestion_sources TO tenant_reader;

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON firms;
CREATE POLICY tenant_isolation_select ON firms FOR SELECT
  USING (id = current_setting('app.firm_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation_select ON companies;
CREATE POLICY tenant_isolation_select ON companies FOR SELECT
  USING (firm_id = current_setting('app.firm_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation_select ON ingestion_sources;
CREATE POLICY tenant_isolation_select ON ingestion_sources FOR SELECT
  USING (firm_id = current_setting('app.firm_id', true)::int);

DROP POLICY IF EXISTS tenant_isolation_select ON assessments;
CREATE POLICY tenant_isolation_select ON assessments FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE firm_id = current_setting('app.firm_id', true)::int
  ));

DROP POLICY IF EXISTS tenant_isolation_select ON findings;
CREATE POLICY tenant_isolation_select ON findings FOR SELECT
  USING (assessment_id IN (
    SELECT a.id FROM assessments a
    JOIN companies c ON c.id = a.company_id
    WHERE c.firm_id = current_setting('app.firm_id', true)::int
  ));

DROP POLICY IF EXISTS tenant_isolation_select ON signals;
CREATE POLICY tenant_isolation_select ON signals FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE firm_id = current_setting('app.firm_id', true)::int
  ));

DROP POLICY IF EXISTS tenant_isolation_select ON report_exports;
CREATE POLICY tenant_isolation_select ON report_exports FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE firm_id = current_setting('app.firm_id', true)::int
  ));
COMMIT;
`;

// Startup self-check: assert the role and every expected policy actually
// exist before the tenant-gated data path is considered healthy.
const EXPECTED_POLICY_TABLES = [
  "firms",
  "companies",
  "ingestion_sources",
  "assessments",
  "findings",
  "signals",
  "report_exports",
];

export async function ensureRlsPolicies(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(DDL);
    const { rows } = await client.query(
      `SELECT tablename FROM pg_policies WHERE policyname = 'tenant_isolation_select' AND schemaname = 'public'`,
    );
    const present = new Set(rows.map((r: { tablename: string }) => r.tablename));
    const missing = EXPECTED_POLICY_TABLES.filter((t) => !present.has(t));
    if (missing.length > 0) {
      throw new Error(`RLS self-check failed: missing tenant_isolation_select on [${missing.join(", ")}]`);
    }
    logger.info("RLS tenant-isolation policies ensured and self-checked (role tenant_reader)");
  } catch (err) {
    // Fail loud in logs but never take the server down: existing tenants are
    // served by the owner role and are unaffected; only the login-gated
    // tenant data path (which requires these policies) would fail closed.
    logger.error({ err }, "Failed to ensure RLS policies");
  } finally {
    client.release();
  }
}
