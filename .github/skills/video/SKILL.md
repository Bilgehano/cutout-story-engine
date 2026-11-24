---
name: video
description: Turn a story concept into a Show-Don't-Tell screenplay, run the audio + lip-sync pipeline and render the episode.
agent: agent
---

# /video

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## Gatekeeper

Verify `.setup-complete`, `.env` (non-empty `ELEVENLABS_API_KEY`), `story-bible.json` and `bin/rhubarb`(`.exe`). If ANY is missing, HALT, list what is missing and tell the user to run `/setup`.

## Step 1 - Character roster & casting gate (MANDATORY)

1. Analyze the story concept/script and list every distinct character who appears or speaks (the Storyteller is not a character).
2. Read `characters` in `story-bible.json`.
3. **Missing character block:** if the story needs more characters than exist (e.g. Protagonist + Caller/Visitor, but only 1 character exists), **STOP IMMEDIATELY**, name the missing role(s) and tell the user to run `/character` to create them first. Do not generate any audio or script files.
4. **Role casting confirmation:** if enough characters exist and the user has NOT explicitly mapped every story role to a created character name, **STOP and ask** (e.g. "Which character plays Role A, and which plays Role B?") before generating audio or script files.
5. Also confirm at least one registered environment fits each scene; otherwise tell the user to run `/environment`.

## Step 2 - Show-Don't-Tell screenplay & audio direction

Write `src/data/draft_script.json` (schema: `.github/skills/cutout-animator/schemas/draft_script.schema.json`) with `episodeNumber` (next number after `story-bible.json` `episodes`), `languageCode` (default: `story-bible.json` `defaultLanguage` unless the user overrides it) and `scenes`.

- Every spoken or heard beat is a `lines[]` entry with `lineType` `"narration"`, `"thought"` or `"dialogue"` and a `speakerId` (`"narrator"` for narration, otherwise a registered `characterId`).
- Strip ALL verbal descriptions of physical actions from dialogue and narration. Convey them with rich scene `ambience` prompts, timed `sfx` cues (ElevenLabs Sound Generation) and synchronized visual `events` (`phoneVibrate`, `doorState`, `eyeLook`, `mood`, `jump`, `characterEnter`, `lightFlicker`) so the viewer experiences the scene visually and acoustically. Align each `sfx.atSec` with its matching event `atSec`.
- `thought` lines need accompanying `eyeLook`/`mood` events; `narration` lines need none.
- If the user gave only a loose idea (no clear narrator / speakers / inner thoughts), present the structured beat sheet (Narration vs. Thought vs. Dialogue + SFX plan) and ask for a quick confirmation. If the user provided full scene directions, proceed directly.

## Step 3 - Pipeline execution

1. Run `node .github/skills/cutout-animator/scripts/produce.mjs`. It generates cached ElevenLabs TTS, ambience and sound effects, runs FFmpeg + Rhubarb **only on `"dialogue"` lines**, measures durations with `ffprobe`, writes `src/data/episode.json` and renders `out/episode_<number>.mp4`.
2. Re-renders after animation-only changes reuse the SHA-256 audio cache and cost 0 credits. Report the credit usage line printed by the script.
3. If the script fails, fix the cause (draft script, missing voice, missing binary) and re-run; do not hand-edit `episode.json`.
4. Tell the user to run `/review`.
