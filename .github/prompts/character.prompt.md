---
name: character
description: Interview the user, then build, register and visually QA a layered SVG puppet character.
agent: agent
---

# /character

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## Gatekeeper

Verify `.setup-complete`, `.env` (non-empty `ELEVENLABS_API_KEY`), `story-bible.json` and `bin/rhubarb`(`.exe`). If ANY is missing, HALT, list what is missing and tell the user to run `/setup`.

## Phase 1 - Detailed Q&A (DO NOT WRITE CODE YET)

Inspect the user's prompt and any images in `refs/` (style-only: line weight `3px #1E1B18`, cel shading; never copy a face). Summarize what you already know, then ask these 6 numbered questions in one message and wait:

1. **Character name & story role** (protagonist, best friend, mysterious caller, boss, ...)?
2. **Hair style, hair color & facial hair**?
3. **Skin tone, eye color & distinguishing features** (glasses, scars, freckles, jawline, build)?
4. **Default outfit & alternative outfits**, plus supported poses (`standing`, `sitting_desk`)?
5. **Body language & gesture intensity** (`calm`, `moderate`, `expressive`)?
6. **Character voice ID (`voiceId`)**: an ElevenLabs Voice ID for this character. If left blank, you will query `GET https://api.elevenlabs.io/v1/voices` and automatically assign a distinct voice matching their gender/age/personality that does NOT collide with `narratorVoiceId` or any existing character's `voiceId` in `story-bible.json`.

If the voice ID is blank, run the lookup yourself (respect the plan tier: premade voices only on the Free tier), pick a non-colliding voice and tell the user the name + id.

## Phase 2 - Build & Visual QA (only after the user answered)

1. Create `src/components/characters/<CharacterName>.tsx` (PascalCase, export a component named `<CharacterName>` typed `CharacterComponent` from `src/types.ts`) following the SKILL.md layer hierarchy:
   - layered named `<g>` groups, `viewBox="0 0 600 1200"`, `3px #1E1B18` outlines, cel shading;
   - auto-blink every ~105 frames (per-character phase offset), `eyeLook` pupils, `mood` eyebrows blended with `moodBlend` (spring);
   - ALL 9 Rhubarb visemes `X, A, B, C, D, E, F, G, H` via a switch-case;
   - elbow-pivoted forearm gestures ONLY when `isTalking` is true, scaled by `gestureIntensity`;
   - subtle breathing oscillation;
   - customizable color props via `colors`;
   - both poses requested in Q4.
2. Register it in `src/components/characters/index.ts` (`import` + registry entry; the key equals the character id).
3. Add to `characters` in `story-bible.json`: `{ "id", "name", "role", "voiceId", "gestureIntensity", "poses", "outfits", "description" }`.
4. Create `src/data/check.char.json` (`{"characterId":"<id>","pose":"standing"}`) and render:
   `npx remotion still src/index.ts CharacterCheck out/char_<CharacterName>_check.png --props=src/data/check.char.json`
   Also render a `sitting_desk` check and one with `mouthShape` set to a wide-open viseme (e.g. `"D"`, `isTalking: true`) when applicable.
5. Visually inspect the PNG(s): proportions, outline weight, shading, face alignment, layer order. Fix and re-render until clean. Run `npm run typecheck`.
6. Report the character, assigned voice, and the QA image paths. Suggest `/environment` next (or `/video` if environments exist).
