---
name: portfolio bootstrap warmup race
description: Why parallel e2e tests can spuriously white-screen the whole cs-rescue SPA right after an api-server restart, and the underlying fragility.
---

# Portfolio bootstrap warmup race / app-wide crash fragility

`PortfolioDataProvider` wraps the **entire** cs-rescue SPA and, in an effect, calls
`hydratePortfolioData(data.firms)` with no shape guard. `hydratePortfolioData` does
`for (const ... of bootstrapFirms)`. If `GET /api/portfolio/bootstrap` ever resolves
to a 200 whose body lacks a valid `firms` array, that throws
`bootstrapFirms is not iterable` and white-screens the whole app (blank `<div id="root">`
or a Vite runtime-error overlay), not just the portfolio routes that `PortfolioGate` guards.

**Why:** a throw in a top-level provider unmounts the whole tree. The graceful path only
covers a *failed* request (`isError` → `data` undefined → effect skipped); it does NOT
cover a *successful-but-malformed* 200 (e.g. a proxy 502/HTML fallback or partial body
served while the api-server is still warming up after a restart).

**How to apply (testing):** after restarting `artifacts/api-server`, warm it before
launching e2e tests — curl `/api/portfolio/bootstrap` until it returns a real `firms`
array. Launching several `runTest` browsers in parallel immediately post-restart makes the
first run fail spuriously with the crash above (browser logs show a brief 502). A warm
backend passes cleanly. Confirmed: after warmup, all main pages + tenant portals render fine.

**How to apply (hardening, if asked):** guard the hydrate call on
`Array.isArray(data?.firms)` before calling `hydratePortfolioData`, so a malformed
bootstrap degrades to the portfolio-only error gate instead of crashing the whole SPA.
Not done yet — surfaced as an optional follow-up, out of scope for a pure QA pass.
