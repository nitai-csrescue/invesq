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

## Redesigning a video that has a custom control/audio overlay
Some video artifacts diverge from the stock video-js template: `VideoTemplate`
exports `SCENE_DURATIONS` (+ a `SCENE_COMPONENTS` map), takes
`{durations, loop, muted, onSceneChange}` props, drives a scene-synced `<audio>`,
and its hook returns a string `currentSceneKey` (not numeric `currentScene`); a
sibling `VideoWithControls` + `useSceneControls` render the on-screen scrub/mute/loop
bar off those exports. **When delegating a redesign to the DESIGN subagent, pass
this contract as explicit factual constraints** — otherwise it rewrites
`VideoTemplate` to the standard numeric-`currentScene` pattern and the control bar +
audio break.
**Why:** the subagent follows the stock skill template by default and has no way to
know the overlay exists. **How to apply:** also remember audio is fixed-length —
whenever the redesign changes the `SCENE_DURATIONS` total, regenerate
`public/audio/bg_music.mp3` to cover the new full runtime (slightly longer) so it
never runs out or restarts audibly; the main agent owns audio generation since the
subagent hands it back.

## "Guided product walkthrough" means real interactive UI, not panning a screenshot
For the cs-rescue demo video, the user wants the cursor to click into REAL rendered
data tables that visibly react (row highlights + a drill-down drawer/inline expand
with deeper metrics) — NOT a cursor gliding over a static product screenshot being
zoomed. Section titles/headlines belong in a persistent top header (with a sub-line
that updates as the cursor drills in), NOT as a label attached to the cursor.
**Why:** they explicitly rejected the zoom-over-screenshot approach and the
cursor-attached label on review. **How to apply:** when asked for an "interactive"
or "guided walkthrough" video, build live JSX tables/components the cursor operates;
treat product screenshots as at most secondary context, not the interaction itself.

The cursor tip must visibly LAND on the element it clicks. Don't position it with
hand-guessed vw/vh — put a ref on each click target, measure getBoundingClientRect()
on the move-phase, and set the cursor in px (offset the tip ~6px for the 48px SVG
whose hotspot is at ~6,6). Also reserve the drill-down drawer's width from the start
(fixed-width table + drawer, `shrink-0`) so rows don't reflow/shift when the drawer
opens and slide out from under the cursor at click time.
**Why:** the user specifically asked that the cursor be over the relevant object when
it clicks; flex-1 table + late-mounting drawer was moving the row mid-click.
