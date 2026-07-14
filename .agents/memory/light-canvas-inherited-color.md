---
name: Light-canvas scopes must re-declare color, not just CSS variables
description: Why white-on-white text keeps recurring in light-canvas areas of a force-dark app, and the scope-level fix.
---

The app force-adds `.dark` to `<html>`, so `body` computes a white text color. Descendants inherit that **computed** white value, not the `--foreground` variable. A light-canvas scope (e.g. `.raviga-canvas`) that only overrides the CSS *variables* to light-mode values fixes `text-foreground`-classed elements but NOT anything that merely inherits `color` -- notably the shadcn outline/ghost Button variants, which deliberately carry no text-color class. Result: white-on-white buttons.

**Why:** CSS custom-property overrides do not re-resolve an ancestor's already-computed `color`; inheritance passes the computed value down. Point fixes (adding `text-foreground` to individual buttons) let the bug recur with every new button.

**How to apply:** any light-background scope inside the dark app must declare `color: hsl(var(--foreground));` on the scope root itself (done for `.raviga-canvas`, covering AdminShell + TenantShell). When adding a new light-canvas wrapper, do the same. Note: portal-mounted overlays (popovers, dialogs, toasts) mount at `document.body`, outside the scope, and render dark-themed -- self-consistent, not a bug.
