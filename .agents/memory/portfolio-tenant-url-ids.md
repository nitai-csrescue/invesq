---
name: Portfolio tenant portal company URL identifiers
description: What identifier the /:firmSlug/portfolio/:companyId route actually expects, and which firms it even resolves.
---

`/:firmSlug/portfolio/:companyId` (and its `/report`, `/gameplan` sub-routes) matches on `companies.slug` (a human-readable slug column, e.g. `nomis-solutions`), not the numeric Postgres `companies.id`. Passing the numeric id renders "Company not found" even though the company and its assessments exist.

**Why:** the frontend's `RawCompany.id` field has always been a slug string (inherited from the original static TS tenant files); `portfolioData.ts` preserves that by setting `id: c.slug` when reshaping DB rows back into `RawCompany` shape, so the DB-cutover didn't change the id contract callers rely on.

**How to apply:** when constructing or testing a tenant-portal company URL, look up `companies.slug`, not `companies.id`.

**Pipeline (AI-onboarded) firms resolve dynamically.** `:firmSlug` resolves against a dynamic registry hydrated from `/portfolio/bootstrap` (`registerDynamicFirms`/`getAllFirms`) merged with the static `firms.ts` list, so a pipeline firm renders at `/:firmSlug/portfolio` with no `firms.ts` edit. It still won't appear until (a) its `firms.meta` is set and (b) its companies carry full `CompanyMeta`; firms built before the pipeline wrote full CompanyMeta need a backfill + re-run, not a code change.
