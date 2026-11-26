# AGENTS.md - Workspace Constitution

These rules are non-negotiable. All repository content (docs, prompts, code, comments, JSON, logs) is written in English. Core rules are in `.github/skills/cutout-animator/SKILL.md`; read it once, and its reference files only when a command lists them.

## 1. Hard `/setup` Gatekeeper

Before executing `/create`, `/video` or `/review`, verify that ALL of these exist:

- `.setup-complete` with the MCP verification receipt; `/create` must also pass its live, read-only MCP check
- `.env` containing a non-empty `ELEVENLABS_API_KEY`
- `story-bible.json`
- `bin/rhubarb` (or `bin/rhubarb.exe` on Windows)

If ANY are missing: **HALT IMMEDIATELY**, list exactly what is missing, and instruct the user to run `/setup` first. Do not write code, audio or scripts.

After setup, `/create` owns every creative decision. The newest numbered `sessions/episode-N` is active, even if unfinished. `/video` builds missing puppets and sets, checks their stills and renders the locked plan without interviews or creative substitutions. Route unresolved planning decisions to `/create`. Generated components and audio are shared; the brief, design snapshots, timeline, stage receipts and produced episode data belong to their episode.

## 2. 100% Code-Driven SVG Architecture

External generative image/video APIs (`fal.ai`, Midjourney, Kling, Runway, etc.) are strictly forbidden. All characters and environments are modular, layered React + SVG components rendered in Remotion at `1080x1920` (9:16 vertical), `30 FPS`. The only external generative service allowed is ElevenLabs, and only for speech, sound effects and ambience.

## 3. Style-Only Reference Policy (`refs/`)

Images in `refs/` are strictly **art-style, line-weight (`3px #1E1B18`) and cel-shading references**. NEVER clone the same face/hair across different characters unless the user explicitly asks for it. Each character gets a distinct silhouette, proportions, hair and palette.

## 4. Show, Don't Tell (Zero Action Narration)

Characters and the storyteller MUST NEVER verbally describe physical actions, device notifications, footsteps, door movements or ambient events (never "My phone vibrates", never "The door opens"). Every physical action is conveyed through ElevenLabs **Sound Effects (`sfx`)**, continuous **Scene Ambience (`ambience`)** and synchronized **Visual SVG Animations** (`events`).

## 5. 3-Mode Speech & Lip-Sync Rule

Every script segment is exactly one of:

- `"dialogue"`: spoken aloud by a character (`character.voiceId`). Rhubarb lip-sync runs; that character's mouth and arms move.
- `"thought"`: a character's inner monologue (`character.voiceId`). The character's mouth MUST stay closed (`mouthShape="X"`, `isTalking=false`); the character reacts only via `eyeLook` and `mood` eyebrows.
- `"narration"`: spoken by the Storyteller (`narratorVoiceId`, speaker `"narrator"`). ALL character mouths MUST stay closed (`mouthShape="X"`, `isTalking=false`).

## 6. Mandatory Visual QA

Every newly created or edited character/environment SVG must be rendered to a PNG still via `npx remotion still` into `out/` and visually inspected before you finish. Fix defects and re-render until the still is clean.

## Operating Notes

- Never commit or print secrets. `.env`, `story-bible.json`, `refs/`, `bin/`, generated characters/environments, audio caches, `src/data/` and `out/` are git-ignored.
- Audio is cached by SHA-256; re-renders after animation tweaks must cost 0 ElevenLabs credits. Never delete `public/audio`, `public/sfx` or `public/ambience` caches without asking.
- Cast only characters registered in `story-bible.json`; never invent a `voiceId`.
- Run `npm run typecheck` after changing TypeScript.
