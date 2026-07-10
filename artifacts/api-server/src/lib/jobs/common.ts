import { eq } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { logger } from "../logger.js";

export async function setJobProgress(jobId: number, progressPct: number, etaSeconds: number | null): Promise<void> {
  try {
    await db.update(jobsTable).set({ progressPct, etaSeconds }).where(eq(jobsTable.id, jobId));
  } catch (err) {
    logger.error({ err, jobId }, "Failed to update job progress");
  }
}

export interface JobTicker {
  // Ticks progressPct up toward `cap` (from `floor`) over roughly
  // `sliceMs`, while every tick also recomputes `etaSeconds` from real
  // wall-clock elapsed time against the ticker's overall `totalMs` budget —
  // so a multi-slice job (e.g. one slice per company in a build job) gets a
  // single coherent countdown across all its slices, not one that resets
  // per slice. Callers should stop the timer (returned function) and set
  // the final progressPct themselves once the real work for that slice
  // finishes.
  tick(sliceMs: number, cap: number, floor?: number): () => void;
  // Current ETA in seconds given wall-clock time elapsed since the ticker
  // was created, clamped to >= 0.
  etaSeconds(): number;
}

// Creates a ticker anchored to "now" for a job whose end-to-end work is
// expected to take about `totalMs`. The frontend polls progressPct/etaSeconds
// to render a progress bar and "time remaining" for AI calls that have no
// natural progress events of their own.
export function createJobTicker(jobId: number, totalMs: number): JobTicker {
  const startedAt = Date.now();

  function etaSeconds(): number {
    return Math.max(0, Math.round((startedAt + totalMs - Date.now()) / 1000));
  }

  function tick(sliceMs: number, cap: number, floor = 5): () => void {
    const stepMs = 3000;
    const steps = Math.max(1, Math.round(sliceMs / stepMs));
    const increment = Math.max(1, Math.round((cap - floor) / steps));
    let current = floor;
    const interval = setInterval(() => {
      current = Math.min(cap, current + increment);
      void setJobProgress(jobId, current, etaSeconds());
    }, stepMs);
    return () => clearInterval(interval);
  }

  return { tick, etaSeconds };
}
