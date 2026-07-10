// ---------------------------------------------------------------------------
// GET /api/build-status — public, no auth. Surfaces the most recent entry
// from the repo-root BUILD-LOG.md as JSON, for external build-health checks.
// ---------------------------------------------------------------------------
import { Router, type IRouter } from "express";
import { getLatestBuildLogEntry } from "../lib/buildLog.js";

const router: IRouter = Router();

router.get("/build-status", (_req, res) => {
  const entry = getLatestBuildLogEntry();
  if (!entry) {
    res.status(404).json({ error: "No build log entries found" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json({
    date: entry.date,
    task: entry.task,
    status: entry.status,
    filesChanged: entry.filesChanged,
    validation: entry.validation,
    republishNeeded: entry.republishNeeded,
    notes: entry.notes,
  });
});

export default router;
