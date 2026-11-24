---
name: review
description: Technical and visual QA of the latest rendered episode, then record it in the story bible.
agent: agent
---

# /review

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## Gatekeeper

Verify `.setup-complete`, `.env` (non-empty `ELEVENLABS_API_KEY`), `story-bible.json` and `bin/rhubarb`(`.exe`). If ANY is missing, HALT, list what is missing and tell the user to run `/setup`. Also HALT if no `out/episode_*.mp4` exists and tell the user to run `/video`.

## Step 1 - Technical audit

1. Pick the latest `out/episode_*.mp4`. Run `ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -show_entries format=duration -of json <file>` and verify: `1080x1920`, `30/1` frame rate, one video stream, one audible audio stream, and a duration matching `totalDurationInFrames / 30` of `src/data/episode.json` (within 0.1s). Optionally confirm the audio is not silent with `ffmpeg -i <file> -af volumedetect -f null -`.
2. Validate `src/data/episode.json`:
   - every `"thought"` and `"narration"` segment has exactly the closed-mouth cue `[{ "start": 0, "end": 999, "value": "X" }]`;
   - every `"dialogue"` segment has non-empty Rhubarb `mouthCues` using only `X A B C D E F G H`, starting at `0`;
   - `narration` segments use speaker `"narrator"`; every `speakerId`/`characterId` is registered in `story-bible.json`;
   - scene frame ranges are contiguous and sum to `totalDurationInFrames`.
3. Scan dialogue/narration text for verbal descriptions of physical actions (Show, Don't Tell). Flag every hit.

## Step 2 - Visual frame audit

Render three stills and inspect each one visually:

- `npx remotion still src/index.ts Episode out/qa_start.png --props=src/data/episode.json --frame=<first dialogue frame>`
- `npx remotion still src/index.ts Episode out/qa_mid.png --props=src/data/episode.json --frame=<middle frame>`
- `npx remotion still src/index.ts Episode out/qa_end.png --props=src/data/episode.json --frame=<last frame - 1>`

Check for: subtitle overlap with social UI zones (subtitles must sit at `bottom: 360px`; nothing important in the bottom 360px or top 250px), layer z-index bugs (characters vs. desk/foreground), facial misalignment, open mouths during thought/narration, and characters outside the canvas.

## Step 3 - Report & memory update

Report findings in a short table (check, result, details). Fix real defects (re-run `/video` pipeline only if audio changed). Once the user approves, append to `episodes` in `story-bible.json`: `{ "episodeNumber", "title", "languageCode", "summary", "cliffhanger", "characters", "environments", "durationSec", "renderedAt" }`, so future episodes keep continuity.
