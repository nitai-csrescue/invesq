// ---------------------------------------------------------------------------
// Engagement Entry Step 2 — PUBLIC confirmation-ask endpoints.
//
// This is the ONE deliberately external-facing surface of the confirmation
// flow (the ask page a portco CS lead / PE operating partner opens from the
// link an admin sent them). Security model:
//   - No portal login. Access is scoped by an unguessable 32-byte token;
//     only its SHA-256 hash is stored, and lookups are hash-equality only.
//   - A token resolves to EXACTLY ONE company. The payload contains the
//     company name and its flagged pillars — never firm names, other
//     companies, ids usable elsewhere, or any enumeration surface.
//   - Requests expire (default 14 days) and are single-submission
//     (pending -> submitted claimed atomically inside the write tx).
//
// Copy policy (enforced here by what we EMIT, not by trusting the client):
// forward-looking, structural framing only. The payload carries pillar
// labels and neutral prompts — no Glassdoor/employee-sentiment content, no
// GRR/NRR figures, no judgments of named individuals.
//
// Write path on submission (single transaction):
//   1. claim the request row (pending -> submitted),
//   2. insert ONE calibration_observations row — the confirmed/corrected
//      values become the "actual" against the locked "predicted" in the
//      Calibration Ledger (source portco_confirmation / pe_confirmation),
//   3. upgrade companies.tier3_status (Confirmation Status) per recipient
//      role + write the mandatory tier_audit_log row (same contract as the
//      admin tier routes). pe_confirmed is never downgraded to
//      portco_confirmed.
// ---------------------------------------------------------------------------
import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  companiesTable,
  confirmationRequestsTable,
  calibrationObservationsTable,
  tierAuditLogTable,
} from "@workspace/db";
import { hashConfirmationToken } from "./adminConfirmations.js";
import { PILLAR_LABELS, type FlaggedPillar } from "../lib/confirmationFlags.js";

const router: IRouter = Router();

const TOKEN_RE = /^[0-9a-f]{64}$/;

// Qualitative options shown on the ask page; values map to calibration
// pillar scores. Forward-looking, structural wording only.
const SCORE_OPTIONS = [
  { value: "2", label: "Fully in place today" },
  { value: "1", label: "Partially in place / being built" },
  { value: "0", label: "Not in place yet" },
  { value: "NA", label: "Not applicable to this business" },
] as const;

const SubmissionBody = z.object({
  answers: z
    .array(
      z.object({
        pillarId: z.string().min(1).max(40),
        // "confirm" = our flagged read stands as-is; "correct" = respondent
        // supplies the real state of the pillar.
        response: z.enum(["confirm", "correct"]),
        correctedScore: z.enum(["0", "1", "2", "NA"]).optional(),
        note: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(8),
  respondentName: z.string().max(120).optional(),
  respondentRole: z.string().max(120).optional(),
});

async function loadByToken(rawToken: string) {
  if (!TOKEN_RE.test(rawToken)) return null;
  const [row] = await db
    .select()
    .from(confirmationRequestsTable)
    .where(eq(confirmationRequestsTable.tokenHash, hashConfirmationToken(rawToken)))
    .limit(1);
  return row ?? null;
}

// --- GET /:token — the ask payload (single company, nothing else) ------------

router.get("/:token", async (req, res) => {
  const request = await loadByToken(req.params.token);
  // Uniform 404 for unknown, malformed, and revoked tokens — no oracle.
  if (!request || request.status === "revoked") {
    res.status(404).json({ error: "This confirmation link is not valid." });
    return;
  }
  if (request.status === "submitted") {
    res.status(410).json({ error: "already_submitted" });
    return;
  }
  if (request.expiresAt.getTime() < Date.now()) {
    res.status(410).json({ error: "expired" });
    return;
  }
  const [company] = await db
    .select({ name: companiesTable.name })
    .from(companiesTable)
    .where(eq(companiesTable.id, request.companyId))
    .limit(1);
  if (!company) {
    res.status(404).json({ error: "This confirmation link is not valid." });
    return;
  }
  const flagged = request.flaggedPillars as FlaggedPillar[];
  res.json({
    companyName: company.name,
    recipientRole: request.recipientRole,
    expiresAt: request.expiresAt.toISOString(),
    scoreOptions: SCORE_OPTIONS,
    // Neutral, forward-looking framing only.
    pillars: flagged.map((f) => ({
      pillarId: f.pillarId,
      label: PILLAR_LABELS[f.pillarId] ?? f.label,
      prompt:
        "Our diagnostic did not have enough information to assess this area with confidence. How would you describe it today?",
    })),
  });
});

// --- POST /:token — submit confirmations/corrections --------------------------

router.post("/:token", async (req, res) => {
  const request = await loadByToken(req.params.token);
  if (!request || request.status === "revoked") {
    res.status(404).json({ error: "This confirmation link is not valid." });
    return;
  }
  if (request.status === "submitted") {
    res.status(410).json({ error: "already_submitted" });
    return;
  }
  if (request.expiresAt.getTime() < Date.now()) {
    res.status(410).json({ error: "expired" });
    return;
  }
  const parsed = SubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid submission" });
    return;
  }
  const flagged = request.flaggedPillars as FlaggedPillar[];
  const flaggedIds = new Set(flagged.map((f) => f.pillarId));
  const seen = new Set<string>();
  const observedPillars: Record<string, string> = {};
  for (const answer of parsed.data.answers) {
    // Only the pillars this request flagged may be written — the token
    // scopes not just the company but the exact question set.
    if (!flaggedIds.has(answer.pillarId) || seen.has(answer.pillarId)) {
      res.status(400).json({ error: "Invalid submission" });
      return;
    }
    seen.add(answer.pillarId);
    if (answer.response === "correct") {
      if (!answer.correctedScore) {
        res.status(400).json({ error: "Invalid submission" });
        return;
      }
      observedPillars[answer.pillarId] = answer.correctedScore;
    } else {
      // Confirming the flagged read: the predicted value (typically NA)
      // stands as the observed actual.
      const predicted = flagged.find((f) => f.pillarId === answer.pillarId)?.predicted;
      observedPillars[answer.pillarId] = predicted ?? "NA";
    }
  }

  const targetStatus =
    request.recipientRole === "pe_operating_partner" ? "pe_confirmed" : "portco_confirmed";
  const source =
    request.recipientRole === "pe_operating_partner" ? "pe_confirmation" : "portco_confirmation";
  const respondent = [parsed.data.respondentName, parsed.data.respondentRole]
    .filter(Boolean)
    .join(", ");
  type Answer = z.infer<typeof SubmissionBody>["answers"][number];
  const noteParts = parsed.data.answers
    .filter((a: Answer) => a.note?.trim())
    .map((a: Answer) => `${a.pillarId}: ${a.note!.trim()}`);

  try {
    const ok = await db.transaction(async (tx) => {
      // Atomic single-submission claim — the 410 loser never double-writes.
      const [claimed] = await tx
        .update(confirmationRequestsTable)
        .set({
          status: "submitted",
          respondedAt: new Date(),
          response: parsed.data.answers,
        })
        .where(
          and(
            eq(confirmationRequestsTable.id, request.id),
            eq(confirmationRequestsTable.status, "pending"),
            // Re-check expiry inside the claim itself at DATABASE time — a
            // link that expires between the precheck and this UPDATE must
            // lose here and produce zero writes.
            gte(confirmationRequestsTable.expiresAt, sql`now()`),
          ),
        )
        .returning({ id: confirmationRequestsTable.id });
      if (!claimed) return false;

      // Write-through: confirmed/corrected values are the Calibration
      // Ledger "actual" against the locked "predicted".
      await tx.insert(calibrationObservationsTable).values({
        companyId: request.companyId,
        pillars: observedPillars,
        observedAt: new Date(),
        source,
        note: [respondent ? `Respondent: ${respondent}` : null, ...noteParts]
          .filter(Boolean)
          .join(" | ") || null,
        createdBy: `confirmation_request:${request.id}`,
      });

      // Confirmation Status upgrade + mandatory audit row, same tx.
      const [company] = await tx
        .select({ tier3Status: companiesTable.tier3Status })
        .from(companiesTable)
        .where(eq(companiesTable.id, request.companyId))
        .limit(1);
      const current = company?.tier3Status ?? "unconfirmed";
      // Never downgrade pe_confirmed to portco_confirmed.
      const shouldUpgrade = !(current === "pe_confirmed" && targetStatus === "portco_confirmed");
      if (shouldUpgrade && current !== targetStatus) {
        await tx
          .update(companiesTable)
          .set({ tier3Status: targetStatus })
          .where(eq(companiesTable.id, request.companyId));
        await tx.insert(tierAuditLogTable).values({
          companyId: request.companyId,
          field: "tier3_status",
          oldValue: current,
          newValue: targetStatus,
          editor: `external:${source}:request_${request.id}`,
          note: respondent ? `Confirmed via link by ${respondent}` : "Confirmed via link",
        });
      }
      return true;
    });

    if (!ok) {
      // The claim can lose either to a concurrent submission or to expiry
      // crossing during the request; report the accurate reason.
      res.status(410).json({
        error: request.expiresAt.getTime() < Date.now() ? "expired" : "already_submitted",
      });
      return;
    }
    req.log.info(
      { requestId: request.id, companyId: request.companyId, pillars: Object.keys(observedPillars) },
      "Confirmation submitted via public link",
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, requestId: request.id }, "Confirmation submission failed");
    res.status(500).json({ error: "Something went wrong saving your response. Please try again." });
  }
});

export default router;
