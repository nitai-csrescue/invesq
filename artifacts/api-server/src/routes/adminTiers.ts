// ---------------------------------------------------------------------------
// CQ-37 — Tiered confidence model, admin surface.
//
// Mounted INSIDE the /admin router (after requireAdminAuth), so every route
// here is Admin-Lens-gated server-side. Nothing in this file is reachable by
// tenant or anonymous sessions, and nothing here touches composite/tier/
// rollup scoring or any tenant-facing route.
//
// Invariants (design locked by Nitai, Aug 3 2026):
// - Tiers are INDEPENDENT, never cumulative.
// - A dispute NEVER mutates the disputed value; only an explicit admin
//   resolve(action=apply) does, and that write + its tier_audit_log row
//   happen in one transaction. No silent overwrites, ever.
// ---------------------------------------------------------------------------
import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  firmsTable,
  tierAuditLogTable,
  tierDisputesTable,
  TIER2_CONNECTOR_TYPES,
  type Tier2ConnectorStatus,
  type Tier2ConnectorType,
  type Tier2Status,
  type Tier3Status,
} from "@workspace/db";
import {
  ListAdminTierSummaryQueryParams,
  ListAdminTierDisputesQueryParams,
  UpdateAdminCompanyTier2Body,
  UpdateAdminCompanyTier3Body,
  CreateAdminTierDisputeBody,
  ResolveAdminTierDisputeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// --- helpers ---------------------------------------------------------------

function tier2Snapshot(raw: unknown): {
  backengine: Tier2ConnectorStatus;
  crm: Tier2ConnectorStatus;
  conversation_intelligence: Tier2ConnectorStatus;
  product_telemetry: Tier2ConnectorStatus;
  connectedCount: number;
  totalCount: number;
} {
  const stored = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Tier2Status;
  const snap = {
    backengine: stored.backengine ?? "not_connected",
    crm: stored.crm ?? "not_connected",
    conversation_intelligence: stored.conversation_intelligence ?? "not_connected",
    product_telemetry: stored.product_telemetry ?? "not_connected",
  };
  const connectedCount = TIER2_CONNECTOR_TYPES.filter((c) => snap[c] === "connected").length;
  return { ...snap, connectedCount, totalCount: TIER2_CONNECTOR_TYPES.length };
}

function adminEditor(reqUser: Express.Request["user"]): string {
  // req.user is only ever populated by authMiddleware for validated,
  // allowlisted Admin Lens sessions — never client-supplied.
  return reqUser?.email ?? "unknown-admin";
}

async function loadCompany(companyId: number) {
  const [company] = await db
    .select({
      id: companiesTable.id,
      tier2Status: companiesTable.tier2Status,
      tier3Status: companiesTable.tier3Status,
    })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  return company ?? null;
}

function mutationResult(companyId: number, tier2Raw: unknown, tier3: string, auditRowId: number | null) {
  return {
    companyId,
    tier2: tier2Snapshot(tier2Raw),
    tier3Status: tier3 as Tier3Status,
    auditRowId,
  };
}

// SQL fragment: connectors currently 'connected' inside the jsonb map.
const connectedCountSql = sql<number>`(
  select count(*)::int from jsonb_each_text(coalesce(${companiesTable.tier2Status}, '{}'::jsonb)) kv
  where kv.value = 'connected'
)`;
const pendingDisputesSql = sql<number>`(
  select count(*)::int from tier_disputes td
  where td.company_id = ${companiesTable.id} and td.status = 'pending'
)`;
const tier1CompleteSql = sql<boolean>`exists (
  select 1 from assessments a where a.company_id = ${companiesTable.id}
)`;

// --- GET /tier-summary -------------------------------------------------------

router.get("/tier-summary", async (req, res) => {
  const parsed = ListAdminTierSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
    return;
  }
  const { limit, offset, sortBy, sortDir, firmSlug, tier3Status } = parsed.data;

  try {
    const where = and(
      firmSlug ? eq(firmsTable.slug, firmSlug) : undefined,
      tier3Status ? eq(companiesTable.tier3Status, tier3Status) : undefined,
    );

    const orderExpr =
      sortBy === "tenant"
        ? sql`${firmsTable.name}`
        : sortBy === "tier2"
          ? connectedCountSql
          : sortBy === "tier3"
            ? sql`${companiesTable.tier3Status}`
            : sortBy === "disputes"
              ? pendingDisputesSql
              : sql`${companiesTable.name}`;
    const order = sortDir === "desc" ? desc(orderExpr) : orderExpr;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(companiesTable)
      .innerJoin(firmsTable, eq(companiesTable.firmId, firmsTable.id))
      .where(where);

    const rows = await db
      .select({
        companyId: companiesTable.id,
        companyName: companiesTable.name,
        companySlug: companiesTable.slug,
        companyStatus: companiesTable.status,
        firmName: firmsTable.name,
        firmSlug: firmsTable.slug,
        tier1Complete: tier1CompleteSql,
        tier2Raw: companiesTable.tier2Status,
        tier3Status: companiesTable.tier3Status,
        pendingDisputes: pendingDisputesSql,
      })
      .from(companiesTable)
      .innerJoin(firmsTable, eq(companiesTable.firmId, firmsTable.id))
      .where(where)
      // Stable secondary key so pagination never duplicates/drops rows.
      .orderBy(order, companiesTable.id)
      .limit(limit)
      .offset(offset);

    res.json({
      total: countRow?.total ?? 0,
      limit,
      offset,
      rows: rows.map((r) => ({
        companyId: r.companyId,
        companyName: r.companyName,
        companySlug: r.companySlug,
        companyStatus: r.companyStatus,
        firmName: r.firmName,
        firmSlug: r.firmSlug,
        tier1Complete: r.tier1Complete,
        tier2: tier2Snapshot(r.tier2Raw),
        tier3Status: r.tier3Status as Tier3Status,
        pendingDisputes: r.pendingDisputes,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load tier summary");
    res.status(500).json({ error: "Failed to load tier summary" });
  }
});

// --- PATCH /companies/:companyId/tier2 --------------------------------------

router.patch("/companies/:companyId/tier2", async (req, res) => {
  const companyId = Number(req.params.companyId);
  const parsed = UpdateAdminCompanyTier2Body.safeParse(req.body);
  if (!Number.isInteger(companyId) || companyId <= 0 || !parsed.success) {
    res.status(400).json({ error: "Invalid company id or body" });
    return;
  }
  const { connector, status, note } = parsed.data;

  try {
    const company = await loadCompany(companyId);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    const current = tier2Snapshot(company.tier2Status);
    const oldValue = current[connector as Tier2ConnectorType];
    const nextMap: Tier2Status = {
      ...((company.tier2Status ?? {}) as Tier2Status),
      [connector]: status,
    };

    const auditRowId = await db.transaction(async (tx) => {
      await tx
        .update(companiesTable)
        .set({ tier2Status: nextMap })
        .where(eq(companiesTable.id, companyId));
      const [audit] = await tx
        .insert(tierAuditLogTable)
        .values({
          companyId,
          field: `tier2_status.${connector}`,
          oldValue,
          newValue: status,
          editor: adminEditor(req.user),
          note: note ?? null,
        })
        .returning({ id: tierAuditLogTable.id });
      return audit.id;
    });

    req.log.info({ companyId, connector, status, auditRowId }, "Tier 2 connector status updated");
    res.json(mutationResult(companyId, nextMap, company.tier3Status, auditRowId));
  } catch (err) {
    req.log.error({ err }, "Failed to update tier 2 status");
    res.status(500).json({ error: "Failed to update tier 2 status" });
  }
});

// --- PATCH /companies/:companyId/tier3 --------------------------------------

router.patch("/companies/:companyId/tier3", async (req, res) => {
  const companyId = Number(req.params.companyId);
  const parsed = UpdateAdminCompanyTier3Body.safeParse(req.body);
  if (!Number.isInteger(companyId) || companyId <= 0 || !parsed.success) {
    res.status(400).json({ error: "Invalid company id or body" });
    return;
  }
  const { status, note } = parsed.data;

  try {
    const company = await loadCompany(companyId);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    const auditRowId = await db.transaction(async (tx) => {
      await tx
        .update(companiesTable)
        .set({ tier3Status: status })
        .where(eq(companiesTable.id, companyId));
      const [audit] = await tx
        .insert(tierAuditLogTable)
        .values({
          companyId,
          field: "tier3_status",
          oldValue: company.tier3Status,
          newValue: status,
          editor: adminEditor(req.user),
          note: note ?? null,
        })
        .returning({ id: tierAuditLogTable.id });
      return audit.id;
    });

    req.log.info({ companyId, status, auditRowId }, "Tier 3 status updated directly by admin");
    res.json(mutationResult(companyId, company.tier2Status, status, auditRowId));
  } catch (err) {
    req.log.error({ err }, "Failed to update tier 3 status");
    res.status(500).json({ error: "Failed to update tier 3 status" });
  }
});

// --- POST /companies/:companyId/tier3-disputes -------------------------------

router.post("/companies/:companyId/tier3-disputes", async (req, res) => {
  const companyId = Number(req.params.companyId);
  const parsed = CreateAdminTierDisputeBody.safeParse(req.body);
  if (!Number.isInteger(companyId) || companyId <= 0 || !parsed.success) {
    res.status(400).json({ error: "Invalid company id or body" });
    return;
  }

  try {
    const company = await loadCompany(companyId);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    // Deliberately NO write to companies here — a dispute only flags.
    const [dispute] = await db
      .insert(tierDisputesTable)
      .values({
        companyId,
        field: parsed.data.field,
        reason: parsed.data.reason,
        proposedValue: parsed.data.proposedValue ?? null,
        status: "pending",
      })
      .returning();

    req.log.info({ companyId, disputeId: dispute.id }, "Tier 3 dispute flagged for admin review");
    res.status(201).json(await toDisputeRecord(dispute.id));
  } catch (err) {
    req.log.error({ err }, "Failed to create tier dispute");
    res.status(500).json({ error: "Failed to create tier dispute" });
  }
});

// --- GET /tier-disputes -------------------------------------------------------

async function toDisputeRecord(disputeId: number) {
  const [row] = await db
    .select({
      id: tierDisputesTable.id,
      companyId: tierDisputesTable.companyId,
      companyName: companiesTable.name,
      firmSlug: firmsTable.slug,
      field: tierDisputesTable.field,
      reason: tierDisputesTable.reason,
      proposedValue: tierDisputesTable.proposedValue,
      status: tierDisputesTable.status,
      createdAt: tierDisputesTable.createdAt,
      resolvedAt: tierDisputesTable.resolvedAt,
      resolvedBy: tierDisputesTable.resolvedBy,
      resolutionNote: tierDisputesTable.resolutionNote,
    })
    .from(tierDisputesTable)
    .innerJoin(companiesTable, eq(tierDisputesTable.companyId, companiesTable.id))
    .innerJoin(firmsTable, eq(companiesTable.firmId, firmsTable.id))
    .where(eq(tierDisputesTable.id, disputeId))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

router.get("/tier-disputes", async (req, res) => {
  const parsed = ListAdminTierDisputesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const { status, companyId } = parsed.data;

  try {
    const rows = await db
      .select({
        id: tierDisputesTable.id,
        companyId: tierDisputesTable.companyId,
        companyName: companiesTable.name,
        firmSlug: firmsTable.slug,
        field: tierDisputesTable.field,
        reason: tierDisputesTable.reason,
        proposedValue: tierDisputesTable.proposedValue,
        status: tierDisputesTable.status,
        createdAt: tierDisputesTable.createdAt,
        resolvedAt: tierDisputesTable.resolvedAt,
        resolvedBy: tierDisputesTable.resolvedBy,
        resolutionNote: tierDisputesTable.resolutionNote,
      })
      .from(tierDisputesTable)
      .innerJoin(companiesTable, eq(tierDisputesTable.companyId, companiesTable.id))
      .innerJoin(firmsTable, eq(companiesTable.firmId, firmsTable.id))
      .where(
        and(
          status ? eq(tierDisputesTable.status, status) : undefined,
          companyId ? eq(tierDisputesTable.companyId, companyId) : undefined,
        ),
      )
      .orderBy(desc(tierDisputesTable.createdAt), desc(tierDisputesTable.id));

    res.json(
      rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list tier disputes");
    res.status(500).json({ error: "Failed to list tier disputes" });
  }
});

// --- POST /tier-disputes/:disputeId/resolve ----------------------------------

router.post("/tier-disputes/:disputeId/resolve", async (req, res) => {
  const disputeId = Number(req.params.disputeId);
  const parsed = ResolveAdminTierDisputeBody.safeParse(req.body);
  if (!Number.isInteger(disputeId) || disputeId <= 0 || !parsed.success) {
    res.status(400).json({ error: "Invalid dispute id or body" });
    return;
  }
  const { action, newValue, note } = parsed.data;

  try {
    const [dispute] = await db
      .select()
      .from(tierDisputesTable)
      .where(eq(tierDisputesTable.id, disputeId))
      .limit(1);
    if (!dispute) {
      res.status(404).json({ error: "Dispute not found" });
      return;
    }
    if (dispute.status !== "pending") {
      res.status(409).json({ error: `Dispute is already ${dispute.status}` });
      return;
    }
    // NOTE: this precheck is advisory only (fast 404/409). The authoritative
    // claim happens inside each transaction below via a conditional
    // UPDATE ... WHERE status='pending' RETURNING — two concurrent resolves
    // cannot both win; the loser gets a 409.
    const company = await loadCompany(dispute.companyId);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    const editor = adminEditor(req.user);
    const now = new Date();

    if (action === "reject") {
      const auditRowId = await db.transaction(async (tx) => {
        // Atomically claim the pending row — concurrency-safe.
        const claimed = await tx
          .update(tierDisputesTable)
          .set({ status: "rejected", resolvedAt: now, resolvedBy: editor, resolutionNote: note ?? null })
          .where(and(eq(tierDisputesTable.id, disputeId), eq(tierDisputesTable.status, "pending")))
          .returning({ id: tierDisputesTable.id });
        if (claimed.length === 0) return null;
        // Full audit trail either way: a reject writes a row too, with
        // old == new (nothing changed) so the trail shows the decision.
        const [audit] = await tx
          .insert(tierAuditLogTable)
          .values({
            companyId: dispute.companyId,
            field: dispute.field,
            oldValue: company.tier3Status,
            newValue: company.tier3Status,
            editor,
            note: `Dispute rejected. Dispute reason: ${dispute.reason}${note ? ` | Resolution note: ${note}` : ""}`,
            disputeId,
          })
          .returning({ id: tierAuditLogTable.id });
        return audit.id;
      });
      if (auditRowId === null) {
        res.status(409).json({ error: "Dispute was already resolved by another admin" });
        return;
      }
      res.json(mutationResult(dispute.companyId, company.tier2Status, company.tier3Status, auditRowId));
      return;
    }

    // action === "apply"
    if (dispute.field !== "tier3_status") {
      res.status(422).json({
        error: `Auto-apply only supports field "tier3_status" today; "${dispute.field}" must be corrected manually, then reject this dispute with a note`,
      });
      return;
    }
    const applyValue = (newValue ?? dispute.proposedValue) as Tier3Status | null;
    if (!applyValue || !["unconfirmed", "portco_confirmed", "pe_confirmed"].includes(applyValue)) {
      res.status(422).json({ error: "apply requires a valid newValue (or a dispute with a valid proposedValue)" });
      return;
    }

    const auditRowId = await db.transaction(async (tx) => {
      // Atomically claim the pending row FIRST — if another admin already
      // resolved it, nothing else in this transaction runs.
      const claimed = await tx
        .update(tierDisputesTable)
        .set({ status: "applied", resolvedAt: now, resolvedBy: editor, resolutionNote: note ?? null })
        .where(and(eq(tierDisputesTable.id, disputeId), eq(tierDisputesTable.status, "pending")))
        .returning({ id: tierDisputesTable.id });
      if (claimed.length === 0) return null;
      await tx
        .update(companiesTable)
        .set({ tier3Status: applyValue })
        .where(eq(companiesTable.id, dispute.companyId));
      const [audit] = await tx
        .insert(tierAuditLogTable)
        .values({
          companyId: dispute.companyId,
          field: "tier3_status",
          oldValue: company.tier3Status,
          newValue: applyValue,
          editor,
          note: `Dispute applied. Dispute reason: ${dispute.reason}${note ? ` | Resolution note: ${note}` : ""}`,
          disputeId,
        })
        .returning({ id: tierAuditLogTable.id });
      return audit.id;
    });
    if (auditRowId === null) {
      res.status(409).json({ error: "Dispute was already resolved by another admin" });
      return;
    }

    req.log.info({ disputeId, companyId: dispute.companyId, applyValue, auditRowId }, "Tier dispute applied");
    res.json(mutationResult(dispute.companyId, company.tier2Status, applyValue, auditRowId));
  } catch (err) {
    req.log.error({ err }, "Failed to resolve tier dispute");
    res.status(500).json({ error: "Failed to resolve tier dispute" });
  }
});

// --- GET /companies/:companyId/tier-audit ------------------------------------

router.get("/companies/:companyId/tier-audit", async (req, res) => {
  const companyId = Number(req.params.companyId);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(tierAuditLogTable)
      .where(eq(tierAuditLogTable.companyId, companyId))
      .orderBy(desc(tierAuditLogTable.createdAt), desc(tierAuditLogTable.id));
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list tier audit rows");
    res.status(500).json({ error: "Failed to list tier audit rows" });
  }
});

export default router;
