---
name: connectors sandbox vs runtime
description: code_execution's listConnections()=0 does not mean a Replit connector is unbound; the server resolves it at runtime with its own identity.
---

# Connector availability: sandbox count is not ground truth

`listConnections("<connector>")` from the code_execution sandbox can return `0`
for a connector that the api-server uses successfully at runtime.

**Why:** the running server resolves connectors through its own proxy identity
(`@replit/connectors-sdk`, using the `REPL_IDENTITY` / renewal token present in
the server process). The code_execution sandbox runs under a different credential
scope that may not carry that token, so its `listConnections` returns an empty
list even while the connection is fully authorized for the server.

**How to apply:** when a Replit integration/connector "looks" disconnected from
code_execution, do NOT conclude it is unbound, add reconnection UX, or block on
it. Verify by exercising the actual server code path (hit the endpoint that uses
the connector). Observed live: `listConnections("google-drive")` = 0 in the
sandbox while the server performed a real Google Drive upload end-to-end.

Corollary: the sandbox also cannot make authenticated connector API calls it has
no credentials for (e.g. cannot delete a file the server created under
`drive.file` scope), so cleanup of connector-side artifacts must go through the
server, not the sandbox.
