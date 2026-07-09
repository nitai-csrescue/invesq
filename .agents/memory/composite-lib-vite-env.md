---
name: Composite lib using import.meta.env
description: A workspace lib package (typechecked via tsc --build, never bundled by Vite) that reads import.meta.env needs explicit Vite client types wired in, or tsc --build fails with TS2339 on ImportMeta.env.
---

Root `tsconfig.base.json` sets `"types": []`, so no ambient type packages are picked up automatically anywhere in the workspace — each package must opt in explicitly. Vite apps get `vite/client` via their own tsconfig `types` array; a plain composite lib package does not, even if it happens to run in a browser context (e.g. a shared React hook that calls `import.meta.env.BASE_URL`).

**Why:** the error surfaces as `Property 'env' does not exist on type 'ImportMeta'` only when running `tsc --build` on the lib in isolation (e.g. `pnpm run typecheck:libs`) — the consuming Vite app's own typecheck can pass even though the lib itself is broken, since the app's tsconfig has the ambient types loaded and shadows the problem.

**How to apply:** for any `lib/*` package whose source touches `import.meta.env`, add `"types": ["vite/client"]` to that lib's own `tsconfig.json` `compilerOptions`, and add `"vite": "catalog:"` to its `devDependencies` (dev-only — the lib is never built by Vite itself, just needs the type declarations). Run `pnpm install` then `pnpm run typecheck:libs` to confirm.
