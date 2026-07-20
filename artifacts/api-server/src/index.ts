import app from "./app";
import { logger } from "./lib/logger";
import { resumeQueuedDiscoveryJobs } from "./lib/jobs/discovery";
import { resumeQueuedBuildJobs } from "./lib/jobs/build";
import { backfillCompanyNormalizedNames } from "./lib/backfillNormalizedNames";
import { backfillIcpMeta } from "./lib/backfillIcpMeta";
import { backfillRubricV2 } from "./lib/backfillRubricV2";
import { removePamlicoCapitalDuplicate } from "./lib/removePamlicoCapitalDuplicate";
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
  void backfillIcpMeta();
  void backfillRubricV2();
  void removePamlicoCapitalDuplicate();
  void seedStuckFirms();
  void resumeQueuedDiscoveryJobs();
  void resumeQueuedBuildJobs();
  void logSystemHealthOnStartup();
});
