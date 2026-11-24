---
name: video
description: Write the draft script in the chosen language and run the audio-first pipeline to render an episode.
agent: agent
---

# /video

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## Step 1 — Confirm inputs
Read `story-bible.json`: `defaultLanguage`, `voiceProfiles`, registered `characters`, `environments`, and previous `episodes` (continuity, last cliffhanger). If no characters or environments exist, tell the user to run `/character` and `/environment` first.

If the user has not specified them, ask (and wait):
- The **video/voiceover language** for this episode (e.g., German `de`, English `en`, Turkish `tr`, Spanish `es`, French `fr`); the channel default is `defaultLanguage`.
- The target duration (e.g., 65–75 s for TikTok Creator Rewards).
- The story topic / plot outline.

## Step 2 — Write `src/data/draft_script.json`
Schema per SKILL.md §6. Include `episodeNumber` (next unused), `title`, `languageCode` (ISO 639-1), `scenes`. Each scene: `environmentId`, `timeOfDay`, `doorState`, `camera`, `characters` (with `slot`, `pose`, `outfit`), `lines` and `events`.
- Every line has `characterId`, `text` in the chosen language (natural, native-quality, correct diacritics) and `voiceId` (from the character's `voices[languageCode]`, else the voice profile). Short, punchy lines suited to vertical video; end the episode on a hook or cliffhanger.
- Use intra-scene `events` for physical beats: `doorOpen`/`doorClose`, `enter` (`enterFrom`), `exit`, `mood`, `eyeLook`, `jump`. Place them with `atSec`, or `atLine` + `offsetSec`.
- Estimate length at ~2.5 words per second to hit the target duration, then correct with real audio.

## Step 3 — Produce
Confirm `.env` has `ELEVENLABS_API_KEY` (never print it). Run:

```bash
node .github/skills/cutout-animator/scripts/produce.mjs
```

The script generates ElevenLabs audio in the selected language, converts it to 16 kHz mono WAV via FFmpeg, runs Rhubarb, measures durations with `ffprobe`, writes `src/data/episode.json`, and renders `out/episode_<number>.mp4`. If the total duration misses the target by more than ~10 %, adjust the script and re-run (audio is cached per line). Useful flags: `--no-render`, `--force`.

## Step 4 — Hand off
Report the final duration, scene count, and output path. Prompt the user to run `/review`.
