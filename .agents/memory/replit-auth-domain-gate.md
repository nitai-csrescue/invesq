---
name: Replit Auth domain-restricted admin gate
description: How to enforce "only Google accounts on a specific company domain" when the auth provider is Replit Auth (OIDC) and doesn't expose which upstream IdP was used.
---

Replit Auth's OIDC claims do not expose which upstream identity provider (Google, GitHub, email, etc.) a user authenticated with. So a request like "only allow Google accounts on csrescue.com" cannot be enforced by checking "was this a Google login" directly.

**Why:** the enforceable proxy is an email-domain allowlist (case-insensitive suffix match on the claim email, e.g. `@csrescue.com`) — every account on a real Google Workspace domain authenticates via Google, so restricting by domain achieves the same practical outcome without needing IdP-level claims Replit doesn't provide. This should be disclosed to the user as an assumption, not silently substituted.

**How to apply:**
- Enforce the domain check server-side, in the OIDC callback handler, **before** the session is created and before the user row is upserted — a rejected login must never receive a valid session cookie or leave a trace in the users table. Apply the same check to any secondary auth entry point (e.g. mobile token-exchange).
- Add a second, defense-in-depth check in the session-reading middleware that re-validates the stored session's email on every request and clears any session that fails — this protects against sessions created under a looser policy that predates the domain restriction being added.
- If only one route group needs the restriction (e.g. `/admin/*`) but the rest of the app is public, it's fine for the auth middleware to run globally as long as only the gated routes actually branch on `req.user` / call a client-side `ProtectedRoute` — every other route stays unauthenticated and unaffected.
- Client-side gating (redirecting to login when logged out) must happen in the SPA itself (e.g. a `ProtectedRoute` wrapper checking `useAuth()`), not via a server redirect, when the frontend is served as a static SPA with an index.html rewrite for all paths.
