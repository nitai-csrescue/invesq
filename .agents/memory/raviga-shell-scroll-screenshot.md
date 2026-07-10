---
name: RavigaShell fixed-height layout hides content below the fold in screenshots
description: Screenshots of Raviga-shell pages can show the footer even when a lot of content is scrolled out of view, because the shell is a fixed h-screen flex column with an internal overflow-y-auto main area.
---

`RavigaShell` (and similar app shells with a sidebar + sticky footer) render as a fixed-height flex
column: `<div className="h-screen ..."><main className="flex-1 overflow-y-auto">{children}</main><footer className="shrink-0">...</footer></div>`.

The footer is a sibling of the scrollable `main`, not part of its scrolled content. Because of this,
a screenshot can show the footer sitting right at the bottom of the image even when most of the
page's actual content (e.g. a section added far down the page) is still scrolled out of view inside
`main`. Seeing the footer does NOT prove the page's full content rendered or fit on screen.

**Why:** Wasted a debugging cycle assuming a newly-added section wasn't rendering (isRaviga/data
checks must be false) when it was actually rendering correctly, just below the visible scroll
position — the footer's presence right after the last visible content block was misleading.

**How to apply:** When visually verifying a section far down a page inside this kind of shell, don't
trust "the footer is visible so I saw everything." Either (a) temporarily add a `console.log` of the
relevant render condition/data length and check it via the screenshot tool's browser-log output (fast,
reliable, remove before finishing), or (b) if truly need full-page visual proof, reduce content above
the target section (e.g. via a filter) so it fits within the 3000px screenshot cap.
