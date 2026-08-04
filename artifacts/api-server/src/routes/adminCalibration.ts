// ---------------------------------------------------------------------------
// Data Moat — Calibration Ledger admin surface.
//
// Mounted INSIDE the /admin router (after requireAdminAuth), so every route
// here is Admin-Lens-gated server-side — same pattern as adminOutcomes.ts.
//
// Invariants:
// - calibration_predictions / calibration_observations and the resolution
//   event columns on signals (event_type, calibration_verdict) are INTERNAL
//   ONLY: never joined into tenant payloads, client reports, or PDFs.
// - Locked prediction snapshots are IMMUTABLE. Rows are created already
//   locked, there is no update statement in this file for them, and the
//   PATCH route exists solely to reject edits with 409 so the contract is
//   explicit and testable.
// - Deltas (Observed minus Predicted, per pillar) are computed at read time,
//   never stored.
// - Purely additive: nothing here reads or writes p1-p8 scoring, composite
//   math, tier derivation, or any tenant-facing route/cache.
// ---------------------------------------------------------------------------
import { Router, type IRouter } from "express";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import {
  db,
  assessmentsTable,
  companiesTable,
  firmsTable,
  signalsTable,
  calibrationPredictionsTable,
  calibrationObservationsTable,
  RESOLUTION_EVENT_TYPES,
} from "@workspace/db";
import { PILLAR_IDS, getTier } from "@workspace/portfolio-engine";
import {
  CreateAdminCalibrationObservationBody,
  CreateAdminResolutionEventBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const VALID_SCORES = new Set(["0", "1", "2", "NA"]);

function isRealCalendarDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Validate a pillars map: known pillar ids only, known score values only.
function validatePillars(
  raw: Record<string, string>,
  { requireAll }: { requireAll: boolean },
): { ok: true; pillars: Record<string, string> } | { ok: false; error: string } {
  const pillars: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!(PILLAR_IDS as readonly string[]).includes(key)) {
      return { ok: false, error: `Unknown pillar id: ${key}` };
    }
    if (!VALID_SCORES.has(value)) {
      return { ok: false, error: `Invalid score for ${key}: ${value} (expected 0|1|2|NA)` };
    }
    pillars[key] = value;
  }
  if (requireAll) {
    for (const id of PILLAR_IDS) {
      if (!(id in pillars)) return { ok: false, error: `Missing pillar: ${id}` };
    }
  }
  if (Object.keys(pillars).length === 0) {
    return { ok: false, error: "At least one pillar score is required" };
  }
  return { ok: true, pillars };
}

async function loadCompanyWithFirm(companyId: number) {
  const [row] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      firmSlug: firmsTable.slug,
    })
    .from(companiesTable)
    .innerJoin(firmsTable, eq(firmsTable.id, companiesTable.firmId))
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  return row ?? null;
}

function predictionJson(row: typeof calibrationPredictionsTable.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    assessmentId: row.assessmentId,
    pillars: row.pillars as Record<string, string>,
    composite: row.composite,
    band: row.band,
    rubricVersion: row.rubricVersion,
    predictedAt: row.predictedAt.toISOString(),
    lockedAt: row.lockedAt.toISOString(),
    createdBy: row.createdBy,
  };
}

function resolutionEventJson(row: typeof signalsTable.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    pillarId: row.pillarId,
    eventType: row.eventType,
    verdict: row.calibrationVerdict,
    eventDate: row.dateObserved,
    source: row.source,
    note: row.note,
    url: row.url,
    createdAt: row.createdAt.toISOString(),
  };
}

// Per-pillar Delta = Observed minus Predicted, computed fresh on every read.
// Observed side = the LATEST observation (by observedAt, then id) that
// includes that pillar. "NA" or unobserved on either side -> delta null.
function computeDeltas(
  prediction: { pillars: unknown } | null,
  observations: Array<{ pillars: unknown; observedAt: Date; id: number }>,
) {
  const predicted = (prediction?.pillars ?? {}) as Record<string, string>;
  const ordered = [...observations].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime() || a.id - b.id,
  );
  const latestObserved: Record<string, string> = {};
  for (const obs of ordered) {
    for (const [k, v] of Object.entries((obs.pillars ?? {}) as Record<string, string>)) {
      latestObserved[k] = v;
    }
  }
  return PILLAR_IDS.map((pillarId) => {
    const p = predicted[pillarId] ?? null;
    const o = latestObserved[pillarId] ?? null;
    const pNum = p !== null && p !== "NA" ? Number(p) : null;
    const oNum = o !== null && o !== "NA" ? Number(o) : null;
    return {
      pillarId,
      predicted: p,
      observed: o,
      delta: pNum !== null && oNum !== null ? oNum - pNum : null,
    };
  });
}

async function calibrationPayload(company: { id: number; name: string; firmSlug: string | null }) {
  const [prediction] = await db
    .select()
    .from(calibrationPredictionsTable)
    .where(eq(calibrationPredictionsTable.companyId, company.id))
    .limit(1);
  const observations = await db
    .select()
    .from(calibrationObservationsTable)
    .where(eq(calibrationObservationsTable.companyId, company.id))
    .orderBy(desc(calibrationObservationsTable.observedAt), desc(calibrationObservationsTable.id));
  const events = await db
    .select()
    .from(signalsTable)
    .where(and(eq(signalsTable.companyId, company.id), isNotNull(signalsTable.eventType)))
    .orderBy(desc(signalsTable.dateObserved), desc(signalsTable.id));
  return {
    companyId: company.id,
    companyName: company.name,
    firmSlug: company.firmSlug,
    prediction: prediction ? predictionJson(prediction) : null,
    observations: observations.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      pillars: r.pillars as Record<string, string>,
      observedAt: r.observedAt.toISOString(),
      source: r.source,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      createdBy: r.createdBy,
    })),
    deltas: computeDeltas(prediction ?? null, observations),
    resolutionEvents: events.map(resolutionEventJson),
  };
}

function parseCompanyId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

// --- GET /companies/:companyId/calibration -----------------------------------

router.get("/companies/:companyId/calibration", async (req, res) => {
  const companyId = parseCompanyId(req.params.companyId);
  if (companyId === null) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const company = await loadCompanyWithFirm(companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(await calibrationPayload(company));
});

// --- POST /companies/:companyId/calibration/prediction ------------------------
// Snapshot + lock, derived server-side from the latest scored assessment.
// One per company, immutable after creation.

router.post("/companies/:companyId/calibration/prediction", async (req, res) => {
  const companyId = parseCompanyId(req.params.companyId);
  if (companyId === null) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const company = await loadCompanyWithFirm(companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const [existing] = await db
    .select({ id: calibrationPredictionsTable.id })
    .from(calibrationPredictionsTable)
    .where(eq(calibrationPredictionsTable.companyId, companyId))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "A locked prediction snapshot already exists for this company (immutable)" });
    return;
  }
  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.companyId, companyId))
    .orderBy(desc(assessmentsTable.date), desc(assessmentsTable.id))
    .limit(1);
  if (!assessment || assessment.p1 === null) {
    res.status(422).json({ error: "Company has no scored assessment to snapshot" });
    return;
  }
  // p1..p8 map to PILLAR_IDS in order — same mapping as portfolioData.ts.
  const cols = [
    assessment.p1, assessment.p2, assessment.p3, assessment.p4,
    assessment.p5, assessment.p6, assessment.p7, assessment.p8,
  ];
  const pillars: Record<string, string> = {};
  PILLAR_IDS.forEach((pillarId, i) => {
    pillars[pillarId] = cols[i] ?? "NA";
  });
  // Phase 1 tier composite: NA substitutes as 1, same rule as the rest of
  // the app (build.ts / portfolio engine). READ-ONLY reuse of the shared
  // helpers — this does not alter any scoring path.
  const composite = Object.values(pillars).reduce(
    (sum, s) => sum + (s === "NA" ? 1 : Number(s)),
    0,
  );
  const band = getTier(composite).label;
  const createdBy = req.user?.email ?? "unknown-admin";
  const [row] = await db
    .insert(calibrationPredictionsTable)
    .values({
      companyId,
      assessmentId: assessment.id,
      pillars,
      composite,
      band,
      rubricVersion: assessment.rubricVersion,
      // The prediction was made when the assessment was scored.
      predictedAt: new Date(`${assessment.date}T00:00:00Z`),
      createdBy,
    })
    .returning();
  res.status(201).json(predictionJson(row));
});

// --- PATCH /companies/:companyId/calibration/prediction -----------------------
// ALWAYS rejected: locked snapshots are immutable. This route exists so the
// contract is explicit and testable, not because there is anything to edit.

router.patch("/companies/:companyId/calibration/prediction", async (req, res) => {
  const companyId = parseCompanyId(req.params.companyId);
  if (companyId === null) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const [existing] = await db
    .select({ id: calibrationPredictionsTable.id })
    .from(calibrationPredictionsTable)
    .where(eq(calibrationPredictionsTable.companyId, companyId))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "No prediction snapshot exists for this company" });
    return;
  }
  res.status(409).json({
    error: "Locked prediction snapshots are immutable. Predicted values can never be edited after locking.",
  });
});

// --- POST /companies/:companyId/calibration/observations -----------------------

router.post("/companies/:companyId/calibration/observations", async (req, res) => {
  const companyId = parseCompanyId(req.params.companyId);
  if (companyId === null) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const parsed = CreateAdminCalibrationObservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const pillarsCheck = validatePillars(
    (parsed.data.pillars ?? {}) as Record<string, string>,
    { requireAll: false },
  );
  if (!pillarsCheck.ok) {
    res.status(400).json({ error: pillarsCheck.error });
    return;
  }
  const observedAt = new Date(parsed.data.observedAt);
  if (Number.isNaN(observedAt.getTime())) {
    res.status(400).json({ error: "observedAt is not a valid timestamp" });
    return;
  }
  const company = await loadCompanyWithFirm(companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const createdBy = req.user?.email ?? "unknown-admin";
  await db.insert(calibrationObservationsTable).values({
    companyId,
    pillars: pillarsCheck.pillars,
    observedAt,
    source: parsed.data.source,
    note: parsed.data.note ?? null,
    createdBy,
  });
  res.status(201).json(await calibrationPayload(company));
});

// --- POST /companies/:companyId/calibration/resolution-events ------------------
// Resolution events are rows in the EXISTING signals table (event_type set),
// attached to the company's latest assessment for provenance.

router.post("/companies/:companyId/calibration/resolution-events", async (req, res) => {
  const companyId = parseCompanyId(req.params.companyId);
  if (companyId === null) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const parsed = CreateAdminResolutionEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  if (!(RESOLUTION_EVENT_TYPES as readonly string[]).includes(parsed.data.eventType)) {
    res.status(400).json({ error: `Unknown event type: ${parsed.data.eventType}` });
    return;
  }
  if (!(PILLAR_IDS as readonly string[]).includes(parsed.data.pillarId)) {
    res.status(400).json({ error: `Unknown pillar id: ${parsed.data.pillarId}` });
    return;
  }
  if (!isRealCalendarDate(parsed.data.eventDate)) {
    res.status(400).json({ error: "eventDate is not a valid calendar date" });
    return;
  }
  const company = await loadCompanyWithFirm(companyId);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const [assessment] = await db
    .select({ id: assessmentsTable.id })
    .from(assessmentsTable)
    .where(eq(assessmentsTable.companyId, companyId))
    .orderBy(desc(assessmentsTable.date), desc(assessmentsTable.id))
    .limit(1);
  if (!assessment) {
    res.status(422).json({ error: "Company has no assessment row to attach the resolution event to" });
    return;
  }
  // direction/confidence: resolution events are real-world outcomes, so the
  // direction encodes what the event says about the company (contradiction
  // of a weak prediction reads positive for the company and vice versa is
  // too clever — keep it simple: verdict drives nothing here, direction is
  // "neutral" and confidence "High" because the event actually happened).
  const [row] = await db
    .insert(signalsTable)
    .values({
      assessmentId: assessment.id,
      companyId,
      pillarId: parsed.data.pillarId,
      source: parsed.data.source,
      dateObserved: parsed.data.eventDate,
      url: parsed.data.url ?? null,
      direction: "neutral",
      confidence: "High",
      note: parsed.data.note,
      sourceSystem: "calibration_ledger",
      eventType: parsed.data.eventType,
      calibrationVerdict: parsed.data.verdict,
    })
    .returning();
  res.status(201).json(resolutionEventJson(row));
});

// --- DELETE /calibration/resolution-events/:signalId ---------------------------
// Guarded: refuses to delete a signals row that is NOT a resolution event.

router.delete("/calibration/resolution-events/:signalId", async (req, res) => {
  const signalId = Number(req.params.signalId);
  if (!Number.isInteger(signalId)) {
    res.status(400).json({ error: "Invalid signal id" });
    return;
  }
  const deleted = await db
    .delete(signalsTable)
    .where(and(eq(signalsTable.id, signalId), isNotNull(signalsTable.eventType)))
    .returning({ id: signalsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "No resolution event with this id" });
    return;
  }
  res.status(204).end();
});

export default router;
