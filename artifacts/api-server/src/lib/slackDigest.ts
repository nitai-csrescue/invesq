// ---------------------------------------------------------------------------
// Calibration Ledger — weekly Slack digest of new Resolution Events.
//
// Deliberately a WEEKLY digest, not real-time, and explicitly NOT email
// (email delivery is unreliable right now for unrelated reasons; do not add
// an email path here).
//
// Configuration: SLACK_WEBHOOK_URL environment variable — an incoming Slack
// webhook URL, same env-var pattern as the other external service
// integrations (RESEND_API_KEY in email.ts, NOTION_API_KEY in notion.ts,
// ANTHROPIC_API_KEY in anthropic.ts). When it is NOT set, the integration is
// STUBBED: the scheduler logs one clear warning per boot and skips posting
// without recording the week as done, so the first week after configuration
// still gets its digest. A missing webhook never fails anything else.
//
// Dedup ledger: calibration_digests (one row per ISO week actually posted).
// This intentionally does NOT use the jobs table, so the boot-time job
// resume scan and the admin pipeline UI never see digest runs.
// ---------------------------------------------------------------------------
import { and, eq, gte, isNotNull } from "drizzle-orm";
import {
  db,
  signalsTable,
  companiesTable,
  calibrationDigestsTable,
} from "@workspace/db";
import { logger } from "./logger";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly check; posts at most weekly
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let stubWarned = false;

// ISO-8601 week key, e.g. "2026-W32".
export function isoWeekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Thursday of the current week determines the ISO year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function gatherLastWeeksEvents(now: Date) {
  const since = new Date(now.getTime() - WEEK_MS);
  return db
    .select({
      companyName: companiesTable.name,
      pillarId: signalsTable.pillarId,
      eventType: signalsTable.eventType,
      verdict: signalsTable.calibrationVerdict,
      eventDate: signalsTable.dateObserved,
      source: signalsTable.source,
      note: signalsTable.note,
    })
    .from(signalsTable)
    .innerJoin(companiesTable, eq(companiesTable.id, signalsTable.companyId))
    .where(and(isNotNull(signalsTable.eventType), gte(signalsTable.createdAt, since)));
}

function formatDigest(weekKey: string, events: Awaited<ReturnType<typeof gatherLastWeeksEvents>>): string {
  const lines = events.map(
    (e) =>
      `• *${e.companyName}* [${e.pillarId}] ${e.eventType} (${e.eventDate ?? "undated"}, ${e.source}) — ${e.verdict?.toUpperCase()}: ${e.note}`,
  );
  return [
    `*Calibration Ledger weekly digest (${weekKey})*`,
    `${events.length} new resolution event${events.length === 1 ? "" : "s"} recorded this week:`,
    ...lines,
  ].join("\n");
}

// Runs one scheduler tick. Exported for direct invocation in tests/QA.
// Returns what happened so callers can assert on it.
export async function runWeeklyDigestTick(
  now = new Date(),
): Promise<"posted" | "already_posted" | "no_events" | "stubbed_no_webhook" | "post_failed"> {
  const weekKey = isoWeekKey(now);
  const [already] = await db
    .select({ id: calibrationDigestsTable.id })
    .from(calibrationDigestsTable)
    .where(eq(calibrationDigestsTable.weekKey, weekKey))
    .limit(1);
  if (already) return "already_posted";

  const events = await gatherLastWeeksEvents(now);
  if (events.length === 0) {
    // Nothing to say this week; record it so we don't re-scan hourly forever.
    await db
      .insert(calibrationDigestsTable)
      .values({ weekKey, eventCount: 0 })
      .onConflictDoNothing();
    return "no_events";
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    // STUB: integration point is wired but unconfigured. Set SLACK_WEBHOOK_URL
    // (a Slack incoming-webhook URL) to activate posting. Do NOT record the
    // week — the digest should go out once the webhook is configured.
    if (!stubWarned) {
      stubWarned = true;
      logger.warn(
        { weekKey, pendingEvents: events.length },
        "Calibration weekly Slack digest is STUBBED: SLACK_WEBHOOK_URL is not set. " +
          "Set it to a Slack incoming-webhook URL to activate the digest.",
      );
    }
    return "stubbed_no_webhook";
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: formatDigest(weekKey, events) }),
    });
    if (!resp.ok) {
      logger.error({ weekKey, status: resp.status }, "Slack digest post failed; will retry next tick");
      return "post_failed";
    }
  } catch (err) {
    logger.error({ err, weekKey }, "Slack digest post errored; will retry next tick");
    return "post_failed";
  }

  await db
    .insert(calibrationDigestsTable)
    .values({ weekKey, eventCount: events.length })
    .onConflictDoNothing();
  logger.info({ weekKey, eventCount: events.length }, "Posted calibration weekly Slack digest");
  return "posted";
}

// Boot entry point. Fire-and-forget; any tick error is logged and never
// propagates (a digest failure must not affect the rest of the app).
export function startWeeklySlackDigest(): void {
  const safeTick = () =>
    runWeeklyDigestTick().catch((err) => {
      logger.error({ err }, "Calibration weekly digest tick failed");
    });
  void safeTick();
  const interval = setInterval(safeTick, CHECK_INTERVAL_MS);
  // Never keep the process alive just for the digest.
  interval.unref?.();
}
