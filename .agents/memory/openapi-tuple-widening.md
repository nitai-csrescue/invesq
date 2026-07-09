---
name: OpenAPI/Orval widens fixed-length tuples
description: Orval-generated types turn a hand-written [number, number] tuple into number[], breaking assignability at the API boundary
---

Orval-generated request/response types (from `lib/api-spec/openapi.yaml` via `pnpm --filter @workspace/api-spec run codegen`) cannot express a fixed-length tuple like `[number, number]` — OpenAPI/JSON Schema arrays have no arity constraint, so Orval emits `number[]`. Any hand-written domain type in a consuming package that uses a real tuple (e.g. an ARR range) will then fail `tsc` assignability checks against the generated type, even though the runtime data is always exactly 2 elements.

**Why:** this is a structural limitation of OpenAPI's array schema, not a bug in the codegen or the domain type — both are individually correct.

**How to apply:** don't loosen the hand-written domain type to `number[]` (loses the real invariant everywhere else it's used). Instead, cast at the single point where the generated payload is handed off into the domain-typed function (e.g. `as unknown as DomainType[]`), with a comment noting the server already guarantees the true shape. Keep the cast localized to that one call site.
