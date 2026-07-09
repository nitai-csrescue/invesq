import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

// /admin signs in directly against Google's OIDC endpoint (not generic
// Replit OIDC) so the login screen shows Google's real account chooser,
// letting each admin pick whichever Google account they want to use.
export const ISSUER_URL =
  process.env.GOOGLE_OIDC_ISSUER_URL ?? "https://accounts.google.com";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

// /admin is restricted to the csrescue.com Google Workspace domain. Enforced
// as an email-domain allowlist on the Google ID token's `email` claim.
export const ALLOWED_EMAIL_DOMAIN = "@csrescue.com";

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// Thrown when GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET haven't been configured
// yet. Callers should catch this and return a clear, non-crashing response —
// it must never take down the whole server, since every other route (and
// the rest of the app) has nothing to do with admin login.
export class GoogleAuthNotConfiguredError extends Error {
  constructor() {
    super(
      "Google OAuth is not configured yet: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET " +
        "environment variables must be set before /admin sign-in will work.",
    );
    this.name = "GoogleAuthNotConfiguredError";
  }
}

let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new GoogleAuthNotConfiguredError();
    }
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      clientId,
      clientSecret,
    );
  }
  return oidcConfig;
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}
