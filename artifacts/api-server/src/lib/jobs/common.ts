import { eq } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { logger } from "../logger.js";

export async function setJobProgress(jobId: number, progressPct: number): Promise<void> {
  try {
    await db.update(jobsTable).set({ progressPct }).where(eq(jobsTable.id, jobId));
  } catch (err) {
    logger.error({ err, jobId }, "Failed to update job progress");
  }
}

// Ticks a job's progressPct up toward `cap` over roughly `targetMs`, so the
// frontend's progress bar/ETA has something real to show while the AI call
// is in flight. Callers should stop the timer (returned function) and set
// the final progressPct themselves once the real work finishes.
export function startProgressSimulation(jobId: number, targetMs: number, cap: number, start = 5): () => void {
  const stepMs = 3000;
  const steps = Math.max(1, Math.round(targetMs / stepMs));
  const increment = Math.max(1, Math.round((cap - start) / steps));
  let current = start;
  const interval = setInterval(() => {
    current = Math.min(cap, current + increment);
    void setJobProgress(jobId, current);
  }, stepMs);
  return () => clearInterval(interval);
}
