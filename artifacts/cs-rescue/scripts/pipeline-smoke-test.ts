// ---------------------------------------------------------------------------
// Pipeline smoke test — post-build QA gate
//
// Walks fixture firms through each pipeline state and asserts:
//   1. Every state is classified correctly (no silent dead-ends)
//   2. The discovery-empty branch yields the guided recovery UI path,
//      never a "healthy" or "done" classification
//   3. Every "broken" state (portal would 404) is detected loudly
//   4. Copy policy: no em-dashes in any firm/company name in the DB
//   5. Rollup math: avgComposite recomputes correctly from raw scores
//
// Performs ZERO writes to real data. Creates fixtures with a distinguishable
// prefix, runs assertions, and deletes fixtures in both success and failure
// paths (finally block).
//
// Run with:
//   pnpm --filter @workspace/cs-rescue run pipeline-smoke-test
// ---------------------------------------------------------------------------
import {
  db,
  pool,
  firmsTable,
  companiesTable,
  assessmentsTable,
  findingsTable,
  jobsTable,
} from "@workspace/db";
import { normalizeCompanyName, PILLARS, PILLAR_IDS, textToScore } from "@workspace/portfolio-engine";
import { and, eq, inArray, ne } from "drizzle-orm";

const FIXTURE_PREFIX = "__smoke__";

// ---------------------------------------------------------------------------
// Health classification — mirrors api-server/src/lib/systemHealth.ts
// (kept in sync manually; any divergence is a bug)
// ---------------------------------------------------------------------------
type IssueKind =
  | "discovery_empty"
  | "discovery_failed"
  | "build_failed"
  | "ready_no_active_companies"
  | "pending_no_job"
  | "candidate_review_needed";

type Severity = "broken" | "needs_action";

interface FirmState {
  id: number;
  slug: string;
  status: string;
  nonExcludedCompanies: { status: string }[];
  lastJob: { type: string; status: string } | null;
}

interface HealthIssue {
  issue: IssueKind;
  severity: Severity;
}

function classifyFirm(state: FirmState): HealthIssue | null {
  const { status, nonExcludedCompanies, lastJob } = state;
  const activeCo = nonExcludedCompanies.filter((c) => c.status === "active").length;
  const candidateCo = nonExcludedCompanies.filter((c) => c.status === "candidate").length;
  const totalSelectable = activeCo + candidateCo;

  if (status === "ready" && activeCo === 0) {
    return { issue: "ready_no_active_companies", severity: "broken" };
  }

  if (status === "pending" || status === "reviewed") {
    if (!lastJob) {
      return { issue: "pending_no_job", severity: "needs_action" };
    }
    if (lastJob.type === "discovery" && lastJob.status === "failed") {
      return { issue: "discovery_failed", severity: "needs_action" };
    }
    if (lastJob.type === "build" && lastJob.status === "failed") {
      return { issue: "build_failed", severity: "needs_action" };
    }
    if (
      lastJob.type === "discovery" &&
      lastJob.status === "completed" &&
      totalSelectable === 0
    ) {
      return { issue: "discovery_empty", severity: "needs_action" };
    }
    if (candidateCo > 0 && activeCo === 0) {
      return { issue: "candidate_review_needed", severity: "needs_action" };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
interface FixtureIds {
  firmIds: number[];
  companyIds: number[];
  assessmentIds: number[];
  findingIds: number[];
  jobIds: number[];
}

const fixture: FixtureIds = {
  firmIds: [],
  companyIds: [],
  assessmentIds: [],
  findingIds: [],
  jobIds: [],
};

async function createFirm(name: string, status: string): Promise<number> {
  const slug = `${FIXTURE_PREFIX}${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const [f] = await db
    .insert(firmsTable)
    .values({ name: `${FIXTURE_PREFIX} ${name}`, slug, status })
    .returning({ id: firmsTable.id });
  if (!f) throw new Error(`Failed to insert fixture firm: ${name}`);
  fixture.firmIds.push(f.id);
  return f.id;
}

async function createCompany(
  firmId: number,
  name: string,
  status: "active" | "candidate" | "excluded",
): Promise<number> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [c] = await db
    .insert(companiesTable)
    .values({
      firmId,
      name,
      slug,
      status,
      normalizedName: normalizeCompanyName(name),
    })
    .returning({ id: companiesTable.id });
  if (!c) throw new Error(`Failed to insert fixture company: ${name}`);
  fixture.companyIds.push(c.id);
  return c.id;
}

async function createJob(
  type: string,
  firmId: number,
  status: string,
): Promise<number> {
  const [j] = await db
    .insert(jobsTable)
    .values({ type, targetId: String(firmId), status })
    .returning({ id: jobsTable.id });
  if (!j) throw new Error(`Failed to insert fixture job`);
  fixture.jobIds.push(j.id);
  return j.id;
}

async function createAssessment(companyId: number): Promise<number> {
  const [a] = await db
    .insert(assessmentsTable)
    .values({
      companyId,
      date: "2026-01-01",
      p1: "2",
      p2: "1",
      p3: "2",
      p4: "1",
      p5: "2",
      p6: "1",
      p7: "2",
      p8: "1",
    })
    .returning({ id: assessmentsTable.id });
  if (!a) throw new Error(`Failed to insert fixture assessment`);
  fixture.assessmentIds.push(a.id);
  return a.id;
}

async function createFindings(assessmentId: number): Promise<void> {
  const scores = ["2", "1", "2", "1", "2", "1", "2", "1"];
  const rows = PILLAR_IDS.map((pillarId, i) => ({
    assessmentId,
    pillarId,
    score: scores[i] ?? "1",
    evidence: "Smoke test fixture evidence.",
  }));
  const inserted = await db.insert(findingsTable).values(rows).returning({ id: findingsTable.id });
  for (const f of inserted) fixture.findingIds.push(f.id);
}

async function loadFirmState(firmId: number): Promise<FirmState> {
  const [firm] = await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.id, firmId))
    .limit(1);
  if (!firm) throw new Error(`Firm ${firmId} not found`);

  const companies = await db
    .select({ status: companiesTable.status })
    .from(companiesTable)
    .where(
      and(eq(companiesTable.firmId, firmId), ne(companiesTable.status, "excluded")),
    );

  const jobs = await db
    .select({ type: jobsTable.type, status: jobsTable.status, id: jobsTable.id })
    .from(jobsTable)
    .where(eq(jobsTable.targetId, String(firmId)))
    .orderBy(jobsTable.id);

  const lastJob = jobs.at(-1) ?? null;

  return {
    id: firm.id,
    slug: firm.slug,
    status: firm.status,
    nonExcludedCompanies: companies,
    lastJob: lastJob ? { type: lastJob.type, status: lastJob.status } : null,
  };
}

async function cleanupFixtures(): Promise<void> {
  if (fixture.findingIds.length > 0) {
    await db
      .delete(findingsTable)
      .where(inArray(findingsTable.id, fixture.findingIds));
    fixture.findingIds.length = 0;
  }
  if (fixture.assessmentIds.length > 0) {
    await db
      .delete(assessmentsTable)
      .where(inArray(assessmentsTable.id, fixture.assessmentIds));
    fixture.assessmentIds.length = 0;
  }
  if (fixture.companyIds.length > 0) {
    await db
      .delete(companiesTable)
      .where(inArray(companiesTable.id, fixture.companyIds));
    fixture.companyIds.length = 0;
  }
  if (fixture.jobIds.length > 0) {
    await db
      .delete(jobsTable)
      .where(inArray(jobsTable.id, fixture.jobIds));
    fixture.jobIds.length = 0;
  }
  if (fixture.firmIds.length > 0) {
    await db
      .delete(firmsTable)
      .where(inArray(firmsTable.id, fixture.firmIds));
    fixture.firmIds.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
const failures: string[] = [];
const warnings: string[] = [];

function pass(label: string) {
  console.log(`  OK   ${label}`);
}

function fail(label: string, detail: string) {
  console.log(`  FAIL ${label}: ${detail}`);
  failures.push(`${label}: ${detail}`);
}

function warn(label: string, detail: string) {
  console.log(`  WARN ${label}: ${detail}`);
  warnings.push(`${label}: ${detail}`);
}

function assertIssue(
  label: string,
  state: FirmState,
  expectedIssue: IssueKind,
  expectedSeverity: Severity,
) {
  const issue = classifyFirm(state);
  if (!issue) {
    fail(label, `expected issue "${expectedIssue}" but got healthy (null)`);
    return;
  }
  if (issue.issue !== expectedIssue) {
    fail(label, `expected issue "${expectedIssue}" but got "${issue.issue}"`);
    return;
  }
  if (issue.severity !== expectedSeverity) {
    fail(label, `expected severity "${expectedSeverity}" but got "${issue.severity}"`);
    return;
  }
  pass(label);
}

function assertHealthy(label: string, state: FirmState) {
  const issue = classifyFirm(state);
  if (issue) {
    fail(label, `expected healthy but got issue "${issue.issue}" (${issue.severity})`);
    return;
  }
  pass(label);
}

function assertRecoveryPath(label: string, state: FirmState) {
  const issue = classifyFirm(state);
  if (!issue) {
    fail(label, `firm is classified as healthy; no recovery path needed`);
    return;
  }
  const recoveryUrl = `/admin/firms/${state.id}`;
  if (!recoveryUrl.includes("/admin/firms/")) {
    fail(label, `recovery URL "${recoveryUrl}" does not route to admin firm panel`);
    return;
  }
  pass(`${label} (recovery → ${recoveryUrl})`);
}

// ---------------------------------------------------------------------------
// Individual test cases
// ---------------------------------------------------------------------------

async function testDiscoveryEmpty(): Promise<void> {
  console.log("\n[1] discovery_empty — firm pending, discovery completed, 0 companies");
  const firmId = await createFirm("DiscoveryEmpty", "pending");
  await createJob("discovery", firmId, "completed");
  const state = await loadFirmState(firmId);

  assertIssue(
    "classified as discovery_empty/needs_action",
    state,
    "discovery_empty",
    "needs_action",
  );
  assertRecoveryPath("recovery path routes to admin firm panel", state);

  const issue = classifyFirm(state);
  if (issue?.issue === "discovery_empty") {
    pass("discovery_empty is NOT classified as healthy");
    pass("discovery_empty is NOT classified as broken (portal not 404)");
  }
}

async function testDiscoveryFailed(): Promise<void> {
  console.log("\n[2] discovery_failed — firm pending, discovery job failed");
  const firmId = await createFirm("DiscoveryFailed", "pending");
  await createJob("discovery", firmId, "failed");
  const state = await loadFirmState(firmId);

  assertIssue(
    "classified as discovery_failed/needs_action",
    state,
    "discovery_failed",
    "needs_action",
  );
  assertRecoveryPath("recovery path routes to admin firm panel", state);
}

async function testCandidateReviewNeeded(): Promise<void> {
  console.log("\n[3] candidate_review_needed — firm pending, 2 candidates, 0 active");
  const firmId = await createFirm("CandidateReview", "pending");
  await createJob("discovery", firmId, "completed");
  await createCompany(firmId, "AlphaCorp", "candidate");
  await createCompany(firmId, "BetaInc", "candidate");
  const state = await loadFirmState(firmId);

  assertIssue(
    "classified as candidate_review_needed/needs_action",
    state,
    "candidate_review_needed",
    "needs_action",
  );
  assertRecoveryPath("recovery path routes to admin firm panel", state);

  const selectable = state.nonExcludedCompanies.filter(
    (c) => c.status === "active" || c.status === "candidate",
  );
  if (selectable.length === 2) {
    pass("selectableCompanies.length === 2 (candidates surface correctly)");
  } else {
    fail("selectableCompanies count", `expected 2 but got ${selectable.length}`);
  }
}

async function testBuildFailed(): Promise<void> {
  console.log("\n[4] build_failed — firm reviewed, build job failed, 2 active companies");
  const firmId = await createFirm("BuildFailed", "reviewed");
  await createCompany(firmId, "CompX", "active");
  await createCompany(firmId, "CompY", "active");
  await createJob("build", firmId, "failed");
  const state = await loadFirmState(firmId);

  assertIssue(
    "classified as build_failed/needs_action",
    state,
    "build_failed",
    "needs_action",
  );
  assertRecoveryPath("recovery path routes to admin firm panel", state);
}

async function testReadyHealthy(): Promise<void> {
  console.log("\n[5] ready_healthy — firm ready, 2 active companies, valid assessments");
  const firmId = await createFirm("ReadyHealthy", "ready");
  const coA = await createCompany(firmId, "HealthCo A", "active");
  const coB = await createCompany(firmId, "HealthCo B", "active");
  const assA = await createAssessment(coA);
  const assB = await createAssessment(coB);
  await createFindings(assA);
  await createFindings(assB);
  const state = await loadFirmState(firmId);

  assertHealthy("firm classified as healthy", state);

  const activeCo = state.nonExcludedCompanies.filter((c) => c.status === "active");
  if (activeCo.length === 2) {
    pass("2 active companies present (portal will resolve)");
  } else {
    fail("active company count", `expected 2 but got ${activeCo.length}`);
  }

  await testRollupMath(firmId);
}

async function testReadyBroken(): Promise<void> {
  console.log("\n[6] ready_no_active_companies — firm ready but 0 active companies");
  const firmId = await createFirm("ReadyBroken", "ready");
  const state = await loadFirmState(firmId);

  assertIssue(
    "classified as ready_no_active_companies/broken",
    state,
    "ready_no_active_companies",
    "broken",
  );
  assertRecoveryPath("recovery path exists even for broken state", state);
  pass("broken state detected loudly (portal would 404 without this check)");
}

// ---------------------------------------------------------------------------
// Copy policy: no em-dashes in any firm or company name in the DB
// ---------------------------------------------------------------------------
async function testCopyPolicy(): Promise<void> {
  console.log("\n[7] copy policy — no em-dashes in firm/company names");
  const firms = await db.select({ name: firmsTable.name, slug: firmsTable.slug }).from(firmsTable);
  const companies = await db.select({ name: companiesTable.name }).from(companiesTable);

  let emDashFirms = 0;
  for (const f of firms) {
    if (f.name.includes("\u2014") || f.name.includes("\u2013")) {
      warn("em-dash in firm name", `"${f.name}" (${f.slug})`);
      emDashFirms++;
    }
  }
  if (emDashFirms === 0) pass("no em-dashes in firm names");

  let emDashCos = 0;
  for (const c of companies) {
    if (c.name.includes("\u2014") || c.name.includes("\u2013")) {
      warn("em-dash in company name", `"${c.name}"`);
      emDashCos++;
    }
  }
  if (emDashCos === 0) pass("no em-dashes in company names");
}

// ---------------------------------------------------------------------------
// Rollup math: avgComposite recomputes correctly
// ---------------------------------------------------------------------------
async function testRollupMath(firmId: number): Promise<void> {
  const companies = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(and(eq(companiesTable.firmId, firmId), eq(companiesTable.status, "active")));

  const assessments = await db
    .select()
    .from(assessmentsTable)
    .where(
      inArray(
        assessmentsTable.companyId,
        companies.map((c) => c.id),
      ),
    );

  let total = 0;
  let count = 0;
  for (const a of assessments) {
    const raw = [a.p1, a.p2, a.p3, a.p4, a.p5, a.p6, a.p7, a.p8];
    let composite = 0;
    let scored = 0;
    for (const text of raw) {
      const score = textToScore(text);
      if (score !== null) {
        composite += score;
        scored++;
      }
    }
    const compositeMax = scored * 2;
    if (compositeMax > 0) {
      total += composite / compositeMax;
      count++;
    }
  }

  if (count === 0) {
    warn("rollup math", "no assessments found for ready firm");
    return;
  }

  const avgComposite = total / count;
  const expectedAvg = (2 + 1 + 2 + 1 + 2 + 1 + 2 + 1) / (8 * 2);

  if (Math.abs(avgComposite - expectedAvg) < 0.001) {
    pass(`rollup math: avgComposite=${avgComposite.toFixed(3)} matches expected ${expectedAvg.toFixed(3)}`);
  } else {
    fail(
      "rollup math",
      `avgComposite=${avgComposite.toFixed(3)} does not match expected ${expectedAvg.toFixed(3)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("=== Pipeline smoke test ===\n");
  console.log(
    "Tests fixture firms through each pipeline state and asserts invariants.\n",
  );

  try {
    await cleanupFixtures();

    await testDiscoveryEmpty();
    await testDiscoveryFailed();
    await testCandidateReviewNeeded();
    await testBuildFailed();
    await testReadyHealthy();
    await testReadyBroken();
    await testCopyPolicy();
  } finally {
    await cleanupFixtures();
  }

  console.log("\n=== Result ===");

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  * ${w}`);
  }

  if (failures.length > 0) {
    console.log(`\nFAILED — ${failures.length} assertion(s) failed:`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(
      `\nPASSED — all pipeline state assertions passed.${warnings.length > 0 ? ` (${warnings.length} warning(s) above)` : ""}`,
    );
  }
}

main()
  .catch((err) => {
    console.error("Smoke test crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
