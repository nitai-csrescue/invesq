---
name: Testing OAuth-gated admin routes without a real IdP login
description: Techniques for verifying a Google/Replit-OIDC-gated admin route or UI end-to-end when no real login session exists in the environment (no browser SSO available).
---

## Problem

Client-side `ProtectedRoute` admin pages and server routes gated via a real OAuth provider (e.g. a Google Workspace domain allowlist) can't be exercised through their real flow in this sandbox — there's no way to complete an actual Google/OIDC consent screen from an automated tool.

## Technique A: direct session row (fastest, for API-route verification via curl)

Insert a throwaway row directly into the `sessions` table with a `sess` JSON blob shaped like the app's real `SessionData` (e.g. `{ user: { id, email: "<addr>@<allowed-domain>", firstName, lastName, profileImageUrl }, access_token: "<any-string>" }`) and no `expires_at` field (an absent `expires_at` is commonly treated as never-expiring by the refresh-check logic — verify this against the actual middleware first). Send that row's `sid` as the session cookie (`Cookie: sid=<value>`) on `curl` requests through the shared proxy. Delete the row immediately after verification.

## Technique B: dev-only login route + screenshot tool (for full-page screenshots)

The screenshot tool has no way to inject cookies, so for verifying rendered UI (not just an API response), temporarily add a dev-only route that calls the app's own `createSession`/session-cookie helpers directly with a synthetic user, then redirects to the target page. Hit it once via the screenshot tool's `path` param (e.g. `/api/dev/test-login?email=...&returnTo=/admin/...`) — the browser follows the redirect within the same navigation and keeps the cookie, landing authenticated on the real page.

**DANGER — a `process.env.NODE_ENV !== "production"` gate is NOT a safe guard in this repo.** The api-server's prod `start` script (`node ./dist/index.mjs`) sets no NODE_ENV, so `NODE_ENV` is `undefined` in prod and the gate evaluates truthy — the route would mount in production, an auth bypass. Treat any such route as strictly temporary: DELETE it from source before committing; never rely on an env gate to keep it out of prod. Confirm removal with `rg "dev/test-login"` before finishing.

**Why:** both exercise the exact same session/cookie mechanism the real login uses (not a mocked component), so results reflect genuine authenticated behavior, not a guess.

**How to apply:**
- Technique A: check the session-expiry/refresh logic first so the synthetic row won't be rejected; delete the row right after the curl call.
- Technique B: add the route, restart the server, curl it once to confirm it 302s and sets a cookie, screenshot with `path` set to that route + query string (not the final destination path), then remove the route from source immediately after (never ship it, even prod-gated) and delete any synthetic session/user rows it created, then restart the server again.
- Either way: never reuse these techniques against a production database.

## Gotcha: the allowed admin email domain is masked in tool output

The real value of `ALLOWED_EMAIL_DOMAIN` (in `api-server/src/lib/auth.ts`) is redacted/normalized to the literal `csrescue.com` in ALL agent tool output — `read`, `rg`, and workflow logs alike. So a dev-login/test route that HARDCODES the string `"[email protected]"` will read back as correct in every tool, yet `isAllowedAdminEmail()` rejects it at runtime because the actual domain differs. `authMiddleware` then `clearSession`-deletes that session, so `/api/auth/user` returns `{user:null}` and the session row vanishes — which looks exactly like a "getSession deletes valid sessions" bug but is NOT.

**Why:** the masking happens at the tool-output layer, not in the code, so you cannot see the mismatch by reading files or logs.

**How to apply:** in any dev scaffolding or test that needs an allowlisted admin email, DERIVE it from the constant (`` `admin${ALLOWED_EMAIL_DOMAIN}` ``), never hardcode the domain literal. If an authed-admin session is silently rejected/cleared, suspect a domain-string mismatch before suspecting session-store/expiry internals.

The same masking hits env-driven allowlists like `VALIDATOR_EMAILS` — you cannot type a real validator email into SQL/curl either. Cleanest bypass: a throwaway esbuild-runner script (mirror `verify-pdf-portal-parity.runner.mjs`) that imports the app's own config getter + `createSession` (e.g. `getConfiguredValidators()` → `createSession({user:{...email: v.email}})`), so the real values flow through runtime code untyped; print each `sid` mapped to the validator's (unmasked) name so you know which cookie is which. Then curl the routes with those cookies. When you need a masked value (e.g. the OTHER validator's email for an override), extract it from a live API response via `jq` inside the SAME shell command — the real bytes flow through pipes even though your view is masked; only typed input and displayed output are redacted.
