---
name: Screenshotting/testing OAuth-gated admin routes without a real IdP login
description: Technique for verifying a Google/Replit-OIDC-gated admin UI end-to-end when no real login session exists in the environment (0-row users table, no browser SSO available).
---

## Problem

Client-side `ProtectedRoute` admin pages (gated via a real OAuth provider, e.g. Google Workspace domain allowlist) can't be screenshotted or curled through their real flow in this sandbox — there's no way to complete an actual Google/OIDC consent screen from an automated tool, and the screenshot tool has no way to inject cookies.

## Technique

Temporarily add a dev-only route (guarded by `process.env.NODE_ENV !== "production"`) that calls the app's own `createSession`/session-cookie helpers directly with a synthetic user, then redirects to the target page. Hit it once via the screenshot tool's `path` param (e.g. `/api/dev/test-login?email=...&returnTo=/admin/...`) — the browser follows the redirect within the same navigation and keeps the cookie, landing authenticated on the real page.

**Why:** this exercises the exact same session/cookie mechanism the real login uses (not a mocked component), so the resulting screenshot reflects genuine authenticated rendering, not a guess.

**How to apply:**
1. Add the route, restart the server, curl it once to confirm it 302s and sets a cookie.
2. Screenshot with `path` set to that route + query string (not the final destination path).
3. Remove the route from source immediately after (never ship it, even prod-gated) and delete any synthetic session/user rows it created, then restart the server again.
