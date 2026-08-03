---
name: Dispute/queue resolution needs atomic claim
description: Any resolve-a-pending-row endpoint must claim the row conditionally inside the transaction, not precheck-then-update.
---
Rule: for "resolve a pending record" endpoints (disputes, approvals, queues), the transaction must start with `UPDATE ... SET status=... WHERE id=? AND status='pending' RETURNING`; if 0 rows, return 409 and do nothing else. A read-then-update precheck is advisory only.

**Why:** architect review caught that two concurrent admins could both pass a precheck, both mutate, and write duplicate audit rows — violating the "exactly one audit row per change" invariant. Verified fix with simultaneous apply/reject: one 200, one 409, one audit row.

**How to apply:** whenever adding a resolve/approve/claim endpoint, put the conditional claim first inside the tx and gate all subsequent writes on it.
