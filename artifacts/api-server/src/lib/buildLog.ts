// ---------------------------------------------------------------------------
// BUILD-LOG.md parser — reads the append-only build self-report log at the
// repo root and surfaces the most recent entry. Used by GET /api/build-status.
//
// Path resolution note: this module is bundled by esbuild into a single
// dist/index.mjs (see build.mjs), so `import.meta.url` at runtime always
// resolves to that bundle's location — artifacts/api-server/dist/index.mjs —
// regardless of which source file this code originated from. Three levels up
// from there is the repo root.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger.js";

export interface BuildLogEntry {
  date: string;
  task: string;
  status: string;
  filesChanged: string;
  validation: string;
  republishNeeded: string;
  notes: string[];
}

function resolveBuildLogPath(): string | null {
  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // Preferred: the copy build.mjs places next to the bundle so it ships with
    // the deploy (the repo-root file is not part of the deployed bundle, which
    // is why /api/build-status 404s in production without this).
    path.resolve(bundleDir, "./BUILD-LOG.md"),
    // Fallback for non-bundled runs (e.g. tsx) and older layouts: the repo
    // root, three levels up from artifacts/api-server/dist/index.mjs.
    path.resolve(bundleDir, "../../../BUILD-LOG.md"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function parseEntryBlock(block: string): BuildLogEntry | null {
  const taskMatch = block.match(/^##\s+(.+)$/m);
  const dateMatch = block.match(/^-\s*Date:\s*(.+)$/m);
  const statusMatch = block.match(/^-\s*Status:\s*(.+)$/m);
  const filesMatch = block.match(/^-\s*Files changed:\s*(.+)$/m);
  const validationMatch = block.match(/^-\s*Validation:\s*(.+)$/m);
  const republishMatch = block.match(/^-\s*Republish needed:\s*(.+)$/m);

  if (!taskMatch || !dateMatch || !statusMatch) return null;

  const notes: string[] = [];
  const notesHeaderIdx = block.search(/^-\s*QA notes:\s*$/m);
  if (notesHeaderIdx !== -1) {
    const rest = block.slice(notesHeaderIdx);
    const lines = rest.split("\n").slice(1);
    for (const line of lines) {
      const noteMatch = line.match(/^\s*-\s+(.+)$/);
      if (noteMatch) {
        notes.push(noteMatch[1].trim());
      } else if (line.trim() !== "") {
        // A non-bullet, non-blank line ends the QA notes list.
        break;
      }
    }
  }

  return {
    date: dateMatch[1].trim(),
    task: taskMatch[1].trim(),
    status: statusMatch[1].trim(),
    filesChanged: filesMatch ? filesMatch[1].trim() : "",
    validation: validationMatch ? validationMatch[1].trim() : "",
    republishNeeded: republishMatch ? republishMatch[1].trim() : "",
    notes,
  };
}

/**
 * Returns the most recently appended entry in BUILD-LOG.md, or null if the
 * file is missing or contains no parseable entry. Never throws — a missing
 * or malformed log must never take down the /api/build-status endpoint.
 */
export function getLatestBuildLogEntry(): BuildLogEntry | null {
  const filePath = resolveBuildLogPath();
  if (!filePath) {
    logger.warn("BUILD-LOG.md not found in any known location");
    return null;
  }

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (err) {
    logger.warn({ err }, "BUILD-LOG.md not found or unreadable");
    return null;
  }

  const blocks = content.split(/\n-{3,}\n/).filter((b) => /^##\s+/m.test(b));
  // Return the most recent PARSEABLE entry, scanning from the end. Freeform
  // trailing blocks (missing the canonical "- Date:"/"- Status:" bullets that
  // parseEntryBlock requires) are skipped rather than 404ing the endpoint.
  for (let i = blocks.length - 1; i >= 0; i--) {
    const entry = parseEntryBlock(blocks[i]!);
    if (entry) return entry;
  }
  return null;
}
