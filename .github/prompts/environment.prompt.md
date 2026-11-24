---
name: environment
description: Interview the user, then build, register and visually QA a layered SVG environment with interactive props.
agent: agent
---

# /environment

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## Gatekeeper

Verify `.setup-complete`, `.env` (non-empty `ELEVENLABS_API_KEY`), `story-bible.json` and `bin/rhubarb`(`.exe`). If ANY is missing, HALT, list what is missing and tell the user to run `/setup`.

## Phase 1 - Detailed Q&A (DO NOT WRITE CODE YET)

Inspect the user's prompt and `refs/` (style-only). Ask these 4 numbered questions in one message and wait:

1. **Environment name, setting (indoor/outdoor) & camera angle**?
2. **Lighting & time-of-day variants** (`day`, `sunset`, `night`)?
3. **Interactive props & foreground layers** (e.g. desk rendered in front of a seated character, animated opening/closing door, vibrating smartphone prop on the desk, flickering lamp, scrolling window view)?
4. **Character alignment & pose**: which existing character(s) from `story-bible.json` appear here, and in what pose (`standing`, `sitting_desk`)?

## Phase 2 - Build & Visual QA (only after the user answered)

1. Create `src/components/backgrounds/<EnvironmentName>.tsx` (PascalCase, export a component named `<EnvironmentName>` typed `BackgroundComponent`) with the depth layers `back`, `mid`, `characterSlot` (render `children` here) and `foreground`, and the interactive prop states `timeOfDay`, `doorState`, `phoneVibrate`, `lightFlicker` driven only by props + `useCurrentFrame()`. Draw at 1080x1920, `3px #1E1B18` outlines, cel shading. Design the floor line at `y = 1500` (`CHARACTER_FLOOR_Y`) and leave room for characters at the requested positions; for `sitting_desk`, the desk belongs in `foreground`.
2. Register it in `src/components/backgrounds/index.ts` (`import` + registry entry; the key equals the environment id).
3. Add to `environments` in `story-bible.json`: `{ "id", "name", "setting", "timeOfDayVariants", "props", "description" }`.
4. Create `src/data/check.env.json` with a registered character inside, e.g. `{"environmentId":"<id>","characterId":"<characterId>","pose":"sitting_desk","timeOfDay":"night","phoneVibrate":true}`, and render:
   `npx remotion still src/index.ts EnvironmentCheck out/bg_<EnvironmentName>_check.png --props=src/data/check.env.json`
   Render additional stills for each time-of-day variant, an open door, and `lightFlicker < 1` when those props exist.
5. Visually inspect the PNGs and verify z-index alignment (character behind the desk/foreground, feet on the floor line, no clipping). Fix and re-render until clean. Run `npm run typecheck`.
6. Report the environment and QA image paths. Suggest `/video` next.
