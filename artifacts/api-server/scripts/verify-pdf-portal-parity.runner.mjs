// esbuild runner for verify-pdf-portal-parity.ts.
//
// The api-server has no tsx; its TS is NodeNext (.js specifiers resolving to
// .ts) and cannot be executed directly by node. This mirrors build.mjs: bundle
// the script to an ESM file under dist/ (gitignored), then dynamic-import it.
// We do NOT use esbuild-plugin-pino here (it assumes a single app entrypoint);
// instead pino/pino-pretty/thread-stream are externalized so node resolves them
// from node_modules at runtime.
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

globalThis.require = createRequire(import.meta.url);

const dir = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.resolve(dir, "../dist/scripts/verify-pdf-portal-parity.mjs");

await build({
  entryPoints: [path.resolve(dir, "verify-pdf-portal-parity.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile,
  logLevel: "warning",
  external: [
    "*.node",
    "pg-native",
    "lightningcss",
    "pino",
    "pino-pretty",
    "thread-stream",
    "puppeteer",
    "puppeteer-core",
    "playwright",
  ],
  banner: {
    js: `import { createRequire as __cr } from 'node:module';
import __p from 'node:path';
import __u from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __u.fileURLToPath(import.meta.url);
globalThis.__dirname = __p.dirname(globalThis.__filename);`,
  },
});

await import(pathToFileURL(outfile).href);
