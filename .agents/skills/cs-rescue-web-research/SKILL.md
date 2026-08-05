---
name: cs-rescue-web-research
description: Stage 1 public-sources research procedure for INVESQ company onboarding and diagnostics. Use when researching a portfolio company's public signals (G2/Capterra reviews, Glassdoor, job postings, press, LinkedIn) before scoring or report writing — including capturing publicly disclosed ARR/revenue figures with source, date, and point-in-time vs run-rate classification.
---

# CS Rescue / INVESQ — Stage 1 Web Research

Stage 1 research is the public-sources sweep run for each portfolio company before any scoring or report writing. It gathers the qualitative signals the diagnostic relies on:

- G2 / Capterra / Gartner Peer Insights / TrustRadius review themes
- Glassdoor sentiment (esp. CS/support org signals)
- Careers pages and job postings (team structure, tooling, hiring momentum)
- Company blog, product pages, and trade press
- LinkedIn headcount and leadership signals

## ARR / revenue disclosure capture (CQ-46)

**Stage 1 research MUST also look for and record any publicly disclosed ARR or revenue figures for the target company.** Sources to sweep, alongside the signal sweep above:

- Press releases (company or acquirer/investor)
- Acquisition / merger / carve-out announcements
- Funding round coverage
- Trade press (e.g. Dark Reading, VentureBeat, ZDNet, Channel Futures — the outlets that corroborated Trellix's "almost $2 billion in revenue" from STG's Jan 2022 launch materials)

When a figure is found, capture **all three** of:

1. **The figure itself** (as stated — do not round away qualifiers like "almost", "over", "approximately")
2. **Source and publication date** (outlet + date; prefer the primary press release, note corroborating outlets)
3. **Point-in-time vs current run-rate flag** — whether the figure is a snapshot tied to an event (e.g. "revenue at time of merger/acquisition") or a stated current run-rate. **These must never be presented interchangeably in a client report.**

If no credible public figure exists, record that explicitly ("no public ARR/revenue disclosure found") — do not estimate or infer one.

## Output shape

The Stage 1 research summary must carry the ARR/revenue finding as a **discrete, sourced, dated entry** — not prose buried in a paragraph:

```
ARR/Revenue disclosure:
- Figure: almost $2.0B revenue
- Source: STG launch press release, Jan 2022 (corroborated: Dark Reading, VentureBeat, ZDNet, Channel Futures)
- As-of: 2022-01 (point-in-time — revenue at carve-out/launch, NOT a current run-rate)
```

This shape maps 1:1 onto the first-class columns shipped in CQ-45, so it can be copied straight into `companies.arr` / `companies.arr_as_of` / `companies.arr_source` without the report writer or a human backfilling it per-company. Until CQ-45's schema is live in prod, the entry still belongs in the Stage 1 summary so the figure + citation can be included manually in report narratives (as was done by hand for Trellix).

## Scope boundaries

- This skill covers research capture only. Scoring methodology, the pillar rubric, and the `cs-rescue-diagnostic-writer` flow are out of scope here; how the diagnostic writer consumes the ARR entry is a follow-on concern.
- Never write researched figures directly to real-tenant data as part of Stage 1 — capture goes into the research summary; data entry is its own reviewed step.
