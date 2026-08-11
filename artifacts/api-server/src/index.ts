import app from "./app";
import { logger } from "./lib/logger";
import { resumeQueuedDiscoveryJobs } from "./lib/jobs/discovery";
import { resumeQueuedBuildJobs } from "./lib/jobs/build";
import { startWeeklySlackDigest } from "./lib/slackDigest";
import { backfillCompanyNormalizedNames } from "./lib/backfillNormalizedNames";
import { backfillRubricV2 } from "./lib/backfillRubricV2";
import { backfillEngagement } from "./lib/backfillEngagement";
import { ensureRlsPolicies } from "./lib/rlsPolicies";
import { removePamlicoCapitalDuplicate } from "./lib/removePamlicoCapitalDuplicate";
import { migratePhase2Tenants } from "./lib/migratePhase2Tenants";
import { seedTrellixManualEvidence } from "./lib/seedTrellixManualEvidence";
import { restorePhase2Portfolios } from "./lib/restorePhase2Portfolios";
import { backfillDisclosedArr } from "./lib/backfillDisclosedArr";
import { backfillDisclosedArrCq50 } from "./lib/backfillDisclosedArrCq50";
import { backfillArrEstimates } from "./lib/backfillArrEstimates";
import { seedStuckFirms } from "./lib/seedStuckFirms";
import { logSystemHealthOnStartup } from "./lib/systemHealth";

// Defense-in-depth: a stray rejected promise or thrown async error must never
// silently kill the server. Log rejections; on a truly uncaught exception, log
// and exit so the platform restarts us from a clean state instead of limping on
// in an undefined one.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception; exiting for a clean restart");
  process.exit(1);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  void backfillCompanyNormalizedNames();
  void backfillRubricV2();
  void backfillEngagement();
  // Sequence job resumption after the RLS DDL: boot routines that touch the
  // same relations concurrently have deadlocked before. The one-shot Phase 2
  // tenant migration runs in between (touches the same relations).
  void ensureRlsPolicies()
    .then(() => migratePhase2Tenants())
    .then(() => seedTrellixManualEvidence())
    // TEMPORARY: re-onboard the three tenants emptied by migratePhase2Tenants
    // (runs the real add-company + build pipeline; marker-gated, idempotent).
    // Must run BEFORE the resume scan so its queued jobs aren't double-fired.
    .then(() => restorePhase2Portfolios())
    // CQ-48: one-shot marker-gated ARR backfill for 12 named companies; runs
    // after restore so restored companies exist, before the resume scan.
    .then(() => backfillDisclosedArr())
    // CQ-50: one-shot marker-gated range backfill (Tinubu only; the full
    // 38-company research pass found exactly one qualifying disclosure).
    .then(() => backfillDisclosedArrCq50())
    // ARR-estimate ticket: one-shot marker-gated backfill of admin-only
    // analytical estimates (meta.arrEstimate* keys) for 27 companies.
    .then(() => backfillArrEstimates())
    .then(() => {
      void resumeQueuedDiscoveryJobs();
      void resumeQueuedBuildJobs();
    });
  void removePamlicoCapitalDuplicate();
  void seedStuckFirms();
  void logSystemHealthOnStartup();
  startWeeklySlackDigest();
});
