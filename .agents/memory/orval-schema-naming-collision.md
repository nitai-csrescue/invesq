---
name: Orval component schema name collides with auto-generated Response type
description: Adding an OpenAPI response schema named exactly "<OperationId>Response" breaks codegen with a duplicate-export TS error
---

Orval always synthesizes a zod const named `<OperationId>Response` in the generated `api.ts` for every operation, in addition to emitting exports for any named component schemas referenced by that operation's response. If you author a component schema in `openapi.yaml` whose name happens to equal that same `<OperationId>Response` string, codegen produces two conflicting exports with the same name and the generated package fails to typecheck (TS2308 duplicate export).

**Why:** this isn't a naming convention Orval documents — it only surfaces as a codegen-time collision, so it's easy to hit by naming a response schema after its operation without checking.

**How to apply:** when adding a new OpenAPI operation + response schema pair, name the component schema something other than `<OperationId>Response` (e.g. `<OperationId>Result`). Run `pnpm --filter @workspace/api-spec run codegen` right after adding the schema to catch this immediately, before building on top of it.
