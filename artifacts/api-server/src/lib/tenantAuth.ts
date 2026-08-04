// ---------------------------------------------------------------------------
// Tenant-portal auth (magic-link / email OTP). STG-only rollout:
// LOGIN_GATED_SLUGS is the single scope boundary — every other tenant
// (pamlico, pamlico-capital, raviga, longarc, solen, pipeline firms) has no
// login and is untouched by everything in this module.
//
// No passwords anywhere. Flow:
//   1. POST /api/tenant-auth/request-link {email, firmSlug} — if the email is
//      on the allowlist, a one-time token (hash stored in
//      tenant_login_tokens, 15 min TTL) is emailed via Resend.
//   2. Clicking the link hits the SPA, which POSTs /api/tenant-auth/verify;
//      the server burns the token and sets a SHORT-LIVED STATELESS
//      HMAC-SIGNED session cookie (httpOnly, Secure, SameSite=Lax) scoped to
//      that firm. Nothing is stored client-side outside the httpOnly cookie.
//
// Allowlist: STG_TENANT_EMAILS secret (same "Name <email>" / bare-email
// comma-separated format as VALIDATOR_EMAILS). Until it is set, it falls
// back to VALIDATOR_EMAILS (Nitai + Jay) so the initial contacts work with
// zero new secret setup; add real STG partner contacts later by setting
// STG_TENANT_EMAILS — no code change or user-management UI needed.
// ---------------------------------------------------------------------------
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

/**
 * Firm slugs whose tenant portal requires login. THE scope boundary.
 *
 * TEMPORARY ROLLBACK (2026-08-04): "stg" removed to disable the CQ-14
 * magic-link login screen while Resend email delivery is sandbox-limited.
 * All login machinery (tenant_login_tokens, request/verify endpoints,
 * session cookie) is intentionally left in place, unused — re-add "stg"
 * here to re-enable. RLS policies are NOT affected by this constant.
 */
export const LOGIN_GATED_SLUGS: ReadonlySet<string> = new Set([]);

export const TENANT_SESSION_COOKIE = "tenant_sid";
/** Session lifetime: 12 hours ("a few hours to a day"). */
export const TENANT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
/** Magic-link token lifetime: 15 minutes. */
export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set for tenant sessions");
  return secret;
}

// ── Allowlist ───────────────────────────────────────────────────────────────

export interface TenantContact {
  email: string;
  name: string;
}

// Same parsing rules as validators.ts, but WITHOUT the admin-domain gate:
// STG partner-side contacts will not be @csrescue.com addresses.
export function getTenantAllowlist(firmSlug: string): TenantContact[] {
  if (!LOGIN_GATED_SLUGS.has(firmSlug)) return [];
  const raw = process.env.STG_TENANT_EMAILS ?? process.env.VALIDATOR_EMAILS;
  if (!raw || !raw.trim()) return [];
  const seen = new Set<string>();
  const contacts: TenantContact[] = [];
  for (const part of raw.split(",")) {
    const entry = part.trim();
    if (!entry) continue;
    let name: string;
    let email: string;
    const angle = entry.match(/^(.*?)<([^>]+)>$/);
    if (angle) {
      name = angle[1].trim();
      email = angle[2].trim().toLowerCase();
    } else {
      email = entry.toLowerCase();
      name = "";
    }
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    contacts.push({ email, name: name || email.split("@")[0] });
  }
  return contacts;
}

export function isAllowedTenantEmail(firmSlug: string, email: string): boolean {
  const lower = email.trim().toLowerCase();
  return getTenantAllowlist(firmSlug).some((c) => c.email === lower);
}

// ── Magic-link token ────────────────────────────────────────────────────────

export function generateLoginToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashLoginToken(token) };
}

export function hashLoginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ── Stateless signed session token ──────────────────────────────────────────
// payload = base64url(JSON{firmId, firmSlug, email, exp}); cookie value is
// "<payload>.<hmac-sha256(payload, SESSION_SECRET)>". httpOnly cookie only —
// never handed to client JS, never stored in localStorage.

export interface TenantSession {
  firmId: number;
  firmSlug: string;
  email: string;
  exp: number; // epoch ms
}

export function signTenantSession(session: Omit<TenantSession, "exp">): string {
  const payload: TenantSession = { ...session, exp: Date.now() + TENANT_SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyTenantSessionToken(token: string | undefined): TenantSession | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TenantSession;
    if (
      typeof payload.firmId !== "number" ||
      typeof payload.firmSlug !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Request/response helpers ────────────────────────────────────────────────

export function getTenantSession(req: Request): TenantSession | null {
  return verifyTenantSessionToken(req.cookies?.[TENANT_SESSION_COOKIE]);
}

export function setTenantSessionCookie(res: Response, token: string): void {
  res.cookie(TENANT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TENANT_SESSION_TTL_MS,
  });
}

export function clearTenantSessionCookie(res: Response): void {
  res.clearCookie(TENANT_SESSION_COOKIE, { path: "/" });
}
