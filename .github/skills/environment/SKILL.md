---
name: environment
description: Interview the user, then build, register, and visually verify a layered SVG environment.
agent: agent
---

# /environment

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## PHASE 1 — Interactive Q&A (DO NOT WRITE CODE YET)
Inspect the user's input and the images in `refs/`. Ask exactly these 4 numbered questions and wait:
1. Environment Name, Setting (indoor/outdoor) & Camera Perspective?
2. Lighting & Time-of-Day Variants (`day`, `sunset`, `night`)?
3. Interactive Props & Foreground Layers (e.g., desk in front of a seated character, animated opening/closing door, scrolling window view)?
4. Which existing character(s) will appear here and in what pose (`standing` vs `sitting`)? (List registered characters from `story-bible.json`.)

## PHASE 2 — Build & Verify (after the user answers)
1. Build `src/components/backgrounds/<EnvironmentName>.tsx` (PascalCase, export an `FC<BackgroundProps>`), 1080x1920, with layered depth in this order: `back`, `mid`, `{characterSlot}`, `foreground`.
   - `timeOfDay` changes palette and lighting overlays.
   - `doorState` / `doorProgress` drive the door animation when a door exists.
   - Floor line (standing) or seat line (sitting) exactly at `y = 1480`; foreground props (desks etc.) overlap the lower body correctly.
   - Follow art direction in `AGENTS.md`: `#1E1B18` outlines, gradients, cinematic palette, vignette.
2. Register it in `src/components/backgrounds/index.ts` (key = lowercase id) and add to `story-bible.json` `environments`: `{ "id", "name", "setting", "timesOfDay": [], "props": [], "hasDoor": true|false }`.
3. Visual QA (mandatory): render `out/bg_<EnvironmentName>_check.png` with a character placed inside using `npx remotion still Preview out/bg_<EnvironmentName>_check.png --props="{\"environmentId\":\"<id>\",\"characterId\":\"<charId>\",\"pose\":\"standing\"}"`. Also render at least one other `timeOfDay` (and `doorProgress` 1 if a door exists). Inspect for alignment, layering, and palette; fix until clean.
4. Run `npm run typecheck`. Summarize and suggest `/video`.
