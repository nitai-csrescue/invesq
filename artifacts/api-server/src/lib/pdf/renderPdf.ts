import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { logger } from "../logger.js";

let cachedExecutablePath: string | null = null;

// Resolves a Chromium binary usable by puppeteer-core in this Nix-based
// environment. Preference order:
// 1. `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` — a Replit-provided, automation
//    -ready Chromium build already wired up for headless use.
// 2. `which chromium` — the `pkgs.chromium` package declared in
//    replit.nix, resolved via PATH rather than a hardcoded /nix/store hash
//    (which changes across rebuilds).
function resolveChromiumExecutable(): string {
  if (cachedExecutablePath) return cachedExecutablePath;

  const fromEnv = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (fromEnv && existsSync(fromEnv)) {
    cachedExecutablePath = fromEnv;
    return fromEnv;
  }

  try {
    const resolved = execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
    if (resolved && existsSync(resolved)) {
      cachedExecutablePath = resolved;
      return resolved;
    }
  } catch (err) {
    logger.warn({ err }, "`which chromium` failed while resolving a PDF-render browser");
  }

  throw new Error(
    "Could not locate a Chromium executable for PDF rendering (checked REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE and `which chromium`)",
  );
}

// Renders the given standalone HTML (which loads its fonts over the network
// from Google Fonts) to a Letter-size PDF, one physical page per `.page`
// div in the HTML (see baseStyles.ts's `@page`/`break-after` pattern).
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const executablePath = resolveChromiumExecutable();

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    // `page.setContent`'s `waitUntil` only accepts "load"/"domcontentloaded"
    // (unlike `page.goto`, which also allows "networkidle0") — "load" fires
    // once the document and its sub-resources (including the Google Fonts
    // `<link>` stylesheet request) have finished loading.
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });

    // The "load" event fires once the font *stylesheet* has loaded, but the
    // actual woff2 glyph files it references are fetched lazily and may
    // still be in flight — printing before they land silently falls back to
    // system fonts. `document.fonts.ready` resolves only once every font
    // face the page's CSS references has actually finished loading. Passed
    // as a string (not a closure) so this server-side file — whose
    // tsconfig has no "dom" lib — doesn't need `document` in scope to
    // typecheck; Puppeteer evaluates the string in the browser context.
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
