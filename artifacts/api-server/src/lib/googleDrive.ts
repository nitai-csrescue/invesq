import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger.js";

// Google Drive delivery for VALIDATED diagnostic report PDFs. Uses the Replit
// Google Drive connector via the SDK proxy (integration
// connection:conn_google-drive_..., wired with addIntegration + bound with
// proposeIntegration). The SDK injects the OAuth token and refreshes it
// automatically, so a fresh ReplitConnectors() is created per call and NEVER
// cached (tokens expire).
//
// Delivery layout: "INVESQ Customers/{Firm}/{Company}/{Company} - CS Diagnostic
// - {date}.pdf". The connector holds the drive.file scope, so it can only see
// and manage files IT created — which is exactly what the lookup-then-create
// folder logic relies on (the first ship builds the folder tree, later ships
// for the same firm/company reuse the app-created folders).

const ROOT_FOLDER = "INVESQ Customers";
const FOLDER_MIME = "application/vnd.google-apps.folder";

// Drive names can't safely contain path separators; collapse them so a firm or
// company name never forks the folder tree.
function sanitizeName(name: string): string {
  return name.replace(/[\\/]+/g, "-").trim() || "Unknown";
}

// Find a folder with `name` under `parentId` (or My Drive root when null),
// creating it if absent. Idempotent within app-created files.
async function findOrCreateFolder(
  client: ReplitConnectors,
  name: string,
  parentId: string | null,
): Promise<string> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`;
  const q = `mimeType = '${FOLDER_MIME}' and name = '${escaped}' and trashed = false${parentClause}`;
  const listRes = await client.proxy(
    "google-drive",
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { method: "GET" },
  );
  if (!listRes.ok) {
    throw new Error(`Drive folder lookup failed (${listRes.status}): ${await listRes.text()}`);
  }
  const listed = (await listRes.json()) as { files?: Array<{ id: string; name: string }> };
  if (listed.files && listed.files.length > 0) return listed.files[0].id;

  const createRes = await client.proxy("google-drive", "/drive/v3/files?fields=id", {
    method: "POST",
    body: {
      name,
      mimeType: FOLDER_MIME,
      ...(parentId ? { parents: [parentId] } : {}),
    },
  });
  if (!createRes.ok) {
    throw new Error(`Drive folder create failed (${createRes.status}): ${await createRes.text()}`);
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

  const res = await client.proxy(
    "google-drive",
    "/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
  }
  const uploaded = (await res.json()) as { id: string; webViewLink?: string | null };
  return { id: uploaded.id, webViewLink: uploaded.webViewLink ?? null };
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string | null;
  folderPath: string;
}

// Upload a validated report PDF into "INVESQ Customers/{Firm}/{Company}/",
// creating any missing folders. `dateIso` is the YYYY-MM-DD stamp used in the
// filename. Throws on any Drive API failure (the caller turns this into a 502).
export async function uploadReportToDrive(params: {
  firmName: string;
  companyName: string;
  dateIso: string;
  pdf: Buffer;
}): Promise<DriveUploadResult> {
  const client = new ReplitConnectors();
  const firm = sanitizeName(params.firmName);
  const company = sanitizeName(params.companyName);

  const rootId = await findOrCreateFolder(client, ROOT_FOLDER, null);
  const firmFolderId = await findOrCreateFolder(client, firm, rootId);
  const companyFolderId = await findOrCreateFolder(client, company, firmFolderId);

  const filename = `${company} - CS Diagnostic - ${params.dateIso}.pdf`;
  const uploaded = await uploadPdf(client, companyFolderId, filename, params.pdf);

  const folderPath = `${ROOT_FOLDER}/${firm}/${company}/`;
  logger.info({ fileId: uploaded.id, folderPath, filename }, "Shipped validated report to Google Drive");
  return { fileId: uploaded.id, webViewLink: uploaded.webViewLink, folderPath };
}
