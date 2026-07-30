---
name: cs-rescue INVESQ branding convention
description: User-facing copy in the cs-rescue artifact must say INVESQ, not "CS Rescue"
---

In `artifacts/cs-rescue`, the slug/dir stay "cs-rescue" but ALL user-visible chrome
must read **INVESQ** (the product was rebranded from "CS Rescue").

**Why:** The artifact predates the rebrand; mock data and the directory name still
use the old name, which makes it easy to accidentally write "CS Rescue" into new
user-facing copy. This violates the project convention documented in replit.md.

**How to apply:** When adding pages/sections, write product references as "INVESQ"
in headings, subtitles, copilot output, and titles — even if a user-supplied spec
says "CS Rescue". Underlying mock data (account names, signals) may stay as-is.

## Exception: CEATI client deliverable (/ceati)
The `/ceati` page ("CS Rescue · CEATI Operating Review") intentionally KEEPS the
"CS Rescue" branding, not INVESQ. **Why:** it is a separate client-facing demo
deliverable whose source spec/PDF is pervasively branded "CS Rescue · CEATI" and
references "BackEngine + AI reasoning"; the user supplied that exact title verbatim.
The INVESQ rule applies to the main investor-pitch chrome, not this standalone
customer demo. Do not "correct" /ceati to INVESQ without asking.

## Exception: Prenax prototype (/prenax routes)
The `/prenax`, `/prenax/portfolio`, `/prenax/customers/:id` pages are a self-contained
"Prenax Customer Health Intelligence" demo intentionally branded **Prenax**, NOT
INVESQ or CS Rescue. **Why:** the user asked for a distinct enterprise-SaaS product
prototype (a separate brand) living inside the cs-rescue app; it bypasses the INVESQ
shell and sets its own dark theme. Do not "correct" Prenax copy to INVESQ.
**How to apply:** these pages live under `src/pages/prenax/` + `src/components/prenax/`
with their own data layer (`src/data/prenax.ts`); keep all changes scoped there and do
not edit the global `src/index.css` theme tokens.
**Tone/scope (durable):** Prenax is framed as a Phase-1 *consulting diagnostic* on
Salesforce Service Cloud data for a board/PE audience — NOT a production CS platform and
NOT an AI copilot. Use "Recommended Actions"; avoid copilot/automation language
("AI Recommendations", "automated decisions", etc.). Keep it to 4 screens (Overview,
Portfolio table, Account drilldown, Methodology) and keep the DARK theme (user confirmed).

## Exception: client-facing diagnostic PDF export (api-server lib/pdf)
The 7-page diagnostic report PDF carries the **CS RESCUE** mark (navy CS + orange
RESCUE), NOT INVESQ — wordmark, header/footer brand stamps, page-6 "Prepared by"
block, and the cover Organization line. **Why:** Nitai explicitly signed off
(2026-07-30) on matching the handmade client PDFs. **How to apply:** the swap is
PDF-render-time ONLY — `PREPARED_BY.org` stays "INVESQ" (it feeds meta shown in
the portal report-workflow UI); the cover maps the un-overridden default via
`PDF_PREPARED_BY_ORG`. Narrative prose and portal/web chrome still say INVESQ.
Do not "correct" the PDF marks back to INVESQ, and do not let CS Rescue leak
into portal UI via shared constants.

## Exception: cs-rescue-video artifact (Techstars demo)
The `artifacts/cs-rescue-video` artifact ("CS Rescue Product Demo Video") is
intentionally branded **CS Rescue**, NOT INVESQ. **Why:** it was built for a
Techstars accelerator application whose form describes the product as "CS Rescue —
an AI-native operational intelligence platform"; the user wants the demo video to
match that submission verbatim. Do not "correct" this video to INVESQ.
