// ---------------------------------------------------------------------------
// Engagement Entry Step 2 — admin surface for portco/PE confirmation.
//
// Mounted INSIDE the /admin router (after requireAdminAuth) — same pattern
// as adminOutcomes.ts / adminCalibration.ts.
//
// Confirmation Status is the EXISTING companies.tier3_status column
// (unconfirmed | portco_confirmed | pe_confirmed). This file only READS it;
// admin overrides keep going through PATCH /admin/companies/:id/tier3 in
// adminTiers.ts (which writes the mandatory tier_audit_log row). The public
// confirm flow (routes/confirmations.ts) is the only other writer, and it
// writes the same audit row in the same transaction.
//
// The raw link token is returned exactly ONCE from the create endpoint;
// only its SHA-256 hash is stored (same pattern as tenant login tokens).
// ---------------------------------------------------------------------------
import { randomBytes, createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  companiesTable,
  confirmationRequestsTable,
  CONFIRMATION_RECIPIENT_ROLES,
  type ConfirmationRequest,
} from "@workspace/db";
import { CreateAdminConfirmationRequestBody } from "@workspace/api-zod";
import { computeFlaggedPillars } from "../lib/confirmationFlags.js";

const router: IRouter = Router();

const DEFAULT_EXPIRY_DAYS = 14;

export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseCompanyId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requestJson(row: ConfirmationRequest) {
  const derivedStatus =
    row.status === "pending" && row.expiresAt.getTime() < Date.now() ? "expired" : row.status;
  return {
    id: row.id,
    companyId: row.companyId,
    recipientRole: row.recipientRole,
    flaggedPillars: row.flaggedPillars,
    status: derivedStatus,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
  };
}

// Public origin for the shareable link. Prefer the request's own origin
// (works in dev preview and prod); fall back to REPLIT_DOMAINS.
function linkOrigin(req: { headers: Record<string, unknown> }): string {
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() || "https";
  const host = (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim()
    || (req.headers.host as string);
  if (host) return `${proto}://${host}`;
  const domains = process.env.REPLIT_DOMAINS;
  const first = domains?.split(",")[0]?.trim();
  return first ? `https://${first}` : "";
}

// --- GET /companies/:companyId/confirmation ----------------------------------

router.get("/companies/:companyId/confirmation", async (req, res) => {
  const companyId = parseCompanyId(req.params.companyId);
  if (companyId === null) {
    res.status(400).json({ error: "Invalid company id" });
    return;
  }
  const [company] = await db
    .select({ id: companiesTable.id, name: companiesTable.name, tier3Status: companiesTable.tier3Status })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const flaggedPillars = (await computeFlaggedPillars(companyId)) ?? [];
  const requests = await db
    .select()
    .from(confirmationRequestsTable)
    .where(eq(confirmationRequestsTable.companyId, companyId))
    .orderBy(desc(confirmationRequestsTable.id));
  res.json({
    companyId,
    companyName: company.name,
    confirmationStatus: company.tier3Status,
    flaggedPillars,
    requests: requests.map(requestJson),
  });
});

// --- POST /companies/:companyId/confirmation-requests -------------------------

router.post("/companies/:companyId/confirmation-requests", async (req, res) => {
  const companyId = parseCompanyId(req.params.companyId);
  const parsed = CreateAdminConfirmationRequestBody.safeParse(req.body);
  if (companyId === null || !parsed.success) {
    res.status(400).json({ error: "Invalid company id or body" });
    return;
  }
  const { recipientRole, expiresInDays } = parsed.data;
  if (!(CONFIRMATION_RECIPIENT_ROLES as readonly string[]).includes(recipientRole)) {
    res.status(400).json({ error: "Invalid recipient role" });
    return;
  }
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  const flaggedPillars = await computeFlaggedPillars(companyId);
  if (flaggedPillars === null) {
    res.status(409).json({ error: "Company has no scored assessment yet" });
    return;
  }
  if (flaggedPillars.length === 0) {
    res.status(409).json({ error: "No flagged pillars to confirm — every pillar has a confident score" });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (expiresInDays ?? DEFAULT_EXPIRY_DAYS) * 24 * 60 * 60 * 1000);
  const [row] = await db
    .insert(confirmationRequestsTable)
    .values({
      companyId,
      tokenHash: hashConfirmationToken(token),
      recipientRole,
      flaggedPillars,
      expiresAt,
      createdBy: req.user?.email ?? "unknown-admin",
    })
    .returning();

  const origin = linkOrigin(req);
  req.log.info(
    { companyId, requestId: row.id, recipientRole },
    "Confirmation request link created",
  );
  res.status(201).json({
    request: requestJson(row),
    link: `${origin}/confirm/${token}`,
  });
});

// --- POST /confirmation-requests/:requestId/revoke ----------------------------

router.post("/confirmation-requests/:requestId/revoke", async (req, res) => {
  const requestId = parseCompanyId(req.params.requestId);
  if (requestId === null) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }
  // Conditional claim: only a pending row can be revoked (no precheck race).
  const [row] = await db
    .update(confirmationRequestsTable)
    .set({ status: "revoked" })
    .where(
      and(
        eq(confirmationRequestsTable.id, requestId),
        eq(confirmationRequestsTable.status, "pending"),
      ),
    )
    .returning();
  if (!row) {
    const [existing] = await db
      .select({ id: confirmationRequestsTable.id })
      .from(confirmationRequestsTable)
      .where(eq(confirmationRequestsTable.id, requestId))
      .limit(1);
    res
      .status(existing ? 409 : 404)
      .json({ error: existing ? "Request is not pending" : "Request not found" });
    return;
  }
  res.json(requestJson(row));
});

export default router;
