// ---------------------------------------------------------------------------
// Tenant-portal magic-link auth routes (STG-only rollout; see tenantAuth.ts
// for the scope boundary). No passwords anywhere. Endpoints:
//   POST /api/tenant-auth/request-link {email, firmSlug}
//   POST /api/tenant-auth/verify       {token}
//   GET  /api/tenant-auth/session
//   POST /api/tenant-auth/logout
// request-link ALWAYS returns 200 for a gated firm regardless of allowlist
// membership — no account enumeration via response differences.
// ---------------------------------------------------------------------------
import { Router, type IRouter } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, firmsTable, tenantLoginTokensTable } from "@workspace/db";
import {
  LOGIN_GATED_SLUGS,
  LOGIN_TOKEN_TTL_MS,
  generateLoginToken,
  hashLoginToken,
  isAllowedTenantEmail,
  getTenantSession,
  signTenantSession,
  setTenantSessionCookie,
  clearTenantSessionCookie,
} from "../lib/tenantAuth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function requestOrigin(req: { headers: Record<string, unknown>; protocol: string }): string | null {
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"];
  if (typeof host !== "string" || !host) return null;
  const proto = (typeof req.headers["x-forwarded-proto"] === "string" && req.headers["x-forwarded-proto"]) || "https";
  return `${proto}://${host}`;
}

router.post("/request-link", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const firmSlug = typeof req.body?.firmSlug === "string" ? req.body.firmSlug.trim().toLowerCase() : "";

  if (!email || !email.includes("@") || !firmSlug) {
    res.status(400).json({ error: "A valid email and firm are required" });
    return;
  }
  if (!LOGIN_GATED_SLUGS.has(firmSlug)) {
    // Only login-gated tenants have a login flow at all in this pass.
    res.status(404).json({ error: "This portal does not use email sign-in" });
    return;
  }

  try {
    // Uniform 200 below this point — allowlist misses are indistinguishable.
    if (isAllowedTenantEmail(firmSlug, email)) {
      const [firm] = await db
        .select({ id: firmsTable.id })
        .from(firmsTable)
        .where(eq(firmsTable.slug, firmSlug))
        .limit(1);
      if (firm) {
        const { token, tokenHash } = generateLoginToken();
        await db.insert(tenantLoginTokensTable).values({
          firmId: firm.id,
          email,
          tokenHash,
          expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
        });

        const origin = requestOrigin(req);
        const link = `${origin ?? ""}/${firmSlug}/portfolio?login_token=${token}`;
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          logger.error("RESEND_API_KEY not set — cannot send tenant login link");
        } else {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "INVESQ <onboarding@resend.dev>",
              to: [email],
              subject: "Your INVESQ portal sign-in link",
              text: [
                "Use the link below to sign in to your INVESQ portfolio portal.",
                "",
                link,
                "",
                "This link is valid for 15 minutes and can be used once.",
                "If you did not request it, you can ignore this email.",
              ].join("\n"),
            }),
          });
          if (!resp.ok) {
            logger.error({ status: resp.status, body: (await resp.text()).slice(0, 300) }, "Resend tenant login email failed");
          } else {
            logger.info({ firmSlug }, "Tenant login link sent");
          }
        }
      }
    } else {
      logger.info({ firmSlug }, "Tenant login link requested for non-allowlisted email (no-op)");
    }
    res.json({ ok: true, message: "If that email has access, a sign-in link is on its way." });
  } catch (err) {
    req.log.error({ err }, "tenant request-link failed");
    res.status(500).json({ error: "Failed to process sign-in request" });
  }
});

router.post("/verify", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!/^[0-9a-f]{64}$/.test(token)) {
    res.status(400).json({ error: "Invalid sign-in link" });
    return;
  }

  try {
    // Atomic single-use burn: only an unused, unexpired row can be claimed.
    const [row] = await db
      .update(tenantLoginTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(tenantLoginTokensTable.tokenHash, hashLoginToken(token)),
          isNull(tenantLoginTokensTable.usedAt),
          gt(tenantLoginTokensTable.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!row) {
      res.status(401).json({ error: "This sign-in link is invalid or has expired. Request a new one." });
      return;
    }

    const [firm] = await db
      .select({ id: firmsTable.id, slug: firmsTable.slug })
      .from(firmsTable)
      .where(eq(firmsTable.id, row.firmId))
      .limit(1);
    if (!firm || !LOGIN_GATED_SLUGS.has(firm.slug)) {
      res.status(401).json({ error: "This portal no longer uses email sign-in" });
      return;
    }
    // Re-check the allowlist at verify time so removing a contact takes
    // effect immediately even for links already in their inbox.
    if (!isAllowedTenantEmail(firm.slug, row.email)) {
      res.status(403).json({ error: "This email no longer has access" });
      return;
    }

    setTenantSessionCookie(res, signTenantSession({ firmId: firm.id, firmSlug: firm.slug, email: row.email }));
    logger.info({ firmSlug: firm.slug }, "Tenant session established via magic link");
    res.json({ ok: true, firmSlug: firm.slug });
  } catch (err) {
    req.log.error({ err }, "tenant verify failed");
    res.status(500).json({ error: "Failed to verify sign-in link" });
  }
});

router.get("/session", (req, res) => {
  const session = getTenantSession(req);
  if (!session) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, firmSlug: session.firmSlug, email: session.email, expiresAt: new Date(session.exp).toISOString() });
});

router.post("/logout", (_req, res) => {
  clearTenantSessionCookie(res);
  res.json({ ok: true });
});

export default router;
