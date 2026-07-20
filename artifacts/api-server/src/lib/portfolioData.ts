// ---------------------------------------------------------------------------
// Portfolio bootstrap loader — reads firms/companies/assessments from
// Postgres and reconstructs the RAW portfolio payload (RawCompany[] per
// firm). Derived values are never computed here; clients re-derive them
// via @workspace/portfolio-engine.
//
// Fail-soft: if the DB data fails engine validation, the /portfolio/bootstrap
// route returns 500 — the server itself never crashes (it also serves
// /admin auth). Only successful loads are cached; a failed load is retried
// on the next request.
// ---------------------------------------------------------------------------
import { asc } from "drizzle-orm";
import { db, firmsTable, companiesTable, assessmentsTable } from "@workspace/db";
import {
  AS_OF_DATE,
  buildFirmPortfolio,
  textToScore,
  PILLAR_IDS,
  type Assessment,
  type CompanyMeta,
  type FirmMeta,
  type PillarScore,
  type PortfolioBootstrap,
  type PortfolioBootstrapFirm,
  type RawCompany,
  type RubricBand,
  type RubricValue,
} from "@workspace/portfolio-engine";
import { LEGACY_FIRMS_META } from "@workspace/portfolio-engine/data";
import { logger } from "./logger.js";

// The 5 hand-authored demo tenants. These are the source-of-truth demo data;
// any problem with their DB rows must "fail loud" (fail the whole bootstrap)
// so it's caught immediately — exactly as before this file gained pipeline
// support. Every other firm (created via the /admin AI onboarding pipeline)
// is treated as best-effort: it's filtered to renderable companies and, if it
// still can't be built, skipped with a log rather than taking down the load.
const LEGACY_SLUGS = new Set<string>(LEGACY_FIRMS_META.map((f) => f.slug));

export type PortfolioLoadResult =
  | { ok: true; data: PortfolioBootstrap }
  | { ok: false; error: string };

let cached: PortfolioLoadResult | null = null;
let inflight: Promise<PortfolioLoadResult> | null = null;

type AssessmentRow = typeof assessmentsTable.$inferSelect;

function rowToAssessment(row: AssessmentRow): Assessment {
  const cols = [row.p1, row.p2, row.p3, row.p4, row.p5, row.p6, row.p7, row.p8];
  const pillarScores: Record<string, PillarScore> = {};
  PILLAR_IDS.forEach((pillarId, i) => {
    pillarScores[pillarId] = textToScore(cols[i]);
  });
  // Rubric v2 (Phase 2): ship the STORED fields when the row carries them all
  // (backfilled or pipeline-written rows). Rows without them (none today)
  // simply omit `rubric`; clients degrade via the shared computeRubricV2().
  const rubric =
    row.orgDesignScore && row.onboardingScore && row.healthScoringScore &&
    row.renewalExpansionScore && row.portcoScore
      ? {
          // DB boundary cast: these text columns are only ever written by
          // computeRubricV2() (backfill + build pipeline), so the value space
          // is the RubricValue/RubricBand unions by construction.
          orgDesignScore: row.orgDesignScore as RubricValue,
          onboardingScore: row.onboardingScore as RubricValue,
          healthScoringScore: row.healthScoringScore as RubricValue,
          renewalExpansionScore: row.renewalExpansionScore as RubricValue,
          portcoScore: row.portcoScore as RubricBand,
          rubricVersion: row.rubricVersion,
        }
      : undefined;
  return { date: row.date, pillarScores, ...(rubric ? { rubric } : {}) };
}

async function load(): Promise<PortfolioLoadResult> {
  try {
    const [firms, companies, assessments] = await Promise.all([
      db.select().from(firmsTable).orderBy(asc(firmsTable.id)),
      db.select().from(companiesTable).orderBy(asc(companiesTable.id)),
      db
        .select()
        .from(assessmentsTable)
        .orderBy(asc(assessmentsTable.date), asc(assessmentsTable.id)),
    ]);

    const assessmentsByCompany = new Map<number, Assessment[]>();
    for (const row of assessments) {
      const list = assessmentsByCompany.get(row.companyId) ?? [];
      list.push(rowToAssessment(row));
      assessmentsByCompany.set(row.companyId, list);
    }

    const bootstrapFirms: PortfolioBootstrapFirm[] = [];

    for (const firm of firms) {
      const firmMeta = firm.meta as FirmMeta | null;
      if (!firmMeta) {
        // Firms created via the /admin onboarding flow (status pending/reviewed)
        // have no portfolio meta yet — they aren't tenant portals, so they're
        // excluded from the bootstrap rather than failing the whole load.
        logger.info(
          { firmId: firm.id, slug: firm.slug, status: firm.status },
          "Skipping non-portfolio firm in bootstrap (no firms.meta)",
        );
        continue;
      }

      const isLegacy = LEGACY_SLUGS.has(firm.slug);
      const firmCompanies = companies.filter((c) => c.firmId === firm.id);

      if (isLegacy) {
        // ── Legacy tenants: EXACT pre-pipeline behavior. Every company must
        // have a slug + meta, all rows are included regardless of status, and
        // any violation throws — propagating out to fail the WHOLE load. This
        // preserves the "hand-authored demo data fails loud" guarantee.
        const rawCompanies: RawCompany[] = firmCompanies.map((c) => {
          if (!c.slug) {
            throw new Error(`companies.slug is missing for company "${c.name}" (id ${c.id})`);
          }
          const companyMeta = c.meta as CompanyMeta | null;
          if (!companyMeta) {
            throw new Error(`companies.meta is missing for company "${c.name}" (id ${c.id})`);
          }
          return {
            ...companyMeta,
            id: c.slug,
            name: c.name,
            assessments: assessmentsByCompany.get(c.id) ?? [],
          };
        });

        // Validate against every engine invariant — throws on any violation.
        buildFirmPortfolio(firm.slug, rawCompanies);

        bootstrapFirms.push({
          slug: firm.slug,
          displayName: firm.name,
          statusLabel: firmMeta.statusLabel,
          internalOnly: firmMeta.internalOnly,
          requireLogin: firmMeta.requireLogin ?? false,
          companies: rawCompanies,
        });
        continue;
      }

      // ── Pipeline firms (AI onboarding): best-effort / fail-soft. Only
      // "active" companies that already carry a slug, a CompanyMeta, and at
      // least one assessment are renderable — everything else (candidates,
      // excluded duplicates, partially-built rows) is filtered out. If the
      // firm still can't be built, it's skipped with a log instead of taking
      // down the whole bootstrap (which serves the 5 hand-authored tenants).
      try {
        const rawCompanies: RawCompany[] = firmCompanies
          .filter((c) => {
            if (c.status !== "active") return false;
            if (!c.slug) return false;
            if (!c.meta) return false;
            const history = assessmentsByCompany.get(c.id);
            return !!history && history.length > 0;
          })
          .map((c) => ({
            ...(c.meta as CompanyMeta),
            id: c.slug as string,
            name: c.name,
            assessments: assessmentsByCompany.get(c.id) ?? [],
          }));

        if (rawCompanies.length === 0) {
          logger.info(
            { firmId: firm.id, slug: firm.slug, status: firm.status },
            "Skipping pipeline firm in bootstrap (no renderable companies)",
          );
          continue;
        }

        // Validate against every engine invariant — throws on any violation.
        buildFirmPortfolio(firm.slug, rawCompanies);

        bootstrapFirms.push({
          slug: firm.slug,
          displayName: firm.name,
          statusLabel: firmMeta.statusLabel,
          internalOnly: firmMeta.internalOnly,
          requireLogin: firmMeta.requireLogin ?? false,
          companies: rawCompanies,
        });
      } catch (firmErr) {
        // One malformed pipeline firm must never break the tenant portals.
        logger.error(
          { err: firmErr, firmId: firm.id, slug: firm.slug, status: firm.status },
          "Skipping pipeline firm in bootstrap (failed engine validation)",
        );
      }
    }

    logger.info(
      {
        firms: bootstrapFirms.length,
        companies: companies.length,
        assessments: assessments.length,
      },
      "Portfolio bootstrap loaded and validated from DB",
    );
    return { ok: true, data: { asOfDate: AS_OF_DATE, firms: bootstrapFirms } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Portfolio bootstrap load failed");
    return { ok: false, error: message };
  }
}

export async function getPortfolioBootstrap(): Promise<PortfolioLoadResult> {
  if (cached?.ok) return cached;
  if (!inflight) {
    inflight = load().then((result) => {
      cached = result;
      inflight = null;
      return result;
    });
  }
  return inflight;
}

// Forces the next getPortfolioBootstrap() call to reload from the DB instead
// of serving the cached payload. Must be called after any direct DB write
// that changes firms/companies/assessments outside the normal /admin
// onboarding flow (e.g. the legacy-tenant seed endpoint) — otherwise
// production would keep serving the pre-write bootstrap until a restart.
export function invalidatePortfolioCache(): void {
  cached = null;
}
