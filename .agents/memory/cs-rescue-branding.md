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

## Exception: cs-rescue-video artifact (Techstars demo)
The `artifacts/cs-rescue-video` artifact ("CS Rescue Product Demo Video") is
intentionally branded **CS Rescue**, NOT INVESQ. **Why:** it was built for a
Techstars accelerator application whose form describes the product as "CS Rescue —
an AI-native operational intelligence platform"; the user wants the demo video to
match that submission verbatim. Do not "correct" this video to INVESQ.
