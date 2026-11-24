---
name: review
description: Verify the rendered episode, validate data files, render QA stills, and update the story bible.
agent: agent
---

# /review

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first.

## Step 1 — Verify the MP4
Find the latest `out/episode_*.mp4` (highest episode number / newest). Run:

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -show_entries format=duration -of json <file>
```

Confirm: video stream `1080x1920`, `30/1` FPS, a valid audio stream, and total duration matching `totalFrames / 30` within ~0.2 s (and the target length agreed in `/video`).

## Step 2 — Validate `src/data/episode.json`
Check that every line's `audioFile` exists in `public/`, its `lipsyncFile` exists, `mouthCues` is non-empty, `durationInFrames = ceil((durationSec + 0.25) * 30)` is consistent with the audio, every `characterId` and `environmentId` is registered, and event frames lie within scene bounds.

## Step 3 — Render QA stills
Render three keyframes and inspect each image:

```bash
npx remotion still Episode out/qa_start.png --frame=15
npx remotion still Episode out/qa_mid.png --frame=<totalFrames/2>
npx remotion still Episode out/qa_end.png --frame=<totalFrames-15>
```

Check for subtitle overflow into the social UI zones (bottom 360 px and top 150 px), subtitle text exceeding the screen width, z-index/layering bugs (desks, door, characters), facial misalignment, and clipped limbs.

## Step 4 — Report
Give a clear verdict with findings (pass / needs fixes) and concrete fixes. If issues exist, propose or apply fixes, then re-run `/video` or the relevant renders.

If the user approves the episode, append to `story-bible.json` `episodes`: `{ "episodeNumber", "title", "languageCode", "durationSec", "summary", "cliffhanger" }`.
