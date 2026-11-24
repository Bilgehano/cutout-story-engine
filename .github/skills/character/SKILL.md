---
name: character
description: Interview the user, then build, register, and visually verify a new SVG puppet character.
agent: agent
---

# /character

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## PHASE 1 — Interactive Q&A (DO NOT WRITE CODE YET)
Inspect the user's input and every image in `refs/`. Briefly state what you see in the references (proportions, palette, line style). Then ask exactly these 6 numbered questions (skip nothing that is not already answered):
1. Character Name & Role (protagonist, side character, antagonist)?
2. Hair Style, Hair Color & Facial Hair?
3. Skin Tone, Eye Color & Distinguishing Facial Features (glasses, scars, cheekbones)?
4. Default Outfit & Alternative Scene Outfits (e.g., `dark_sweater`, `white_tshirt`, `jacket`)?
5. Gesture & Body Language Style (expressive hand movements while talking vs. calm/reserved)?
6. Voice Profile: Which language(s) will this character speak and what is their ElevenLabs `voiceId`?

Stop and wait for the answers.

## PHASE 2 — Build & Verify (after the user answers)
1. Build `src/components/characters/<CharacterName>.tsx` (PascalCase, export a `FC<CharacterProps>`) following SKILL.md:
   - Layered `<g>` groups in the exact SKILL.md order, 800x1000 canvas, anchor at bottom-center.
   - Auto-blinking every ~105 frames with a per-character phase offset.
   - `eyeLook` pupil offsets and `mood` eyebrows animated with `spring`.
   - All 9 Rhubarb visemes `X, A, B, C, D, E, F, G, H` in a complete switch.
   - Elbow-pivoted forearm gestures when `isTalking` is true (style from question 5).
   - Subtle breathing oscillation.
   - Customizable color props via `colors` (skin, hair, eyes, each outfit) and `outfit` selection.
   - `pose` support for `standing` and `sitting`; `flip` support.
   - 3px `#1E1B18` outlines, cheek/neck gradients, layered hair tufts.
2. Register it in `src/components/characters/index.ts` (key = lowercase id) and add to `story-bible.json` `characters`: `{ "id", "name", "role", "appearance", "outfits": [], "gestureStyle", "voices": { "<lang>": { "voiceId": "..." } } }`.
3. Visual QA (mandatory): render `out/char_<CharacterName>_check.png` with `npx remotion still Preview out/char_<CharacterName>_check.png --props="{\"characterId\":\"<id>\"}"`, plus the viseme sheet (`"mode":"visemes"`) as `out/char_<CharacterName>_visemes.png`. Look at the images, check proportions, outlines, face alignment, and distinct mouth shapes. Fix and re-render until clean.
4. Run `npm run typecheck`. Summarize the result and suggest `/environment`.
