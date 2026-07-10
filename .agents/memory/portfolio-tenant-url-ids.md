---
name: Portfolio tenant portal company URL identifiers
description: What identifier the /:firmSlug/portfolio/:companyId route actually expects, and which firms it even resolves.
---

`/:firmSlug/portfolio/:companyId` (and its `/report`, `/gameplan` sub-routes) matches on `companies.slug` (a human-readable slug column, e.g. `nomis-solutions`), not the numeric Postgres `companies.id`. Passing the numeric id renders "Company not found" even though the company and its assessments exist.

**Why:** the frontend's `RawCompany.id` field has always been a slug string (inherited from the original static TS tenant files); `portfolioData.ts` preserves that by setting `id: c.slug` when reshaping DB rows back into `RawCompany` shape, so the DB-cutover didn't change the id contract callers rely on.

**How to apply:** when constructing or testing a tenant-portal company URL, look up `companies.slug`, not `companies.id`.

**Pipeline firms now resolve dynamically (updated 2026-07-10).** Previously `:firmSlug` only resolved for firms hardcoded in the static `firms.ts` registry, so AI-onboarding-pipeline firms rendered "Firm not found". That gap is closed: the frontend now merges a dynamic registry hydrated from `/portfolio/bootstrap` (`registerDynamicFirms`/`getAllFirms`) with the static list, so a pipeline firm renders at `/:firmSlug/portfolio` with no `firms.ts` edit. A pipeline firm still won't appear until (a) its `firms.meta` is set and (b) its companies carry full `CompanyMeta` — pre-existing firms built before the pipeline wrote full CompanyMeta need backfill + a re-run (see `report-export`/FIRM-ONBOARDING run-book), not a code change.
