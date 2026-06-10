---
name: video-js artifact gotchas
description: Recurring pitfalls when building/finalizing video-js artifacts (DESIGN subagent output + scaffold typecheck)
---

## DESIGN subagent writes unquoted CSS units in framer-motion objects
The video-js DESIGN subagent sometimes emits bare CSS units inside framer-motion
`animate`/`initial` object values, e.g. `{ x: -10vw, y: -5vh }`. That is invalid
JS and breaks the Vite/babel build with `Syntax error "v"`. Tailwind class strings
like `text-[6vw]` are fine — only the JS object property values are the problem.
**How to apply:** after the subagent returns, grep for `:\s*-?[0-9.]+v[wh]\b` in
`src` and quote them as strings (`x: '-10vw'`). framer-motion accepts string units.

## Video-js scaffold tsconfig omits the DOM lib — `tsc` typecheck "fails" by design
The video scaffold extends `tsconfig.base.json` which sets `"lib": ["es2022"]`
(no `dom`) and `"types": []`. So `pnpm --filter @workspace/<video-slug> run typecheck`
(`tsc --noEmit`) reports many errors on the scaffold's OWN files (`hooks.ts`,
`main.tsx`) plus any DOM usage (`window`, `document`, `HTMLAudioElement`,
`PointerEvent.pointerType`). This is pre-existing template state — the sibling
`invesq-video` artifact fails with the identical error count.
**Why:** the video runs purely through Vite (esbuild/babel transforms, no `tsc`),
and recording/export never invokes `tsc`. **How to apply:** do NOT chase these
typecheck errors or edit the scaffold tsconfig on a video artifact. Verify a video
build with the dev server + `scripts/validate-recording.sh`, not `tsc`. The video-js
first-build flow explicitly waives code review/typecheck beyond recording validation.
