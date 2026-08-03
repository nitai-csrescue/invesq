// ---------------------------------------------------------------------------
// CS Rescue Internal dogfood — anonymized BackEngine import (admin-only).
//
// Mounted INSIDE the /admin router (after requireAdminAuth), so both routes
// here are Admin-Lens-gated server-side.
//
// HARD INVARIANTS:
// - Anonymization happens at import time, BEFORE anything is persisted:
//   every real account name is replaced with a deterministic "Prospect N"
//   placeholder. Placeholders are keyed by sha256(normalized name) via the
//   backengine_name_map table — stable across re-imports, never row order.
// - Real names are written ONLY to backengine_name_map (admin-only). They
//   are never written to backengine_accounts, signals, or any other
//   tenant-visible table; a final guard re-scans every value to be persisted
//   and aborts the whole import if any mapped real name survives.
// - Null engagement metrics are a valid real-world shape (BackEngine may not
//   have backfilled quantitative history) — the import succeeds cleanly.
// - This file supplies Tier 2 data only. It never touches composite/tier/
//   rollup scoring, never flips Phase 2 weighting, and never mutates any
//   other tenant.
// ---------------------------------------------------------------------------
import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { asc, desc, eq, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";
import {
  db,
  assessmentsTable,
  backengineAccountsTable,
  backengineNameMapTable,
  companiesTable,
  firmsTable,
  signalsTable,
} from "@workspace/db";
import { RUBRIC_VERSION } from "@workspace/portfolio-engine";
import { ImportAdminBackengineBody } from "@workspace/api-zod";

export const DOGFOOD_FIRM_SLUG = "cs-rescue-internal";

const router: IRouter = Router();

// --- parsing helpers --------------------------------------------------------

/** Minimal RFC-4180-ish CSV parser (quoted fields, embedded commas/newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function parseXlsx(base64: string): string[][] {
  const wb = XLSX.read(Buffer.from(base64, "base64"), { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  return rows.map((r) => r.map((c) => String(c ?? "")));
}

// --- anonymization core ------------------------------------------------------

export function normalizeAccountName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function accountNameHash(name: string): string {
  return createHash("sha256").update(normalizeAccountName(name)).digest("hex");
}

/**
 * Resolve stable placeholders for a set of real names. Existing mappings are
 * reused verbatim; new names are numbered AFTER sorting by hash (row-order
 * independent) starting at max existing N + 1. Returns hash -> placeholder.
 */
async function resolvePlaceholders(realNames: string[]): Promise<{
  byHash: Map<string, string>;
  newPlaceholders: number;
}> {
  const uniqueByHash = new Map<string, string>();
  for (const name of realNames) {
    const h = accountNameHash(name);
    if (!uniqueByHash.has(h)) uniqueByHash.set(h, name.trim().replace(/\s+/g, " "));
  }
  const hashes = [...uniqueByHash.keys()];
  return db.transaction(async (tx) => {
    const existing = hashes.length
      ? await tx
          .select()
          .from(backengineNameMapTable)
          .where(inArray(backengineNameMapTable.nameHash, hashes))
      : [];
    const byHash = new Map<string, string>(existing.map((r) => [r.nameHash, r.placeholder]));
    const all = await tx
      .select({ placeholder: backengineNameMapTable.placeholder })
      .from(backengineNameMapTable);
    let maxN = 0;
    for (const r of all) {
      const m = /^Prospect (\d+)$/.exec(r.placeholder);
      if (m) maxN = Math.max(maxN, Number(m[1]));
    }
    const newHashes = hashes.filter((h) => !byHash.has(h)).sort();
    let created = 0;
    for (const h of newHashes) {
      const placeholder = `Prospect ${++maxN}`;
      await tx.insert(backengineNameMapTable).values({
        nameHash: h,
        realName: uniqueByHash.get(h)!,
        placeholder,
      });
      byHash.set(h, placeholder);
      created++;
    }
    return { byHash, newPlaceholders: created };
  });
}

/**
 * Scrub free text (shape-b): replace every known real name with its
 * placeholder (longest first, case-insensitive) and strip email addresses.
 */
function scrubText(text: string, mapping: { realName: string; placeholder: string }[]): string {
  let out = text;
  const sorted = [...mapping].sort((a, b) => b.realName.length - a.realName.length);
  for (const { realName, placeholder } of sorted) {
    const escaped = realName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), placeholder);
  }
  return out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]");
}

/** Final persist-time guard: no mapped real name may survive in any value. */
function assertAnonymized(values: (string | null | undefined)[], realNames: string[]): void {
  const lowered = values.filter((v): v is string => typeof v === "string").map((v) => v.toLowerCase());
  for (const name of realNames) {
    const needle = normalizeAccountName(name);
    if (needle.length < 3) continue;
    if (lowered.some((v) => v.includes(needle))) {
      throw new Error(`Anonymization guard tripped: a real account name would have been persisted`);
    }
  }
}

function toIntOrNull(raw: string | undefined): number | null {
  const s = (raw ?? "").trim();
  if (s === "" || s.toLowerCase() === "null" || s === "—" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toTextOrNull(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  return s === "" || s.toLowerCase() === "null" ? null : s;
}

// Category -> pillar id for shape-b signals (unmapped categories become
// "other"; the UI groups by category regardless).
const CATEGORY_PILLAR: Record<string, string> = {
  "churn risk & escalation": "escalation",
  "product feedback": "other",
  "competitive intelligence": "other",
};

async function loadDogfoodCompany() {
  const [row] = await db
    .select({ companyId: companiesTable.id })
    .from(companiesTable)
    .innerJoin(firmsTable, eq(companiesTable.firmId, firmsTable.id))
    .where(eq(firmsTable.slug, DOGFOOD_FIRM_SLUG))
    .orderBy(asc(companiesTable.id))
    .limit(1);
  return row ?? null;
}

// --- routes ------------------------------------------------------------------

router.post("/backengine/import", async (req, res) => {
  const parsed = ImportAdminBackengineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid import payload", details: parsed.error.issues });
    return;
  }
  const { format, content } = parsed.data;
  try {
    const grid = format === "csv" ? parseCsv(content) : parseXlsx(content);
    if (grid.length < 2) {
      res.status(422).json({ error: "File has no data rows" });
      return;
    }
    const headers = grid[0].map((h) => h.trim().toLowerCase());
    const dataRows = grid.slice(1);
    const col = (pred: (h: string) => boolean) => headers.findIndex(pred);

    const target = await loadDogfoodCompany();
    if (!target) {
      res.status(422).json({ error: "cs-rescue-internal tenant/company not found — seed it first" });
      return;
    }

    const nameCol = col((h) => h === "name" || h === "account" || h === "account name");
    const isAccountsShape = nameCol >= 0 && col((h) => h.includes("sentiment")) >= 0;
    const categoryCol = col((h) => h.includes("category"));
    const textCol = col((h) => h.includes("summary") || h.includes("quote") || h === "text");
    const dateCol = col((h) => h.includes("date"));
    const isSignalsShape = !isAccountsShape && categoryCol >= 0 && textCol >= 0;

    if (!isAccountsShape && !isSignalsShape) {
      res.status(422).json({ error: "Unrecognized BackEngine export shape", headers: grid[0] });
      return;
    }

    if (isAccountsShape) {
      const qCol = col((h) => h.startsWith("quarterly"));
      const mCol = col((h) => h.startsWith("monthly"));
      const erCol = col((h) => h.includes("received"));
      const esCol = col((h) => h.includes("sent"));
      const mtCol = col((h) => h.includes("meeting"));

      const rows = dataRows.filter((r) => (r[nameCol] ?? "").trim() !== "");
      const realNames = rows.map((r) => r[nameCol]);
      const { byHash, newPlaceholders } = await resolvePlaceholders(realNames);

      // Collapse duplicate rows of the same account (e.g. "Resend" twice):
      // one canonical account per hash; the last row's metrics win.
      const byPlaceholder = new Map<
        string,
        { quarterlySentiment: string | null; monthlySentiment: string | null; emailsReceived: number | null; emailsSent: number | null; meetings: number | null }
      >();
      for (const r of rows) {
        const placeholder = byHash.get(accountNameHash(r[nameCol]))!;
        byPlaceholder.set(placeholder, {
          quarterlySentiment: toTextOrNull(qCol >= 0 ? r[qCol] : undefined),
          monthlySentiment: toTextOrNull(mCol >= 0 ? r[mCol] : undefined),
          emailsReceived: toIntOrNull(erCol >= 0 ? r[erCol] : undefined),
          emailsSent: toIntOrNull(esCol >= 0 ? r[esCol] : undefined),
          meetings: toIntOrNull(mtCol >= 0 ? r[mtCol] : undefined),
        });
      }

      // Guard: nothing being persisted may contain a real name.
      assertAnonymized(
        [...byPlaceholder.keys(), ...[...byPlaceholder.values()].flatMap((v) => [v.quarterlySentiment, v.monthlySentiment])],
        realNames,
      );

      let upserted = 0;
      await db.transaction(async (tx) => {
        for (const [placeholder, metrics] of byPlaceholder) {
          await tx
            .insert(backengineAccountsTable)
            .values({ companyId: target.companyId, placeholder, ...metrics })
            .onConflictDoUpdate({
              target: [backengineAccountsTable.companyId, backengineAccountsTable.placeholder],
              set: { ...metrics, importedAt: new Date() },
            });
          upserted++;
        }
      });

      req.log.info(
        { rowsRead: rows.length, uniqueAccounts: byPlaceholder.size, newPlaceholders },
        "BackEngine accounts import completed (anonymized)",
      );
      res.json({
        shape: "accounts",
        rowsRead: rows.length,
        uniqueAccounts: byPlaceholder.size,
        duplicatesCollapsed: rows.length - byPlaceholder.size,
        newPlaceholders,
        accountsUpserted: upserted,
        signalsInserted: 0,
      });
      return;
    }

    // ---- shape (b): Monitor/Feed -> signals ---------------------------------
    const rows = dataRows.filter((r) => (r[textCol] ?? "").trim() !== "");
    // Anonymize using the FULL existing mapping plus any account column if
    // present; individuals' names can't be detected reliably, so the scrub
    // replaces every known mapped name and strips emails.
    const fullMap = await db.select().from(backengineNameMapTable);
    const accountColB = col((h) => h === "account" || h === "account name" || h === "name");
    if (accountColB >= 0) {
      await resolvePlaceholders(rows.map((r) => r[accountColB]).filter((n) => (n ?? "").trim() !== ""));
    }
    const mapping = await db.select().from(backengineNameMapTable);
    const [latestAssessment] = await db
      .select({ id: assessmentsTable.id })
      .from(assessmentsTable)
      .where(eq(assessmentsTable.companyId, target.companyId))
      .orderBy(desc(assessmentsTable.date), desc(assessmentsTable.id))
      .limit(1);
    if (!latestAssessment) {
      res.status(422).json({ error: "No assessment exists for the dogfood company; seed Phase 1 first" });
      return;
    }
    let inserted = 0;
    const prepared = rows.map((r) => {
      const category = (categoryCol >= 0 ? r[categoryCol] : "").trim() || "Uncategorized";
      const value = scrubText((r[textCol] ?? "").trim(), mapping);
      const dateObserved = toTextOrNull(dateCol >= 0 ? r[dateCol] : undefined);
      return { category, value, dateObserved };
    });
    assertAnonymized(prepared.flatMap((p) => [p.value, p.category]), [...fullMap, ...mapping].map((m) => m.realName));
    await db.transaction(async (tx) => {
      for (const p of prepared) {
        await tx.insert(signalsTable).values({
          assessmentId: latestAssessment.id,
          companyId: target.companyId,
          pillarId: CATEGORY_PILLAR[p.category.toLowerCase()] ?? "other",
          source: "backengine",
          sourceSystem: "backengine",
          dateObserved: p.dateObserved,
          direction: "neutral",
          confidence: "Medium",
          note: p.value,
          field: p.category,
          value: p.value,
          rubricVersion: RUBRIC_VERSION,
        });
        inserted++;
      }
    });
    req.log.info({ signalsInserted: inserted }, "BackEngine feed import completed (anonymized)");
    res.json({
      shape: "signals",
      rowsRead: rows.length,
      uniqueAccounts: 0,
      duplicatesCollapsed: 0,
      newPlaceholders: 0,
      accountsUpserted: 0,
      signalsInserted: inserted,
    });
  } catch (err) {
    req.log.error({ err }, "BackEngine import failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Import failed" });
  }
});

router.get("/backengine/name-map", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(backengineNameMapTable)
      .orderBy(asc(backengineNameMapTable.placeholder));
    res.json({
      rows: rows.map((r) => ({
        id: r.id,
        realName: r.realName,
        placeholder: r.placeholder,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load BackEngine name map");
    res.status(500).json({ error: "Failed to load name map" });
  }
});

export default router;
