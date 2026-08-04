// ---------------------------------------------------------------------------
// Calibration Ledger — weekly Slack digest of new Resolution Events.
//
// Deliberately a WEEKLY digest, not real-time, and explicitly NOT email
// (email delivery is unreliable right now for unrelated reasons; do not add
// an email path here).
//
// Reporting window: each digest covers ONE COMPLETED ISO week (Monday 00:00
// UTC through the next Monday 00:00 UTC), keyed by that week's ISO key
// (e.g. "2026-W32"). The hourly tick only ever processes the PREVIOUS
// (closed) week, so events created later in an in-progress week can never
// be skipped — the week is only summarized after it ends.
//
// Configuration: SLACK_WEBHOOK_URL environment variable — an incoming Slack
// webhook URL, same env-var pattern as the other external service
// integrations (RESEND_API_KEY in email.ts, NOTION_API_KEY in notion.ts).
// When it is NOT set, the integration is STUBBED: the scheduler logs one
// clear warning per boot and skips without claiming the week, so the first
// pending digest still posts once the webhook is configured. A missing
// webhook never fails anything else.
//
// Dedup/claim ledger: calibration_digests (unique week_key). The row is
// INSERTED AS AN ATOMIC CLAIM BEFORE posting — concurrent ticks/processes
// race on the unique index and only the claim winner posts. If the Slack
// POST then fails, the claim row is deleted so a later tick retries.
// This intentionally does NOT use the jobs table, so the boot-time job
// resume scan and the admin pipeline UI never see digest runs.
// ---------------------------------------------------------------------------
import { and, eq, gte, isNotNull, lt } from "drizzle-orm";
import {
  db,
  signalsTable,
  companiesTable,
  calibrationDigestsTable,
} from "@workspace/db";
import { logger } from "./logger";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly check; posts at most weekly
const DAY_MS = 24 * 60 * 60 * 1000;

let stubWarned = false;

// Monday 00:00 UTC of the ISO week containing `d`.
function isoWeekStart(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = day.getUTCDay() || 7; // Mon=1..Sun=7
  day.setUTCDate(day.getUTCDate() - (dow - 1));
  return day;
}

// ISO-8601 week key for the week containing `d`, e.g. "2026-W32".
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday of the current week determines the ISO year.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// The most recent COMPLETED ISO week relative to `now`.
export function previousIsoWeek(now: Date): { weekKey: string; start: Date; end: Date } {
  const thisWeekStart = isoWeekStart(now);
  const start = new Date(thisWeekStart.getTime() - 7 * DAY_MS);
  return { weekKey: isoWeekKey(start), start, end: thisWeekStart };
}

async function gatherEvents(start: Date, end: Date) {
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
    .where(
      and(
        isNotNull(signalsTable.eventType),
        gte(signalsTable.createdAt, start),
        lt(signalsTable.createdAt, end),
      ),
    );
}

function formatDigest(weekKey: string, events: Awaited<ReturnType<typeof gatherEvents>>): string {
  const lines = events.map(
    (e) =>
      `• *${e.companyName}* [${e.pillarId}] ${e.eventType} (${e.eventDate ?? "undated"}, ${e.source}) — ${e.verdict?.toUpperCase()}: ${e.note}`,
  );
  return [
    `*Calibration Ledger weekly digest (${weekKey})*`,
    `${events.length} new resolution event${events.length === 1 ? "" : "s"} recorded last week:`,
    ...lines,
  ].join("\n");
}

// Runs one scheduler tick over the most recent COMPLETED ISO week.
// Exported for direct invocation in tests/QA; returns what happened.
export async function runWeeklyDigestTick(
  now = new Date(),
): Promise<"posted" | "already_done" | "no_events" | "stubbed_no_webhook" | "post_failed" | "lost_claim"> {
  const { weekKey, start, end } = previousIsoWeek(now);

  // Cheap pre-check (the claim below is what actually guarantees dedup).
  const [already] = await db
    .select({ id: calibrationDigestsTable.id })
    .from(calibrationDigestsTable)
    .where(eq(calibrationDigestsTable.weekKey, weekKey))
    .limit(1);
  if (already) return "already_done";

  const events = await gatherEvents(start, end);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (events.length > 0 && !webhookUrl) {
    // STUB: integration point is wired but unconfigured. Set SLACK_WEBHOOK_URL
    // (a Slack incoming-webhook URL) to activate posting. Do NOT claim the
    // week — the digest should still go out once the webhook is configured.
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

  // ATOMIC CLAIM before posting: the unique index on week_key elects exactly
  // one poster across concurrent ticks/processes. Losers back off silently.
  const [claim] = await db
    .insert(calibrationDigestsTable)
    .values({ weekKey, eventCount: events.length })
    .onConflictDoNothing({ target: calibrationDigestsTable.weekKey })
    .returning({ id: calibrationDigestsTable.id });
  if (!claim) return "lost_claim";

  if (events.length === 0) {
    // Completed week with nothing to report: claim stands, nothing to post.
    return "no_events";
  }

  try {
    const resp = await fetch(webhookUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: formatDigest(weekKey, events) }),
    });
    if (!resp.ok) {
      throw new Error(`Slack webhook responded ${resp.status}`);
    }
  } catch (err) {
    // Release the claim so a later tick retries this week's digest.
    await db
      .delete(calibrationDigestsTable)
      .where(eq(calibrationDigestsTable.id, claim.id))
      .catch((releaseErr) =>
        logger.error({ releaseErr, weekKey }, "Failed to release digest claim after post failure"),
      );
    logger.error({ err, weekKey }, "Slack digest post failed; will retry next tick");
    return "post_failed";
  }

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
