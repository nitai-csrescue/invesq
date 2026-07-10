// ---------------------------------------------------------------------------
// Standalone re-run of the dedup-repair logic already shipped as
// POST /api/admin/backfill-pipeline-meta (routes/admin.ts) — restricted to
// ONLY the duplicate-company-unification half of that endpoint (this script
// does not touch firms.meta). Per ARCHITECTURE-UNIFIED-DB.md Phase 2 step 1:
// run once more, immediately before adding the
// companies_firm_normalized_name_active_uq unique index, to guarantee zero
// pre-existing violators at constraint-add time.
//
// Mirrors routes/admin.ts exactly:
//   - skips LEGACY_SLUGS firms entirely (the 5 hand-authored tenants are
//     curated demo data, never pipeline-deduped)
//   - for every other firm, groups its `status = 'active'` companies by
//     normalizeCompanyName(name) (== admin.ts's slugify(name), same
//     algorithm, see lib/portfolio-engine/src/mapping.ts)
//   - keeps the lowest-id row per normalized-name group, marks every other
//     row in that group `status: 'excluded'` — NEVER a delete
//
// Idempotent and safe to re-run at any time (a no-op once there are no
// duplicates left).
//
// Run with:
//   pnpm --filter @workspace/cs-rescue run dedup-repair-companies
// ---------------------------------------------------------------------------
import { and, eq, inArray } from "drizzle-orm";
import { db, pool, firmsTable, companiesTable } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
import { LEGACY_FIRMS_META } from "@workspace/portfolio-engine/data";

const LEGACY_SLUGS = new Set<string>(LEGACY_FIRMS_META.map((f) => f.slug));

async function main() {
  console.log("=== Dedup repair: duplicate active companies per firm (by normalizedName) ===\n");

  const allFirms = await db.select().from(firmsTable);
  let duplicatesExcluded = 0;
  let firmsTouched = 0;

  for (const firm of allFirms) {
    if (LEGACY_SLUGS.has(firm.slug)) {
      continue;
    }

    const activeCompanies = await db
      .select()
      .from(companiesTable)
      .where(and(eq(companiesTable.firmId, firm.id), eq(companiesTable.status, "active")))
      .orderBy(companiesTable.id);

    const seen = new Set<string>();
    const dupeIds: number[] = [];
    for (const c of activeCompanies) {
      const key = normalizeCompanyName(c.name);
      if (seen.has(key)) {
        dupeIds.push(c.id);
      } else {
        seen.add(key);
      }
    }

    if (dupeIds.length > 0) {
      await db
        .update(companiesTable)
        .set({ status: "excluded" })
        .where(and(eq(companiesTable.firmId, firm.id), inArray(companiesTable.id, dupeIds)));
      duplicatesExcluded += dupeIds.length;
      firmsTouched++;
      console.log(`[${firm.slug}] excluded ${dupeIds.length} duplicate company row(s): [${dupeIds.join(", ")}]`);
    } else {
      console.log(`[${firm.slug}] no duplicates found`);
    }
  }

  console.log(
    `\n=== Done: ${duplicatesExcluded} duplicate row(s) excluded across ${firmsTouched} firm(s) (legacy tenants skipped) ===`,
  );
}

main()
  .catch((err) => {
    console.error("Dedup repair failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
