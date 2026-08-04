---
name: STG tenant auth + RLS patterns
description: How the STG-only magic-link login and Postgres RLS tenant isolation are wired, and the traps found building it.
---

- STATUS (2026-08-04): login gate temporarily DISABLED — `LOGIN_GATED_SLUGS` is an empty set (Resend sandbox couldn't deliver to non-owner emails). All login machinery left in place unused; re-add "stg" to re-enable. RLS untouched.
- Scope boundary is `LOGIN_GATED_SLUGS` in api-server `lib/tenantAuth.ts` (code constant, NOT a DB flag). **Every** gate must union it with any DB `meta.requireLogin` check — the report-pdf route originally trusted only the DB flag and was an anonymous-download bypass.
- **Why:** DB meta can be missing/edited; code-level gating keeps dev and prod identical with no data migration.
- RLS: non-owner role `tenant_reader` + `tenant_isolation_select` policies keyed on `current_setting('app.firm_id')`; the owner connection bypasses RLS (not FORCEd) so all pre-existing paths are untouched. Tenant-session reads go through `withTenantDb()` (BEGIN; SET LOCAL ROLE; set_config; COMMIT).
- Roles/policies are NOT covered by drizzle-kit push or the Publish schema diff — they are provisioned by idempotent boot DDL (`ensureRlsPolicies`, atomic + startup self-check against pg_policies). This is the one sanctioned startup-DDL exception.
- **Traps:** (1) a single pg client cannot run parallel queries — serialize inside withTenantDb or you get pg@9 deprecation warnings; (2) when testing RLS in psql, resolve the firm id BEFORE `SET ROLE`, or the firms lookup is itself blocked (chicken-and-egg empty setting → cast error); (3) `current_setting(..., true)` unset under the role errors on `::int` cast — fails closed, not open.
- Bootstrap gating: `/api/portfolio/bootstrap` is session-aware — gated firms ship `companies: []` + `requireLogin: true` to anonymous callers; a matching signed tenant-session cookie (`tenant_sid`, stateless HMAC via SESSION_SECRET) gets the RLS-fetched slice. Frontend hydration tolerates empty companies, so redaction (not omission) is the right shape.
- **Publish trap:** Publish copies dev→prod via pg_dump/pg_restore, and roles are cluster-level (never in a database dump) — a policy `TO tenant_reader` fails the restore with "role does not exist" and kills the whole publish. Policies must be created with no TO clause (TO PUBLIC; equivalent since owner bypasses RLS). GRANT ACLs referencing the role remain in the dump but cross-cluster restores strip ACLs/ownership; if a publish ever fails on a GRANT, the fallback is dropping persistent grants and rethinking the role design.
- Allowlist: `STG_TENANT_EMAILS` secret with fallback to `VALIDATOR_EMAILS`; magic-link tokens are stored hash-only, single-use via atomic UPDATE, allowlist re-checked at verify time.
