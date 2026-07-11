---
name: Deployment-pane secrets vs workspace secret store
description: Why a secret "added in Publishing settings" can still be invisible to the running server, and the reliable fix.
---

# Deployment-pane secrets vs workspace secret store

Replit has two distinct places a secret/env var can live:

1. **Workspace secret store** — what `viewEnvVars()` reports and what feeds
   BOTH dev and prod (all the app's real keys live here: ANTHROPIC_API_KEY,
   GOOGLE_CLIENT_SECRET, RESEND_API_KEY, NOTION_API_KEY, DATABASE_URL, ...).
2. **Deployment-pane secrets** — entered in the Publishing/Deployment settings
   UI. This is a SEPARATE store. `viewEnvVars()` does NOT see it, and a value
   entered there does not necessarily reach `process.env` of the running
   deployed process.

**Symptom seen:** a feature gated on `process.env.VALIDATOR_EMAILS` reported
"unset" in prod even though the user had added it as a deployment secret in
Publishing settings before republishing. The code read the correct name at
request time and parsed the format fine — the value simply was not in the store
the server reads. `viewEnvVars({keys:["VALIDATOR_EMAILS"]})` returned
`{secrets:{VALIDATOR_EMAILS:false}}` confirming absence from the workspace store.

**Reliable fix:** put the value in the workspace store (the same place every
other key lives), scope `shared` so dev+prod both get it, then Republish so the
running deployment picks it up. A newly-added shared value does NOT reach an
already-running deployment until the next Publish.

**Why:** the deployment-pane path is easy to mis-save and is not visible to the
agent's tooling, so it is unverifiable and unreliable. The workspace shared
store is the canonical, verifiable path.

**How to apply:** when a prod env/secret "is set but the server says unset,"
first `viewEnvVars` the workspace store. If absent there, that's the cause —
don't assume it's a caching/module-load code bug. Set it in `shared` and tell
the user prod needs one more Republish. (Non-credential config like an email
allowlist can be set with `setEnvVars`; true secrets go through the user.)
