---
name: cutout-story-engine
description: Make vertical (9:16) animated story-series episodes as 2D SVG cut-out puppet animation, rendered with Remotion, voiced by ElevenLabs and lip-synced with Rhubarb. Use when someone wants to create, plan, script, render or review an animated short, episode or series for TikTok, Reels or Shorts with recurring characters; to set up the cut-out animation engine in a folder; or when a project contains `.cutout-engine.json`. Four workflows - setup, create, video, review - from premise to finished MP4.
license: MIT
---

# Cutout Story Engine

Turns a premise into finished 1080x1920, 30 FPS episodes: the story and shooting script (`create`), code-drawn React + SVG puppets and sets plus voiced, lip-synced render (`video`), and a QA pass that records continuity (`review`). Everything a series produces stays in the user's project folder; this skill only carries the engine and the rules.

## Workflows

`/setup`, `/create`, `/video` and `/review` in these files mean the four workflows below, however your agent starts them (a slash command such as `/cutout-story-engine:setup`, or the user asking for "setup", "plan the next episode", "render it", "review it"). Open only the workflow you are running.

| User wants | Workflow |
| --- | --- |
| Start in a new folder, connect ElevenLabs, update the engine | `workflows/setup.md` |
| A new episode, the next episode, or changes to the current script | `workflows/create.md` |
| To build missing characters/sets and render the locked script | `workflows/video.md` |
| A quality check of the rendered episode | `workflows/review.md` |

Paths starting with `workflows/`, `references/`, `scripts/init.mjs` or `assets/` are inside this skill. Every other path (`src/`, `scripts/session.mjs`, `sessions/`, `story-bible.json`, `out/`) is inside the user's project, and commands run from the project folder.

## Before any workflow

1. **Find the project.** The project is the folder the user is working in. If it has no `.cutout-engine.json`, the only valid workflow is `/setup`, which installs the engine there with `node <skill>/scripts/init.mjs`.
2. **Keep the engine current.** Run `node <skill>/scripts/init.mjs --sync` from the project folder. It prints "up to date" and does nothing when the project already has this skill's engine; otherwise it replaces the changed engine files (old copies go to `.engine-backup/`, series data is never touched). If it says files were replaced, tell the user in one line; if it says dependencies changed, run `npm install`. Engine fixes belong in the skill, not in one project, because the next sync replaces them.
3. **Read the project's `AGENTS.md` once.** It is the non-negotiable constitution: setup gatekeeper, SVG-only art, show-don't-tell, the three speech modes and mandatory visual QA.

## Shared contracts (`src/types.ts`)

Canvas: **1080x1920 (9:16), 30 FPS**, 100% React + SVG in Remotion. Outline: `3px #1E1B18`, flat cel shading (one base tone + one shadow tone + optional highlight). No raster art, no external generative image/video APIs.

- `CharacterProps`: `pose`, `mouthShape`, `isTalking`, `eyeLook {x,y}` (-1..1), `mood`, `prevMood`, `moodBlend` (0..1), `gestureIntensity`, `flip`, `colors`.
- `BackgroundProps`: `timeOfDay`, `doorState` (0..1), `phoneVibrate`, `lightFlicker` (0..1), `children` (the character slot).
- Characters live in a `CHARACTER_BOX` of 600x1200 SVG units; the bottom-center of the box is the foot anchor placed on `CHARACTER_FLOOR_Y` (1500px). Draw with `viewBox="0 0 600 1200"`, `width="100%"`, `height="100%"`.
- Moods: `neutral | happy | sad | angry | surprised | worried`. Poses: `standing | sitting_desk | lying_floor`.
- Registries (`src/components/characters/index.ts`, `src/components/backgrounds/index.ts`) are automatic: every `<Component>.tsx` exporting `export const <Component>` is registered under that name, and `component` must equal `id`. Never edit the registries. Generated characters and environments belong to the series; the shared helpers `rig.tsx` and `layer.tsx` are engine files.
- On-screen words the engine draws itself (knock lettering, chat reactions) follow the episode `languageCode` via `src/components/locale.ts`; spoken lines are always written in the episode language.

## References (load on demand)

| Workflow | Read |
| --- | --- |
| `/create` | `references/sound.md` |
| `/video` | `references/characters.md` or `references/environments.md`, only when that kind of asset is missing |
| `/review` | `references/animation.md` |

## Token discipline

- Do not re-read a file already in context. Do not open `node_modules`, `package-lock.json`, `public/`, `out/*.json` or other episodes.
- Use `npm run session -- summary` for continuity instead of reading old plans or components.
- Render QA stills with `--scale=0.5 --log=error`; one sheet per asset; at most 2 fix rounds, then report what is left.
- Keep status reports short. Do not print file contents back to the user (the `/create` story presentation is the exception).
