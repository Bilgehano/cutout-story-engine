---
name: setup
description: Check dependencies, ask for channel language and voice, and initialize the Remotion project.
agent: agent
---

# /setup

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## Step 1 — Check system dependencies
Run and report each result:
- `node -v` (Node 18+ required)
- `ffmpeg -version` and `ffprobe -version`
- Rhubarb: check for `bin/rhubarb.exe` (Windows) or `bin/rhubarb` (macOS/Linux), including the `bin/res/` folder next to it.

If Rhubarb is missing, stop that step and tell the user: download the release for their OS from the `DanielSWolf/rhubarb-lip-sync` GitHub Releases page (https://github.com/DanielSWolf/rhubarb-lip-sync/releases), extract the executable and its `res/` folder into `bin/`, and on macOS/Linux run `chmod +x bin/rhubarb`. If FFmpeg or Node is missing, give install instructions for the user's OS.

## Step 2 — Ask two setup questions
Ask these before finalizing any configuration, and wait for the answers:
1. What is the primary target language for this channel (e.g., German `de`, English `en`, Turkish `tr`, Spanish `es`, French `fr`)?
2. What is your default ElevenLabs Voice ID? (May be left blank; it can be set in `.env` / `story-bible.json` later.)

## Step 3 — Initialize the project
- If `package.json` does not exist, initialize a Remotion + TypeScript project (React 18, `remotion`, `@remotion/cli`, `typescript`, `@types/react`, `tsconfig.json` with `resolveJsonModule`, `remotion.config.ts`, `src/index.ts`).
- Install `@remotion/media-utils` and `dotenv` (use the same version as `remotion` for all `@remotion/*` packages), then run `npm install`.
- If `package.json` already exists (the template ships with it), just run `npm install` and verify with `npm run typecheck`.

## Step 4 — Ensure directories exist
`refs/`, `bin/`, `src/components/characters/`, `src/components/backgrounds/`, `src/data/`, `public/audio/`, `public/lipsync/`, `out/`.

## Step 5 — Initialize / verify config and source files
Create each file only if missing; never overwrite user content. Update, do not replace, existing ones.
- `story-bible.json`: `defaultLanguage` = answer 1; `voiceProfiles[<lang>].defaultVoiceId` = answer 2 (empty string if blank); `characters: []`, `environments: []`, `episodes: []`.
- `.env.example` (with `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_ID`) and tell the user to copy it to `.env` and add their key. Never write a real key into a tracked file.
- `src/components/Subtitle.tsx`: safe-zone subtitle at `bottom: 360px`, white fill, thick `#1E1B18` outer stroke via `paintOrder: "stroke fill"`, chunked 3–4 words at a time.
- `src/EpisodeComposition.tsx`: supports scene `events` (door open/close, character entrance/exit via `enterFrom`/`exitTo`, `mood` and `eyeLook` shifts, `spring` jump reactions) and Ken Burns camera zoom.
- `src/Root.tsx` (compositions `Episode` and `Preview`), `src/PreviewComposition.tsx`, `src/components/types.ts`, and the two registries.

## Step 6 — Finish
Run `npm run typecheck`. Summarize what was checked, created, and what the user must still do (Rhubarb download, `.env` key). Suggest `/character` next.
