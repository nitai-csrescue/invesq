import { logger } from "./logger.js";

const DEFAULT_FROM = "INVESQ <onboarding@resend.dev>";

export interface EmailSendResult {
  attempted: boolean;
  success: boolean;
  messageId?: string;
  reason?: string;
}

function getApiKey(): string | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping build-complete email");
    return null;
  }
  return apiKey;
}

// Best-effort origin for links embedded in emails when the job wasn't
// triggered from an HTTP request we could read a Host header from (e.g. a
// build job resumed at server startup). REPLIT_DOMAINS is a comma-separated
// list of the app's public domain(s); the first entry is used.
function fallbackOrigin(): string | null {
  const domains = process.env.REPLIT_DOMAINS;
  if (!domains) return null;
  const first = domains.split(",")[0]?.trim();
  return first ? `https://${first}` : null;
}

// Sends a plain-text notification to the admin who created a firm, once its
// build job has finished scoring every active portfolio company and the
// firm has flipped to "ready". Never throws — this is a best-effort
// notification on top of work that has already durably succeeded in
// Postgres, so a Resend outage must never be treated as a job failure.
export async function sendBuildCompleteEmail(params: {
  to: string;
  firmName: string;
  firmId: number;
  companyCount: number;
  originHint?: string;
}): Promise<EmailSendResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { attempted: false, success: false, reason: "RESEND_API_KEY not configured" };
  }

  const origin = params.originHint ?? fallbackOrigin();
  if (!origin) {
    logger.warn(
      { firmId: params.firmId },
      "No origin available (no request context and REPLIT_DOMAINS unset) — sending email without a link",
    );
  }
  const reviewUrl = origin ? `${origin}/admin/firms/${params.firmId}` : `/admin/firms/${params.firmId}`;

  const companyWord = params.companyCount === 1 ? "company" : "companies";
  const subject = `INVESQ: ${params.firmName} diagnostic is ready`;
  const text = [
    `The operational due-diligence build for ${params.firmName} is complete.`,
    ``,
    `${params.companyCount} portfolio ${companyWord} scored across all 8 pillars.`,
    ``,
    `Review it here: ${reviewUrl}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: [params.to],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const reason = `Resend API responded ${res.status}: ${body.slice(0, 500)}`;
      logger.error({ firmId: params.firmId, to: params.to }, reason);
      return { attempted: true, success: false, reason };
    }

    const json = (await res.json()) as { id?: string };
    logger.info({ firmId: params.firmId, to: params.to, messageId: json.id }, "Build-complete email sent via Resend");
    return { attempted: true, success: true, messageId: json.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ err, firmId: params.firmId, to: params.to }, "Build-complete email failed to send");
    return { attempted: true, success: false, reason: reason.slice(0, 1000) };
  }
}
