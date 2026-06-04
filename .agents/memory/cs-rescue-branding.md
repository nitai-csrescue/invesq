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
