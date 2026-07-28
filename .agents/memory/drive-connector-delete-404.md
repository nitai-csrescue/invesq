---
name: Google Drive connector proxy DELETE 404
description: The Replit google-drive connector proxy returns 404 for DELETE /drive/v3/files/{id}; use PATCH trashed=true instead.
---

DELETE requests through `ReplitConnectors().proxy("google-drive", "/drive/v3/files/{id}?supportsAllDrives=true", { method: "DELETE" })` return 404 even for files the same session just created and can GET/PATCH.

**Why:** observed 2026-07-28 while cleaning up scratch test uploads; PATCH `{ trashed: true }` on the identical file IDs returned 200 immediately after DELETE 404'd, so it is a proxy method issue, not permissions or a race.

**How to apply:** for any Drive cleanup through the connector, trash with PATCH `{ trashed: true }` instead of DELETE. Also: the connection itself was verified healthy end-to-end (auth, shared-root read, folder create, multipart upload) — a generic "upload failed" toast does not imply a broken connection; transient 5xx/network blips are retried once in `googleDrive.ts`.
