import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger.js";

// Google Drive delivery for VALIDATED diagnostic report PDFs. Uses the Replit
// Google Drive connector via the SDK proxy (integration
// connection:conn_google-drive_..., wired with addIntegration + bound with
// proposeIntegration). The SDK injects the OAuth token and refreshes it
// automatically, so a fresh ReplitConnectors() is created per call and NEVER
// cached (tokens expire).
//
// Delivery layout: "{SharedRoot}/{Firm}/{Company}/{Company} - CS Diagnostic
// - {date}.pdf" where {SharedRoot} is the shared-drive folder
// "INVESQ: Customer Reports Generated via Admin Dash".
//
// IMPORTANT: The Google identity the connector authenticates with MUST be a
// member of the shared drive with "Contributor" or "Content Manager" access.
// Without that, every upload returns 403 Forbidden even with the correct
// folder ID. If that happens, the error message below includes the drive ID
// so the admin can verify membership in the Drive sharing panel.

const FOLDER_MIME = "application/vnd.google-apps.folder";

// One retry (with a short delay) on transient Drive API failures: network
// errors and 429/5xx responses. 4xx auth/permission errors are NOT retried —
// they always mean a human step (shared-drive membership, reconnecting the
// integration) and retrying just delays the real error message.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function proxyWithRetry(
  client: ReplitConnectors,
  path: string,
  init: Parameters<ReplitConnectors["proxy"]>[2],
): Promise<Response> {
  try {
    const res = await client.proxy("google-drive", path, init);
    if (!RETRYABLE_STATUSES.has(res.status)) return res;
    logger.warn({ path, status: res.status }, "Transient Drive API error; retrying once");
  } catch (err) {
    logger.warn({ path, err }, "Drive API network error; retrying once");
  }
  await new Promise((r) => setTimeout(r, 1500));
  return client.proxy("google-drive", path, init);
}

// The shared-drive folder that serves as the root for all report uploads.
// Lives in shared drive 0AKg0kCdcXPNiUk9PVA. Never auto-created — it must
// exist before any upload, and the authenticated identity must have Contributor
// or Content Manager access to the shared drive.
const SHARED_ROOT_FOLDER_ID = "1UyiT9Z_MRYPpz3dF1_IYfGAqyoJeB8lf";
const SHARED_DRIVE_ID = "0AKg0kCdcXPNiUk9PVA";
const SHARED_ROOT_DISPLAY = "INVESQ: Customer Reports Generated via Admin Dash";

// Drive names can't safely contain path separators; collapse them so a firm or
// company name never forks the folder tree.
function sanitizeName(name: string): string {
  return name.replace(/[\\/]+/g, "-").trim() || "Unknown";
}

// Find a folder with `name` under `parentId` (which may be in a shared drive),
// creating it if absent. All calls include supportsAllDrives=true so the Drive
// API traverses shared drives in addition to My Drive.
async function findOrCreateFolder(
  client: ReplitConnectors,
  name: string,
  parentId: string,
): Promise<string> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const q = `mimeType = '${FOLDER_MIME}' and name = '${escaped}' and '${parentId}' in parents and trashed = false`;
  const listRes = await proxyWithRetry(
    client,
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { method: "GET" },
  );
  if (!listRes.ok) {
    const body = await listRes.text();
    if (listRes.status === 403) {
      throw new Error(
        `Drive folder lookup failed (403 Forbidden): ensure the Google identity has "Contributor" or "Content Manager" access to shared drive ${SHARED_DRIVE_ID}. Response: ${body}`,
      );
    }
    throw new Error(`Drive folder lookup failed (${listRes.status}): ${body}`);
  }
  const listed = (await listRes.json()) as { files?: Array<{ id: string; name: string }> };
  if (listed.files && listed.files.length > 0) return listed.files[0].id;

  const createRes = await proxyWithRetry(
    client,
    "/drive/v3/files?fields=id&supportsAllDrives=true",
    {
      method: "POST",
      body: {
        name,
        mimeType: FOLDER_MIME,
        parents: [parentId],
      },
    },
  );
  if (!createRes.ok) {
    const body = await createRes.text();
    if (createRes.status === 403) {
      throw new Error(
        `Drive folder create failed (403 Forbidden): ensure the Google identity has "Contributor" or "Content Manager" access to shared drive ${SHARED_DRIVE_ID}. Response: ${body}`,
      );
    }
    throw new Error(`Drive folder create failed (${createRes.status}): ${body}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function uploadPdf(
  client: ReplitConnectors,
  folderId: string,
  filename: string,
  pdf: Buffer,
): Promise<{ id: string; webViewLink: string | null }> {
  const boundary = `invesq_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata = { name: filename, parents: [folderId] };
  const preamble =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/pdf\r\n\r\n`;
  const epilogue = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(preamble, "utf8"), pdf, Buffer.from(epilogue, "utf8")]);

  const res = await proxyWithRetry(
    client,
    "/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!res.ok) {
    const responseText = await res.text();
    if (res.status === 403) {
      throw new Error(
        `Drive upload failed (403 Forbidden): ensure the Google identity has "Contributor" or "Content Manager" access to shared drive ${SHARED_DRIVE_ID}. Response: ${responseText}`,
      );
    }
    throw new Error(`Drive upload failed (${res.status}): ${responseText}`);
  }
  const uploaded = (await res.json()) as { id: string; webViewLink?: string | null };
  return { id: uploaded.id, webViewLink: uploaded.webViewLink ?? null };
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string | null;
  folderPath: string;
}

// Upload a validated report PDF into the shared-drive folder
// "{SharedRoot}/{Firm}/{Company}/", creating any missing subfolders.
// `dateIso` is the YYYY-MM-DD stamp used in the filename.
// Throws on any Drive API failure (the caller turns this into a 502).
// If the Google identity lacks shared-drive access the thrown message
// includes SHARED_DRIVE_ID to help the admin locate the correct drive.
export async function uploadReportToDrive(params: {
  firmName: string;
  companyName: string;
  dateIso: string;
  pdf: Buffer;
}): Promise<DriveUploadResult> {
  const client = new ReplitConnectors();
  const firm = sanitizeName(params.firmName);
  const company = sanitizeName(params.companyName);

  // Use the fixed shared-drive folder as root -- never search for it by name,
  // which would fail against a shared drive without supportsAllDrives flags.
  const firmFolderId = await findOrCreateFolder(client, firm, SHARED_ROOT_FOLDER_ID);
  const companyFolderId = await findOrCreateFolder(client, company, firmFolderId);

  const filename = `${company} - CS Diagnostic - ${params.dateIso}.pdf`;
  const uploaded = await uploadPdf(client, companyFolderId, filename, params.pdf);

  const folderPath = `${SHARED_ROOT_DISPLAY}/${firm}/${company}/`;
  logger.info(
    { fileId: uploaded.id, folderPath, filename, sharedDriveId: SHARED_DRIVE_ID },
    "Shipped validated report to shared Google Drive folder",
  );
  return { fileId: uploaded.id, webViewLink: uploaded.webViewLink, folderPath };
}
