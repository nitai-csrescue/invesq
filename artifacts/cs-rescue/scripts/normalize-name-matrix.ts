// ---------------------------------------------------------------------------
// Read-only test matrix for @workspace/portfolio-engine's normalizeCompanyName
// against every existing company name in the DB (ARCHITECTURE-UNIFIED-DB.md
// Risk #2: "needs a small test matrix against the 30 existing company names
// before going live, not just the 3 pipeline ones"). Performs ZERO writes.
//
// Checks, per firm:
//   - every active company's normalized name is unique within that firm
//     (this is exactly what companies_firm_normalized_name_active_uq will
//     enforce once added)
//   - flags (without failing) any excluded/candidate company whose
//     normalized name collides with an active company under the same firm,
//     since that is the "legitimate re-discovery" scenario Risk #2 calls out
//     — not a violation of the new constraint (which only covers status <>
//     'excluded'), but worth a human glance.
//
// Run with:
//   pnpm --filter @workspace/cs-rescue exec tsx scripts/normalize-name-matrix.ts
// ---------------------------------------------------------------------------
import { db, pool, firmsTable, companiesTable } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";

async function main() {
  console.log("=== normalizeCompanyName test matrix: all existing company names ===\n");

  const firms = await db.select().from(firmsTable).orderBy(firmsTable.slug);
  const companies = await db.select().from(companiesTable).orderBy(companiesTable.id);

  let totalCompanies = 0;
  let activeUniqueViolations = 0;
  let crossStatusCollisions = 0;

  for (const firm of firms) {
    const firmCompanies = companies.filter((c) => c.firmId === firm.id);
    if (firmCompanies.length === 0) continue;

    console.log(`[${firm.slug}] (id=${firm.id})`);
    const activeSeen = new Map<string, { id: number; name: string }>();
    const nonActiveByKey = new Map<string, { id: number; name: string; status: string }[]>();

    for (const c of firmCompanies) {
      const key = normalizeCompanyName(c.name);
      totalCompanies++;
      console.log(`  "${c.name}" -> "${key}"  (id=${c.id}, status=${c.status})`);

      if (c.status !== "excluded") {
        const existing = activeSeen.get(key);
        if (existing) {
          activeUniqueViolations++;
          console.log(
            `    !! COLLISION: normalized key "${key}" already used by non-excluded company id=${existing.id} ("${existing.name}") in this firm`,
          );
        } else {
          activeSeen.set(key, { id: c.id, name: c.name });
        }
      } else {
        const list = nonActiveByKey.get(key) ?? [];
        list.push({ id: c.id, name: c.name, status: c.status });
        nonActiveByKey.set(key, list);
      }
    }

    for (const [key, excludedRows] of nonActiveByKey) {
      const activeMatch = activeSeen.get(key);
      if (activeMatch) {
        crossStatusCollisions++;
        for (const er of excludedRows) {
          console.log(
            `    (info) excluded company id=${er.id} ("${er.name}") normalizes to the same key "${key}" as active company id=${activeMatch.id} ("${activeMatch.name}") — expected/benign, the new unique index only covers status <> 'excluded'`,
          );
        }
      }
    }

    console.log("");
  }

  console.log("=== Summary ===");
  console.log(`Total companies checked: ${totalCompanies}`);
  console.log(
    `Non-excluded (active/candidate) normalized-name collisions per firm: ${activeUniqueViolations} (these WOULD violate companies_firm_normalized_name_active_uq)`,
  );
  console.log(
    `Excluded-vs-active same-key collisions (informational only, not a constraint violation): ${crossStatusCollisions}`,
  );

  if (activeUniqueViolations > 0) {
    console.log(
      "\n>>> Non-excluded collisions found — the unique index add would FAIL until these are resolved (see dedup-repair-companies.ts).",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "\nNo non-excluded collisions — safe to add companies_firm_normalized_name_active_uq.",
    );
  }
}

main()
  .catch((err) => {
    console.error("Normalization matrix check failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
