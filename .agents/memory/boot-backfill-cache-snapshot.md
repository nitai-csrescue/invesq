---
name: Boot-time DB backfill vs in-memory response cache
description: A startup data refresh racing a cache-on-first-request response payload serves a stale mid-refresh snapshot until the instance restarts.
---

The rule: when a boot-time routine rewrites DB rows AND a response payload is cached in memory on first successful load, the first request can land mid-refresh and freeze a partially-refreshed snapshot for the life of the instance. The routine must explicitly invalidate the response cache after it finishes writing.

**Why:** During the PortCo composite prod cutover, the deployed api-server's bootstrap cache was populated while the row-by-row rubric refresh was still running; the live payload showed `rubric=null` for not-yet-refreshed rows even though the DB was fully correct minutes later. Harmless in that instance only because the client fallback recomputed with the same shared engine, so displayed bands matched the DB.

**How to apply:** Any new boot backfill that writes tables feeding a cached payload must call the cache's invalidate function after completing. When verifying a prod cutover, verify the DB directly AND the served payload separately; also confirm WHICH row the UI headlines (latest assessment) before promising specific user-visible values — a flipped historical row does not change the headline band.
