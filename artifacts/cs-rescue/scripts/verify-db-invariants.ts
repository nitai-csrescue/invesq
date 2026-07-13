// ---------------------------------------------------------------------------
// Permanent, file-independent DB invariant gate (ARCHITECTURE-UNIFIED-DB.md
// Phase 2 step 3 / Phase 4's "DB-only invariant check" successor). Unlike
// verify-portfolio-parity.ts (which diffs the DB against the static TS
// tenant files and will go away once those files are deleted in Phase 4),
// this script asserts pure Postgres-internal invariants and has no
// dependency on the static files — it is meant to stay in the repo
// permanently and be re-run after every schema/data change that touches
// firms/companies/assessments/findings/report_exports.
//
// Performs ZERO writes. Exits nonzero (and never silently reconciles) on any
// violation. Checks:
//
//   (a) every `assessments` row has exactly 8 `findings` rows, one per
//       PILLAR_IDS entry, with matching scores.
//   (b) no two non-excluded `companies` rows under the same firm share a
//       normalizedName (independently re-derives what
//       companies_firm_normalized_name_active_uq enforces at write time).
//   (c) every `report_exports` row's frozen `reportData.scores` recomputes
//       (via @workspace/portfolio-engine) to the same composite/compositeMax
//       as a fresh recompute from its linked assessment's p1..p8.
//   (d) FK integrity (every FK column's referenced row actually exists) and
//       append-only history (no duplicate (companyId, date) pairs in
//       `assessments` — the structural precondition for "a rescore is
//       always a new row, never an UPDATE of a past one").
//
// Run with:
//   pnpm --filter @workspace/cs-rescue run verify-db-invariants
// ---------------------------------------------------------------------------
import { db, pool, firmsTable, companiesTable, assessmentsTable, findingsTable, reportExportsTable, jobsTable } from "@workspace/db";
import { PILLAR_IDS, PILLARS, textToScore } from "@workspace/portfolio-engine";

// Deliberately NOT importing DiagnosticReportData from @workspace/api-zod
// here (that would add a new cross-package dependency to @workspace/cs-rescue
// just for this script) — this local shape captures the only field this
// script actually reads from the jsonb `report_exports.report_data` column.
interface ReportDataScoresShape {
  scores: Record<string, number | "NA">;
}

const violations: string[] = [];
const stateWarnings: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

function warn(msg: string) {
  stateWarnings.push(msg);
}

// ---------------------------------------------------------------------------
// (a) every assessment has exactly 8 findings, one per pillar, score-matched
// ---------------------------------------------------------------------------
async function checkFindingsCompleteness() {
  const assessments = await db.select().from(assessmentsTable);
  const findings = await db.select().from(findingsTable);

  const findingsByAssessment = new Map<number, typeof findings>();
  for (const f of findings) {
    const list = findingsByAssessment.get(f.assessmentId) ?? [];
    list.push(f);
    findingsByAssessment.set(f.assessmentId, list);
  }

  let checked = 0;
  for (const a of assessments) {
    const rows = findingsByAssessment.get(a.id) ?? [];
    checked++;

    if (rows.length !== 8) {
      fail(`assessment id=${a.id}: expected 8 findings rows, found ${rows.length}`);
      continue;
    }

    const byPillar = new Map(rows.map((r) => [r.pillarId, r]));
    for (const pillarId of PILLAR_IDS) {
      if (!byPillar.has(pillarId)) {
        fail(`assessment id=${a.id}: missing findings row for pillar "${pillarId}"`);
      }
    }

    const columnScores: Record<string, string | null> = {
      org: a.p1,
      onboarding: a.p2,
      health: a.p3,
      escalation: a.p4,
      revenue: a.p5,
      leadership: a.p6,
      planning: a.p7,
      ai: a.p8,
    };
    for (const pillarId of PILLAR_IDS) {
      const finding = byPillar.get(pillarId);
      if (!finding) continue;
      const columnScore = columnScores[pillarId];
      if (columnScore !== null && finding.score !== columnScore) {
        fail(
          `assessment id=${a.id} pillar="${pillarId}": findings.score="${finding.score}" does not match assessments column value="${columnScore}"`,
        );
      }
    }
  }

  console.log(`(a) findings completeness: checked ${checked} assessment row(s)`);
}

// ---------------------------------------------------------------------------
// (b) no duplicate non-excluded companies per (firm, normalizedName)
// ---------------------------------------------------------------------------
async function checkCompanyDedup() {
  const firms = await db.select().from(firmsTable);
  const companies = await db.select().from(companiesTable);

  let checked = 0;
  for (const firm of firms) {
    const seen = new Map<string, number>();
    for (const c of companies) {
      if (c.firmId !== firm.id || c.status === "excluded") continue;
      checked++;
      const key = c.normalizedName;
      if (key === null) {
        fail(`company id=${c.id} ("${c.name}", firm="${firm.slug}"): normalizedName is null`);
        continue;
      }
      const existing = seen.get(key);
      if (existing !== undefined) {
        fail(
          `firm="${firm.slug}": non-excluded companies id=${existing} and id=${c.id} both normalize to "${key}"`,
        );
      } else {
        seen.set(key, c.id);
      }
    }
  }

  console.log(`(b) company dedup: checked ${checked} non-excluded company row(s) across ${firms.length} firm(s)`);
}

// ---------------------------------------------------------------------------
// (c) report_exports.reportData.scores recompute matches a fresh recompute
//     from the linked assessment's p1..p8
// ---------------------------------------------------------------------------
function compositeFromScores(scores: Record<string, number | "NA">): { composite: number; compositeMax: number } {
  let composite = 0;
  let scoredCount = 0;
  for (const pillar of PILLARS) {
    const key = `p${PILLARS.indexOf(pillar) + 1}` as keyof typeof scores;
    const value = scores[key];
    if (value === "NA" || value === undefined) continue;
    composite += value;
    scoredCount++;
  }
  return { composite, compositeMax: scoredCount * 2 };
}

function compositeFromAssessment(a: typeof assessmentsTable.$inferSelect): { composite: number; compositeMax: number } {
  const raw = [a.p1, a.p2, a.p3, a.p4, a.p5, a.p6, a.p7, a.p8];
  let composite = 0;
  let scoredCount = 0;
  for (const text of raw) {
    const score = textToScore(text);
    if (score === null) continue;
    composite += score;
    scoredCount++;
  }
  return { composite, compositeMax: scoredCount * 2 };
}

async function checkReportExportComposites() {
  const reportExports = await db.select().from(reportExportsTable);
  const assessments = await db.select().from(assessmentsTable);
  const assessmentById = new Map(assessments.map((a) => [a.id, a]));

  let checked = 0;
  for (const re of reportExports) {
    const assessment = assessmentById.get(re.assessmentId);
    if (!assessment) {
      fail(`report_exports id=${re.id}: references missing assessment id=${re.assessmentId}`);
      continue;
    }

    const reportData = re.reportData as ReportDataScoresShape;
    if (!reportData?.scores) {
      fail(`report_exports id=${re.id}: reportData.scores is missing`);
      continue;
    }

    checked++;
    const fromFrozenScores = compositeFromScores(reportData.scores as Record<string, number | "NA">);
    const fromLiveAssessment = compositeFromAssessment(assessment);

    if (
      fromFrozenScores.composite !== fromLiveAssessment.composite ||
      fromFrozenScores.compositeMax !== fromLiveAssessment.compositeMax
    ) {
      fail(
        `report_exports id=${re.id} (assessment id=${assessment.id}): frozen reportData.scores recompute ` +
          `(${fromFrozenScores.composite}/${fromFrozenScores.compositeMax}) does not match a fresh recompute from ` +
          `the linked assessment's p1..p8 (${fromLiveAssessment.composite}/${fromLiveAssessment.compositeMax})`,
      );
    }
  }

  console.log(`(c) report_exports composite recompute: checked ${checked} row(s)`);
}

// ---------------------------------------------------------------------------
// (d) FK integrity + append-only (no duplicate (companyId, date) pairs)
// ---------------------------------------------------------------------------
async function checkFkIntegrityAndAppendOnly() {
  const firms = await db.select().from(firmsTable);
  const companies = await db.select().from(companiesTable);
  const assessments = await db.select().from(assessmentsTable);
  const findings = await db.select().from(findingsTable);
  const reportExports = await db.select().from(reportExportsTable);
  const jobs = await db.select().from(jobsTable);

  const firmIds = new Set(firms.map((f) => f.id));
  const companyIds = new Set(companies.map((c) => c.id));
  const assessmentIds = new Set(assessments.map((a) => a.id));
  const jobIds = new Set(jobs.map((j) => j.id));

  for (const c of companies) {
    if (!firmIds.has(c.firmId)) fail(`company id=${c.id}: firmId=${c.firmId} does not exist in firms`);
    if (c.sourceJobId !== null && !jobIds.has(c.sourceJobId)) {
      fail(`company id=${c.id}: sourceJobId=${c.sourceJobId} does not exist in jobs`);
    }
  }
  for (const a of assessments) {
    if (!companyIds.has(a.companyId)) fail(`assessment id=${a.id}: companyId=${a.companyId} does not exist in companies`);
    if (a.sourceJobId !== null && !jobIds.has(a.sourceJobId)) {
      fail(`assessment id=${a.id}: sourceJobId=${a.sourceJobId} does not exist in jobs`);
    }
  }
  for (const f of findings) {
    if (!assessmentIds.has(f.assessmentId)) fail(`finding id=${f.id}: assessmentId=${f.assessmentId} does not exist in assessments`);
  }
  for (const re of reportExports) {
    if (!companyIds.has(re.companyId)) fail(`report_export id=${re.id}: companyId=${re.companyId} does not exist in companies`);
    if (!assessmentIds.has(re.assessmentId)) fail(`report_export id=${re.id}: assessmentId=${re.assessmentId} does not exist in assessments`);
  }

  console.log(
    `(d.1) FK integrity: checked ${companies.length} companies, ${assessments.length} assessments, ${findings.length} findings, ${reportExports.length} report_exports`,
  );

  const seenCompanyDate = new Map<string, number>();
  for (const a of assessments) {
    const key = `${a.companyId}:${a.date}`;
    const existing = seenCompanyDate.get(key);
    if (existing !== undefined) {
      fail(`append-only violation: assessments id=${existing} and id=${a.id} share the same (companyId=${a.companyId}, date=${a.date})`);
    } else {
      seenCompanyDate.set(key, a.id);
    }
  }

  console.log(`(d.2) append-only: checked ${assessments.length} assessment row(s) for duplicate (companyId, date) pairs`);
}

// ---------------------------------------------------------------------------
// (e) firm pipeline state audit — broken states fail the gate;
//     needs-action states are printed as warnings
// ---------------------------------------------------------------------------
async function checkFirmStateHealth() {
  const firms = await db.select().from(firmsTable);
  const allCompanies = await db.select().from(companiesTable);
  const allJobs = await db.select().from(jobsTable);

  let brokenCount = 0;
  let needsActionCount = 0;

  for (const firm of firms) {
    const companyRows = allCompanies.filter(
      (c) => c.firmId === firm.id && c.status !== "excluded",
    );
    const activeCount = companyRows.filter((c) => c.status === "active").length;
    const candidateCount = companyRows.filter((c) => c.status === "candidate").length;
    const totalSelectable = activeCount + candidateCount;

    const firmJobs = allJobs
      .filter((j) => j.targetId === String(firm.id))
      .sort((a, b) => b.id - a.id);
    const lastJob = firmJobs[0] ?? null;

    if (firm.status === "ready" && activeCount === 0) {
      fail(
        `(e) firm "${firm.slug}" is ready but has 0 active companies — tenant portal 404s`,
      );
      brokenCount++;
      continue;
    }

    if (firm.status === "pending" || firm.status === "reviewed") {
      if (!lastJob) {
        warn(`(e) firm "${firm.slug}" is pending with no discovery job`);
        needsActionCount++;
      } else if (lastJob.type === "discovery" && lastJob.status === "failed") {
        warn(`(e) firm "${firm.slug}" discovery job failed`);
        needsActionCount++;
      } else if (lastJob.type === "build" && lastJob.status === "failed") {
        warn(`(e) firm "${firm.slug}" build job failed`);
        needsActionCount++;
      } else if (
        lastJob.type === "discovery" &&
        lastJob.status === "completed" &&
        totalSelectable === 0
      ) {
        warn(
          `(e) firm "${firm.slug}" discovery completed but found 0 companies — admin must add manually`,
        );
        needsActionCount++;
      } else if (candidateCount > 0 && activeCount === 0) {
        warn(
          `(e) firm "${firm.slug}" has ${candidateCount} candidate(s) awaiting confirmation`,
        );
        needsActionCount++;
      }
    }
  }

  console.log(
    `(e) firm state audit: ${firms.length} firm(s) — ${brokenCount} broken, ${needsActionCount} needing action`,
  );
}

async function main() {
  console.log("=== DB invariants gate (permanent, file-independent) ===\n");

  await checkFindingsCompleteness();
  await checkCompanyDedup();
  await checkReportExportComposites();
  await checkFkIntegrityAndAppendOnly();
  await checkFirmStateHealth();

  console.log("\n=== Result ===");
  if (violations.length > 0) {
    console.log(`FAILED — ${violations.length} violation(s) found:`);
    for (const v of violations) console.log(`  - ${v}`);
    process.exitCode = 1;
  } else {
    console.log("PASSED — no invariant violations found.");
  }

  if (stateWarnings.length > 0) {
    console.log(`\nWARNINGS (${stateWarnings.length} firm(s) need action — not a gate failure):`);
    for (const w of stateWarnings) console.log(`  ! ${w}`);
  }
}

main()
  .catch((err) => {
    console.error("Invariant gate crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
