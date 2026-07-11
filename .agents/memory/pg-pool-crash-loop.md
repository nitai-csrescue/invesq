---
name: pg Pool crash loop (unhandled 'error' event)
description: A reported "client CPU peg" was actually a prod api-server crash loop caused by a pg Pool with no 'error' listener; how to recognize it.
---

**Debugging lesson (reported-vs-actual):** a report of a *client-side* symptom ("main thread pegged at 100% on authed /admin, frozen forever") turned out to be a *server* crash loop — /admin looked frozen because its data calls kept hitting a restarting api-server. Before chasing a client render loop, check deployment logs for a crashing/restarting server. Here the authed /admin tree was exhaustively proven loop-free (no while/for(;;)/recursion/Array(n) fills, no ErrorBoundary retry, no WebSocket/SSE/tight poller, no prod-only env branch) and a Playwright repro rendered cleanly — the client was never the problem.

**The crash loop:** a node-postgres `Pool` with no `pool.on("error", ...)` listener crashes the whole process the first time an *idle* pooled connection is dropped by the server ("terminating connection due to administrator command" on managed-DB maintenance/failover). Node throws on an emitter's `'error'` event with no listener → crash → platform restart → repeated `healthcheck /api returned status 500`. Effectively prod-only (dev DBs rarely drop idle connections in a short session).

**How to apply:** the mechanical fix and the log-only / never-`process.exit` rule live in `replit.md` → Database → "Connection resilience"; this file is the debugging-lesson pointer for when a "frozen client" is really a dying server.
