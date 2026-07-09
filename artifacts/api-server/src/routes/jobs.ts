import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }

  try {
    const rows = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
    const job = rows[0];
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({
      id: job.id,
      type: job.type,
      targetId: job.targetId,
      status: job.status,
      progressPct: job.progressPct,
      etaSeconds: job.etaSeconds,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load job");
    res.status(500).json({ error: "Failed to load job" });
  }
});

export default router;
