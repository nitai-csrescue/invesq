// ---------------------------------------------------------------------------
// Idempotent, admin-triggered seed for the 5 legacy demo tenants
// (stg/pamlico/raviga/longarc/solen). Exists because production's `firms`
// table was found to be missing all 5 of them (only the migration script had
// ever populated a dev DB) — see PortfolioDashboard's FirmDataUnavailable
// guard for the crash this caused on `/stg/portfolio` etc.
//
// This is the DB-write counterpart of scripts/migrate-portfolio-to-db.ts, but
// safe to call against a DB that may already contain unrelated real client
// firms (e.g. "Pamlico Capital", slug "pamlico-capital" — NOT the legacy
// "pamlico" demo tenant, whose slug is just "pamlico"):
//   - Only ever touches the 5 hardcoded legacy slugs; never lists or scans
//     other firms.
//   - Per-slug: if that exact slug already exists, it is skipped untouched
//     (existing row is never read for merge, updated, or deleted).
//   - Each slug's firm+companies+assessments are validated up front (via
//     buildFirmPortfolio, which throws on any data problem) BEFORE any write
//     for that slug, and then written inside a single db.transaction — so a
//     mid-slug failure can never leave that slug half-inserted, and never
//     aborts the slugs already committed before it.
// ---------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, firmsTable, companiesTable, assessmentsTable } from "@workspace/db";
import {
  buildFirmPortfolio,
  PILLAR_IDS,
  scoreToText,
  type RawCompany,
  type CompanyMeta,
  type PillarScore,
} from "@workspace/portfolio-engine";
import {
  LEGACY_FIRMS_META,
  STG_COMPANIES,
  PAMLICO_COMPANIES,
  RAVIGA_COMPANIES,
  LONGARC_COMPANIES,
  SOLEN_COMPANIES,
} from "@workspace/portfolio-engine/data";
import type { LegacyTenantSeedItem } from "@workspace/api-zod";
import { logger } from "./logger.js";
import { invalidatePortfolioCache } from "./portfolioData.js";

const RAW_COMPANIES_BY_FIRM: Readonly<Record<string, RawCompany[]>> = {
  stg: STG_COMPANIES,
  pamlico: PAMLICO_COMPANIES,
  raviga: RAVIGA_COMPANIES,
  longarc: LONGARC_COMPANIES,
  solen: SOLEN_COMPANIES,
};

function toCompanyMeta(raw: RawCompany): CompanyMeta {
  const { id: _id, name: _name, assessments: _assessments, ...meta } = raw;
  return meta;
}

function pillarColumns(scores: Record<string, PillarScore>) {
  const [p1, p2, p3, p4, p5, p6, p7, p8] = PILLAR_IDS.map((id) => scoreToText(scores[id] ?? null));
  return { p1, p2, p3, p4, p5, p6, p7, p8 };
}

async function seedOneFirm(
  firmSlug: string,
  displayName: string,
  statusLabel: string,
  internalOnly: boolean,
): Promise<LegacyTenantSeedItem> {
  const [existing] = await db.select().from(firmsTable).where(eq(firmsTable.slug, firmSlug)).limit(1);
  if (existing) {
    return {
      slug: firmSlug,
      displayName,
      status: "skipped",
      companiesInserted: 0,
      assessmentsInserted: 0,
      reason: `firm slug "${firmSlug}" already exists (firm id ${existing.id}) — left untouched`,
    };
  }

  const rawList = RAW_COMPANIES_BY_FIRM[firmSlug] ?? [];

  // Pre-flight validation BEFORE any write for this slug: buildFirmPortfolio
  // throws on any data problem (missing/invalid pillar scores, unsorted
  // assessments, inverted ARR ranges, etc). A firm that fails validation is
  // never partially written.
  buildFirmPortfolio(firmSlug, rawList);

  let companiesInserted = 0;
  let assessmentsInserted = 0;

  await db.transaction(async (tx) => {
    const [firmRow] = await tx
      .insert(firmsTable)
      .values({
        name: displayName,
        slug: firmSlug,
        website: null,
        status: "active",
        meta: { statusLabel, internalOnly },
      })
      .returning();

    if (!firmRow) {
      throw new Error(`Firm insert returned no row for slug "${firmSlug}"`);
    }

    for (const raw of rawList) {
      const [companyRow] = await tx
        .insert(companiesTable)
        .values({
          firmId: firmRow.id,
          name: raw.name,
          website: null,
          status: "active",
          slug: raw.id,
          meta: toCompanyMeta(raw),
        })
        .returning();

      if (!companyRow) {
        throw new Error(`Company insert returned no row for "${firmSlug}/${raw.id}"`);
      }
      companiesInserted++;

      const assessmentRows = raw.assessments.map((a) => ({
        companyId: companyRow.id,
        date: a.date,
        ...pillarColumns(a.pillarScores),
      }));

      if (assessmentRows.length > 0) {
        await tx.insert(assessmentsTable).values(assessmentRows);
        assessmentsInserted += assessmentRows.length;
      }
    }
  });

  return {
    slug: firmSlug,
    displayName,
    status: "seeded",
    companiesInserted,
    assessmentsInserted,
    reason: null,
  };
}

export async function seedLegacyTenants(): Promise<LegacyTenantSeedItem[]> {
  const results: LegacyTenantSeedItem[] = [];

  for (const firm of LEGACY_FIRMS_META) {
    const result = await seedOneFirm(firm.slug, firm.displayName, firm.statusLabel, firm.internalOnly);
    results.push(result);
    logger.info({ result }, "Legacy tenant seed: processed one firm");
  }

  const anySeeded = results.some((r) => r.status === "seeded");
  if (anySeeded) {
    // getPortfolioBootstrap() caches a successful load forever — without
    // this, a production instance that already served /api/portfolio/bootstrap
    // once (e.g. on boot) would keep serving the pre-seed payload (missing
    // these firms) until the process restarts.
    invalidatePortfolioCache();
  }

  return results;
}
