import type { Job } from "@workspace/api-client-react";

export const JOB_STATUS_STYLES: Record<string, string> = {
  queued: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  running: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

export function jobStatusPillClass(status: string): string {
  return JOB_STATUS_STYLES[status] ?? "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

export function formatJobEta(etaSeconds: number | null): string {
  if (etaSeconds === null) return "ETA unknown";
  if (etaSeconds <= 0) return "Finishing up…";
  if (etaSeconds < 60) return `~${etaSeconds}s remaining`;
  const minutes = Math.round(etaSeconds / 60);
  return `~${minutes} min remaining`;
}

// A job is "active" while it still has work left to do — used to decide
// whether admin pages should keep polling and whether a new job of the same
// type/target would be rejected as a duplicate by the API.
export function isJobActive(job: Pick<Job, "status"> | null | undefined): boolean {
  return job?.status === "queued" || job?.status === "running";
}
