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
import { readFileSync } from "node:fs";
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

function resolveBuildLogPath(): string {
  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(bundleDir, "../../../BUILD-LOG.md");
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
  let content: string;
  try {
    content = readFileSync(resolveBuildLogPath(), "utf-8");
  } catch (err) {
    logger.warn({ err }, "BUILD-LOG.md not found or unreadable");
    return null;
  }

  const blocks = content.split(/\n-{3,}\n/).filter((b) => /^##\s+/m.test(b));
  if (blocks.length === 0) return null;

  const lastBlock = blocks[blocks.length - 1];
  return parseEntryBlock(lastBlock);
}
