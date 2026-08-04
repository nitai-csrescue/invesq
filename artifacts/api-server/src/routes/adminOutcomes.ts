// ---------------------------------------------------------------------------
// Data Moat action #3 — Outcome Data admin surface.
//
// Mounted INSIDE the /admin router (after requireAdminAuth), so every route
// here is Admin-Lens-gated server-side — same pattern as adminTiers.ts.
// Nothing in this file is reachable by tenant or anonymous sessions.
//
// Invariants:
// - companies.outcome_metrics + outcome_interventions are INTERNAL ONLY.
//   They are never joined into any tenant-facing payload, client report, or
//   exported PDF (standing rule: no real GRR/NRR in client-facing material).
// - Purely additive: nothing here reads or writes p1-p8 columns, composite
//   math, tier derivation, or any tenant-facing route/cache.
// ---------------------------------------------------------------------------
import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  companiesTable,
  firmsTable,
  outcomeInterventionsTable,
  OUTCOME_METRIC_KEYS,
  type OutcomeMetrics,
} from "@workspace/db";
import {
  UpdateAdminCompanyOutcomeMetricsBody,
  CreateAdminOutcomeInterventionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function metricsSnapshot(raw: unknown): OutcomeMetrics {
  const stored = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as OutcomeMetrics;
  const snap: OutcomeMetrics = {};
  for (const key of OUTCOME_METRIC_KEYS) snap[key] = stored[key] ?? null;
  return snap;
}

async function loadCompanyWithFirm(companyId: number) {
  const [row] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      outcomeMetrics: companiesTable.outcomeMetrics,
      firmSlug: firmsTable.slug,
    })
    .from(companiesTable)
    .innerJoin(firmsTable, eq(firmsTable.id, companiesTable.firmId))
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  return row ?? null;
}

async function outcomesPayload(company: { id: number; name: string; outcomeMetrics: unknown; firmSlug: string | null }) {
  const interventions = await db
    .select()
    .from(outcomeInterventionsTable)
    .where(eq(outcomeInterventionsTable.companyId, company.id))
    .orderBy(asc(outcomeInterventionsTable.occurredOn), asc(outcomeInterventionsTable.id));
  return {
    companyId: company.id,
    companyName: company.name,
    firmSlug: company.firmSlug,
    metrics: metricsSnapshot(company.outcomeMetrics),
    interventions: interventions.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      pillar: r.pillar,
      action: r.action,
      occurredOn: r.occurredOn,
      owner: r.owner,
      createdAt: r.createdAt.toISOString(),
      createdBy: r.createdBy,
    })),
  };
}

// --- GET /companies/:companyId/outcomes -------------------------------------

router.get("/companies/:companyId/outcomes", async (req, res) => {
  const companyId = Number(req.params.companyId);
  if (!Number.isInteger(companyId)) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const company = await loadCompanyWithFirm(companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(await outcomesPayload(company));
});

// --- PATCH /companies/:companyId/outcomes -----------------------------------
// Partial update: provided keys overwrite (null clears); omitted keys keep
// their stored value.

router.patch("/companies/:companyId/outcomes", async (req, res) => {
  const companyId = Number(req.params.companyId);
  if (!Number.isInteger(companyId)) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const parsed = UpdateAdminCompanyOutcomeMetricsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const company = await loadCompanyWithFirm(companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const merged = { ...metricsSnapshot(company.outcomeMetrics) };
  for (const key of OUTCOME_METRIC_KEYS) {
    if (key in parsed.data) merged[key] = parsed.data[key] ?? null;
  }
  await db.update(companiesTable).set({ outcomeMetrics: merged }).where(eq(companiesTable.id, companyId));
  res.json(await outcomesPayload({ ...company, outcomeMetrics: merged }));
});

// --- POST /companies/:companyId/outcomes/interventions ------------------------

router.post("/companies/:companyId/outcomes/interventions", async (req, res) => {
  const companyId = Number(req.params.companyId);
  if (!Number.isInteger(companyId)) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const parsed = CreateAdminOutcomeInterventionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const company = await loadCompanyWithFirm(companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  // req.user is only ever populated by authMiddleware for validated,
  // allowlisted Admin Lens sessions — never client-supplied.
  const createdBy = req.user?.email ?? "unknown-admin";
  const [row] = await db
    .insert(outcomeInterventionsTable)
    .values({
      companyId,
      pillar: parsed.data.pillar,
      action: parsed.data.action,
      occurredOn: parsed.data.occurredOn,
      owner: parsed.data.owner,
      createdBy,
    })
    .returning();
  res.status(201).json({
    id: row.id,
    companyId: row.companyId,
    pillar: row.pillar,
    action: row.action,
    occurredOn: row.occurredOn,
    owner: row.owner,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  });
});

// --- DELETE /outcome-interventions/:interventionId ---------------------------

router.delete("/outcome-interventions/:interventionId", async (req, res) => {
  const interventionId = Number(req.params.interventionId);
  if (!Number.isInteger(interventionId)) {
    res.status(400).json({ error: "Invalid intervention id" });
    return;
  }
  const deleted = await db
    .delete(outcomeInterventionsTable)
    .where(eq(outcomeInterventionsTable.id, interventionId))
    .returning({ id: outcomeInterventionsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Intervention not found" });
    return;
  }
  res.status(204).end();
});

export default router;
