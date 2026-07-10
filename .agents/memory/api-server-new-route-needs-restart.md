---
name: New Express route files may need an explicit workflow restart to load
description: A brand-new route file (not just an edit to an existing one) registered in the router index can 404 until the api-server workflow is restarted, even though existing routes keep working fine.
---

Adding a new route module (e.g. a new `routes/foo.ts` wired into `routes/index.ts`) and relying on
the dev server's file watcher to pick it up isn't always reliable — the process can keep serving
correctly for pre-existing routes while a brand-new endpoint still 404s ("Cannot GET ...") until the
api-server workflow is explicitly restarted.

**Why:** Confirmed a new `GET /api/build-status` route 404'd against a live api-server process despite
correct code (route file existed, was imported and mounted correctly, health checks on other routes
passed) — an explicit `restart_workflow` on the API server immediately fixed it with zero code changes.

**How to apply:** After adding a brand-new route file (not just editing an existing route's handler),
restart the api-server workflow and re-curl the new endpoint before concluding it's broken — don't
assume the dev watcher already loaded it just because other routes respond normally.
