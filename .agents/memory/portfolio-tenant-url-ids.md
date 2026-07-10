---
name: Portfolio tenant portal company URL identifiers
description: What identifier the /:firmSlug/portfolio/:companyId route actually expects, and which firms it even resolves.
---

`/:firmSlug/portfolio/:companyId` (and its `/report`, `/gameplan` sub-routes) matches on `companies.slug` (a human-readable slug column, e.g. `nomis-solutions`), not the numeric Postgres `companies.id`. Passing the numeric id renders "Company not found" even though the company and its assessments exist.

**Why:** the frontend's `RawCompany.id` field has always been a slug string (inherited from the original static TS tenant files); `portfolioData.ts` preserves that by setting `id: c.slug` when reshaping DB rows back into `RawCompany` shape, so the DB-cutover didn't change the id contract callers rely on.

**How to apply:** when constructing or testing a tenant-portal company URL, look up `companies.slug`, not `companies.id`. Separately, `:firmSlug` only resolves for firms present in the static `firms.ts` registry (the 5 legacy migrated tenants) — a firm created through the newer AI onboarding pipeline (`/admin/firms`) has real DB data but renders "Firm not found" on `/:firmSlug/portfolio` until `firms.ts` is updated too; that's a separate, known gap from the DB cutover, not a bug to chase.
