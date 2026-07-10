// ---------------------------------------------------------------------------
// One-time backfill: enrich already-migrated DB rows with the descriptive
// fields the portfolio engine needs but the original migration didn't carry:
//   - companies.slug  <- RawCompany.id   (URL identifier, e.g. "renaissance-systems")
//   - companies.meta  <- CompanyMeta     (sector, hq, ARR, summary, gapNotes, ...)
//   - firms.meta      <- FirmMeta        (statusLabel, internalOnly)
//
// Matching is by firm slug + company name — exactly how the original
// migration inserted rows. The script FAILS LOUDLY unless all 5 firms and
// all 27 companies match 1:1 (no partial writes are committed on failure:
// it validates the full match set BEFORE writing anything).
//
// READ-ONLY with respect to the TypeScript data files. Idempotent — safe to
// re-run; it simply overwrites slug/meta with the same values.
//
// Run with:
//   pnpm --filter @workspace/cs-rescue run backfill-portfolio-meta
// ---------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, pool, firmsTable, companiesTable } from "@workspace/db";
import type { CompanyMeta, FirmMeta, RawCompany } from "@workspace/portfolio-engine";
import {
  LEGACY_FIRMS_META as FIRMS,
  STG_COMPANIES,
  PAMLICO_COMPANIES,
  RAVIGA_COMPANIES,
  LONGARC_COMPANIES,
  SOLEN_COMPANIES,
} from "@workspace/portfolio-engine/data";

const RAW_COMPANIES_BY_FIRM: Readonly<Record<string, RawCompany[]>> = {
  stg: STG_COMPANIES,
  pamlico: PAMLICO_COMPANIES,
  raviga: RAVIGA_COMPANIES,
  longarc: LONGARC_COMPANIES,
  solen: SOLEN_COMPANIES,
};

const EXPECTED_FIRMS = 5;
const EXPECTED_COMPANIES = 27;

function toCompanyMeta(raw: RawCompany): CompanyMeta {
  const { id: _id, name: _name, assessments: _assessments, ...meta } = raw;
  return meta;
}

interface PlannedFirmUpdate {
  dbFirmId: number;
  slug: string;
  meta: FirmMeta;
}

interface PlannedCompanyUpdate {
  dbCompanyId: number;
  firmSlug: string;
  name: string;
  slug: string;
  meta: CompanyMeta;
}

async function main() {
  console.log("Backfilling firms.meta + companies.slug/meta from TS data files...\n");

  const errs: string[] = [];
  const firmUpdates: PlannedFirmUpdate[] = [];
  const companyUpdates: PlannedCompanyUpdate[] = [];

  const dbFirms = await db.select().from(firmsTable);

  for (const firm of FIRMS) {
    const dbFirm = dbFirms.find((f) => f.slug === firm.slug);
    if (!dbFirm) {
      errs.push(`Firm "${firm.slug}" not found in DB`);
      continue;
    }

    firmUpdates.push({
      dbFirmId: dbFirm.id,
      slug: firm.slug,
      meta: { statusLabel: firm.statusLabel, internalOnly: firm.internalOnly },
    });

    const rawList = RAW_COMPANIES_BY_FIRM[firm.slug] ?? [];
    const dbCompanies = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.firmId, dbFirm.id));

    if (dbCompanies.length !== rawList.length) {
      errs.push(
        `Firm "${firm.slug}": DB has ${dbCompanies.length} companies, TS files have ${rawList.length}`,
      );
    }

    for (const raw of rawList) {
      const matches = dbCompanies.filter((c) => c.name === raw.name);
      if (matches.length === 0) {
        errs.push(`[${firm.slug}] company "${raw.name}" not found in DB`);
        continue;
      }
      if (matches.length > 1) {
        errs.push(
          `[${firm.slug}] company "${raw.name}" matched ${matches.length} DB rows — ambiguous`,
        );
        continue;
      }
      companyUpdates.push({
        dbCompanyId: matches[0].id,
        firmSlug: firm.slug,
        name: raw.name,
        slug: raw.id,
        meta: toCompanyMeta(raw),
      });
    }
  }

  if (firmUpdates.length !== EXPECTED_FIRMS) {
    errs.push(`Matched ${firmUpdates.length} firms, expected ${EXPECTED_FIRMS}`);
  }
  if (companyUpdates.length !== EXPECTED_COMPANIES) {
    errs.push(`Matched ${companyUpdates.length} companies, expected ${EXPECTED_COMPANIES}`);
  }

  if (errs.length > 0) {
    throw new Error(
      "Backfill aborted — nothing written. Problems:\n" +
        errs.map((e) => `  • ${e}`).join("\n"),
    );
  }

  // All matched 1:1 — now write.
  for (const fu of firmUpdates) {
    await db
      .update(firmsTable)
      .set({ meta: fu.meta })
      .where(eq(firmsTable.id, fu.dbFirmId));
  }
  for (const cu of companyUpdates) {
    await db
      .update(companiesTable)
      .set({ slug: cu.slug, meta: cu.meta })
      .where(eq(companiesTable.id, cu.dbCompanyId));
  }

  console.log(`Updated ${firmUpdates.length} firms (meta) and ${companyUpdates.length} companies (slug + meta).`);

  // Verify: re-read and assert every row now has slug + meta.
  const verifyErrs: string[] = [];
  const firmsAfter = await db.select().from(firmsTable);
  for (const f of firmsAfter) {
    if (f.meta == null) verifyErrs.push(`firms.meta still null for "${f.slug}"`);
  }
  const companiesAfter = await db.select().from(companiesTable);
  for (const c of companiesAfter) {
    if (!c.slug) verifyErrs.push(`companies.slug still empty for "${c.name}" (id=${c.id})`);
    if (c.meta == null) verifyErrs.push(`companies.meta still null for "${c.name}" (id=${c.id})`);
  }
  if (verifyErrs.length > 0) {
    throw new Error(
      "Post-write verification failed:\n" + verifyErrs.map((e) => `  • ${e}`).join("\n"),
    );
  }

  console.log("Post-write verification passed: all firms and companies have slug/meta.");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
