import { type Request } from "express";

// Reconstructs the public-facing origin (scheme + host) a request came in
// on, honoring the reverse proxy's forwarded headers. Used anywhere the
// server needs to build an absolute URL back into the app (OIDC redirect
// URIs, links embedded in outbound emails, etc).
export function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}
