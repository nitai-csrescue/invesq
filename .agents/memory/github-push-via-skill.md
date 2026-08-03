---
name: GitHub push via git-remote skill
description: Raw `git push origin` hangs in the shell; use the gitPush callback instead.
---
GitHub (origin) is connected and readable from the shell (`git ls-remote` works), but a plain `git push origin main` hangs until timeout — there is no credential helper in the shell environment.

**Why:** Replit injects GitHub credentials only through the git-remote skill callbacks, not into shell git.

**How to apply:** For any push/pull/PR against origin, use `gitPush({})` / `gitPull({})` / `createPullRequest({...})` via CodeExecution (see git-remote skill). Earlier NO_CREDENTIALS errors just meant the GitHub connection wasn't authorized yet at that time; re-check with `git ls-remote` before declaring it blocked.
