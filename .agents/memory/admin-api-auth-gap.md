---
name: Client-side route gating does not protect API routes
description: A React ProtectedRoute (redirect-to-login) on a page gives zero server-side protection to the API routes that page calls — each Express router needs its own explicit auth-check middleware.
---

Found in INVESQ (cs-rescue) on 2026-07-10: the `/admin` frontend page was gated via a client-side `ProtectedRoute` redirect, and the docs described the auth layer as covering it — but the actual `/api/admin/*` Express routes had no server-side check at all (the shared `authMiddleware` only *populates* `req.user` when a session is valid, it never blocks a request). Only one endpoint out of a dozen had an inline `if (!req.user) return 401`, and a code comment openly acknowledged the rest were relying on "the broader admin-auth gap being closed everywhere" — i.e. a known-but-unfixed hole. In production this meant anyone could call the admin API directly (no browser, no login) and trigger real paid third-party calls and read internal data.

**Why:** client-side redirects are a UX nicety, not a security boundary — they only stop an in-app navigation, not a direct HTTP call to the API. A shared auth middleware that merely *decorates* `req` (rather than rejecting) gives a false sense of coverage: it's easy to assume "the auth layer applies globally" means every route is protected, when it only means every route *could check* `req.user` if it chose to.

**How to apply:** whenever a page/route is described as "gated" or "admin-only," verify the enforcement server-side, not just in the frontend router — grep the actual route handlers for a rejection check (`if (!req.user)` / equivalent), don't trust a doc's claim or the existence of a shared middleware. The durable fix is a `router.use(requireXAuth)` at the top of the whole router (reject-by-default), not a per-route opt-in check that's easy to forget on new endpoints.
