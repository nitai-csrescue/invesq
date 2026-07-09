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
} from "@workspace/portfolio-engine";
import { logger } from "./logger.js";

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
  return { date: row.date, pillarScores };
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
        throw new Error(`firms.meta is missing for firm "${firm.slug}" (id ${firm.id})`);
      }

      const rawCompanies: RawCompany[] = companies
        .filter((c) => c.firmId === firm.id)
        .map((c) => {
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
        companies: rawCompanies,
      });
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
