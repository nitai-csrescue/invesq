---
name: Dual portfolio engines + bootstrap schema stripping
description: Tenant UI renders from a client-side engine copy, not the shared lib; new bootstrap fields must be declared in the OpenAPI spec or zod strips them.
---

Two traps that made an engine change appear to have no effect:

1. **Two engine copies.** The tenant-facing web app renders from its own copy of the portfolio engine (`artifacts/cs-rescue/src/data/portfolio/{engine,pillars,types}.ts`), NOT from `lib/portfolio-engine`. Any scoring/display change must be mirrored in both, or the UI silently keeps the old behavior while the server/PDF path changes.
**Why:** the client rebuilds Company objects from raw bootstrap data locally; the shared lib serves server-side consumers.
**How to apply:** when touching engine math or Tier metadata, grep both trees and change them together; verify via the rendered report page, not just API output.

2. **Bootstrap responses are zod-parsed against generated schemas.** Unknown keys are silently stripped, so a new raw field added to the DB/mapping layer never reaches the client until it is declared on the relevant schema in `lib/api-spec/openapi.yaml` and codegen is rerun. No error is thrown — the field just vanishes.

Also: vite dev server was not the culprit here, but a `tsc --build --force` of composite libs is needed after schema changes before dependent typechecks see new columns.
