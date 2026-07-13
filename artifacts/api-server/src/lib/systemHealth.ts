// ---------------------------------------------------------------------------
// systemHealth.ts — live system health audit of all firm pipeline states
//
// Classifies every firm by its current operational state and returns a
// structured report used by:
//   - GET /api/admin/system-health (the admin Health page)
//   - The pre-publish gate banner in AdminShell
//   - Startup validation logging (called from index.ts)
//
// Classification rules (mirrors the smoke test + admin recovery panel):
//   "broken" (portal is broken / 404s):
//     - ready_no_active_companies — firm.status=ready + 0 active companies
//
//   "needs_action" (pipeline stalled, admin must intervene):
//     - discovery_empty     — pending + discovery completed + 0 selectable companies
//     - discovery_failed    — pending + last discovery job failed
//     - build_failed        — (pending|reviewed) + last build job failed
//     - pending_no_job      — pending + no job at all
//     - candidate_review_needed — pending + only candidates, no active, awaiting confirm
//
//   "healthy" (null) — everything else
//
// Zero writes. Non-fatal — a DB error is caught and returned as a partial
// report so the health banner never crashes the admin shell.
// ---------------------------------------------------------------------------
import { and, count, desc, eq, ne } from "drizzle-orm";
import {
  db,
  companiesTable,
  firmsTable,
  jobsTable,
} from "@workspace/db";
import type { SystemHealthFirmIssue, SystemHealthReport } from "@workspace/api-zod";

type IssueKind = SystemHealthFirmIssue["issue"];
type Severity = SystemHealthFirmIssue["severity"];

interface FirmRow {
  id: number;
  name: string;
  slug: string;
  status: string;
}

interface JobRow {
  type: string;
  status: string;
}

interface CompanyStat {
  status: string;
  cnt: number;
}

function classify(
  firm: FirmRow,
  companyCounts: CompanyStat[],
  lastJob: JobRow | null,
): { issue: IssueKind; severity: Severity } | null {
  const active = companyCounts.find((c) => c.status === "active")?.cnt ?? 0;
  const candidate = companyCounts.find((c) => c.status === "candidate")?.cnt ?? 0;
  const totalSelectable = active + candidate;

  if (firm.status === "ready" && active === 0) {
    return { issue: "ready_no_active_companies", severity: "broken" };
  }

  if (firm.status === "pending" || firm.status === "reviewed") {
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
    if (candidate > 0 && active === 0) {
      return { issue: "candidate_review_needed", severity: "needs_action" };
    }
  }

  return null;
}

const ISSUE_LABELS: Record<IssueKind, string> = {
  discovery_empty: "Discovery completed with no companies found",
  discovery_failed: "Discovery job failed",
  build_failed: "Build (scoring) job failed",
  ready_no_active_companies: "Firm is \"ready\" but has no active companies (portal 404s)",
  pending_no_job: "Firm is pending with no discovery job",
  candidate_review_needed: "Candidate companies waiting for confirmation",
};

export async function checkSystemHealth(): Promise<SystemHealthReport> {
  const now = new Date().toISOString();

  const firms = await db.select().from(firmsTable);

  const issues: SystemHealthFirmIssue[] = [];

  for (const firm of firms) {
    const companyCounts = await db
      .select({ status: companiesTable.status, cnt: count() })
      .from(companiesTable)
      .where(
        and(
          eq(companiesTable.firmId, firm.id),
          ne(companiesTable.status, "excluded"),
        ),
      )
      .groupBy(companiesTable.status);

    const [lastJobRow] = await db
      .select({ type: jobsTable.type, status: jobsTable.status })
      .from(jobsTable)
      .where(eq(jobsTable.targetId, String(firm.id)))
      .orderBy(desc(jobsTable.id))
      .limit(1);

    const classification = classify(firm, companyCounts.map(r => ({ status: r.status, cnt: Number(r.cnt) })), lastJobRow ?? null);
    if (!classification) continue;

    const totalNonExcluded = companyCounts.reduce((s, c) => s + Number(c.cnt), 0);

    issues.push({
      firmId: firm.id,
      firmName: firm.name,
      slug: firm.slug,
      firmStatus: firm.status,
      issue: classification.issue,
      issueLabel: ISSUE_LABELS[classification.issue],
      severity: classification.severity,
      recoveryUrl: `/admin/firms/${firm.id}`,
      lastJobType: lastJobRow?.type ?? null,
      lastJobStatus: lastJobRow?.status ?? null,
      companyCount: totalNonExcluded,
    });
  }

  const brokenCount = issues.filter((i) => i.severity === "broken").length;
  const needsActionCount = issues.filter((i) => i.severity === "needs_action").length;
  const healthyCount = firms.length - issues.length;

  return {
    ok: brokenCount === 0,
    checkedAt: now,
    summary: {
      total: firms.length,
      healthy: healthyCount,
      needsAction: needsActionCount,
      broken: brokenCount,
    },
    issues,
  };
}

export async function logSystemHealthOnStartup(): Promise<void> {
  try {
    const report = await checkSystemHealth();
    if (report.ok && report.summary.needsAction === 0) {
      return;
    }
    const broken = report.issues.filter((i) => i.severity === "broken");
    const needsAction = report.issues.filter((i) => i.severity === "needs_action");
    if (broken.length > 0) {
      for (const i of broken) {
        // Use console.error since logger may not be importable without circular dep
        console.error(
          `[system-health] BROKEN firm "${i.slug}" (${i.firmStatus}): ${i.issueLabel} — ${i.recoveryUrl}`,
        );
      }
    }
    if (needsAction.length > 0) {
      for (const i of needsAction) {
        console.warn(
          `[system-health] NEEDS ACTION firm "${i.slug}" (${i.firmStatus}): ${i.issueLabel} — ${i.recoveryUrl}`,
        );
      }
    }
  } catch (err) {
    console.warn("[system-health] startup health check failed:", err);
  }
}
