# Cutout Animator Skill

This skill defines how every character, environment and episode in this repository is built. These are the core rules; open a reference file only when a command lists it.

Canvas: **1080x1920 (9:16), 30 FPS**, 100% React + SVG in Remotion. Outline: `3px #1E1B18`, flat cel shading (one base tone + one shadow tone + optional highlight). No raster art, no external generative image/video APIs.

## 1. Shared contracts (`src/types.ts`)

- `CharacterProps`: `pose`, `mouthShape`, `isTalking`, `eyeLook {x,y}` (-1..1), `mood`, `prevMood`, `moodBlend` (0..1), `gestureIntensity`, `flip`, `colors`.
- `BackgroundProps`: `timeOfDay`, `doorState` (0..1), `phoneVibrate`, `lightFlicker` (0..1), `children` (the character slot).
- Characters live in a `CHARACTER_BOX` of 600x1200 SVG units; the bottom-center of the box is the foot anchor placed on `CHARACTER_FLOOR_Y` (1500px). Draw with `viewBox="0 0 600 1200"`, `width="100%"`, `height="100%"`.
- Moods: `neutral | happy | sad | angry | surprised | worried`. Poses: `standing | sitting_desk | lying_floor`.
- Registries (`characters/index.ts`, `backgrounds/index.ts`) are automatic: every `<Component>.tsx` exporting `export const <Component>` is registered under that name, and `component` must equal `id`. Never edit the registries; generated characters and environments stay untracked, shared helpers (`rig.tsx`, `layer.tsx`) are tracked.

## References (load on demand)

| Command | Read |
| --- | --- |
| `/create` | `reference/sound.md` |
| `/video` | `reference/characters.md` or `reference/environments.md` only when that kind of asset is missing |
| `/review` | `reference/animation.md` |
| `/setup` | `reference/scaffold.md` only if a file cannot be restored |

## Token discipline

- Do not re-read a file already in context. Do not open `node_modules`, `package-lock.json`, `public/`, `out/*.json` or other episodes.
- Use `npm run session -- summary` for continuity instead of reading old plans or components.
- Render QA stills with `--scale=0.5 --log=error`; one sheet per asset; at most 2 fix rounds, then report what is left.
- Keep status reports short. Do not print file contents back to the user (the `/create` story presentation is the exception).
