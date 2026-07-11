---
name: Running a one-off script against api-server lib code
description: How to execute a throwaway TS script that imports api-server internals, given the esbuild bundle setup.
---

The `@workspace/api-server` package is bundled with esbuild (`build.mjs`), not run through `tsx` — there is NO `tsx` binary available to it, so `pnpm exec tsx script.ts` fails with "Command tsx not found", and Node cannot run the `.ts` sources directly (NodeNext `.js` specifiers point at `.ts` files).

**How to apply:** to run a one-off script that imports server lib code (e.g. `reportExport.ts`, `pdf/*`), write a tiny esbuild runner `.mjs` that bundles the script to a `.mjs` and then dynamic-imports it. Mirror `build.mjs`: `platform: "node"`, `format: "esm"`, `bundle: true`, and the cjs-interop `banner`.

**Gotchas:**
- Do NOT use the `esbuild-plugin-pino` plugin in the runner — it injects extra worker entry points, which trips esbuild's "Must use outdir when there are multiple input files" error against an `outfile`. Instead externalize `pino`, `pino-pretty`, `thread-stream` (Node resolves them from node_modules at runtime).
- Also externalize the native/unbundleable deps the render path needs: `playwright`/`puppeteer` (headless PDF render), `pg-native`, `lightningcss`, `*.node`.
- A single run that both generates a Claude narrative (~30s) AND renders 2 PDFs can exceed a 120s shell timeout; generation persists to `report_exports` on first call, so a second run is cache-only and fast. Delete the throwaway runner + its output dir when done.
