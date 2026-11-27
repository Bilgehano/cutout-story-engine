# /review

Read `references/animation.md` (in this skill).

## Gatekeeper

Verify `.setup-complete`, `.env` (non-empty `ELEVENLABS_API_KEY`), `story-bible.json` and `bin/rhubarb`(`.exe`). If ANY is missing, HALT, list what is missing and tell the user to run `/setup`. Also HALT if no `out/episode_*.mp4` exists and tell the user to run `/video`.

## Step 1 - Technical audit

1. Run `npm run session -- video`. Use only the returned episode's `out/episode_<N>.mp4` and `sessions/episode-N/episode.json`. If either is missing or predates the locked plan, stop and request `/video`. Run `ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -show_entries format=duration -of json <file>` and verify: `1080x1920`, `30/1` frame rate, audio when planned, and duration within 0.1s of the locked plan.
2. Validate this episode's `episode.json`:
   - every `"thought"` and `"narration"` segment has exactly the closed-mouth cue `[{ "start": 0, "end": 999, "value": "X" }]`;
   - every `"dialogue"` segment has non-empty Rhubarb `mouthCues` using only `X A B C D E F G H`, starting at `0`;
   - `narration` segments use speaker `"narrator"`; every `speakerId`/`characterId` is registered in `story-bible.json`;
   - scene frame ranges are contiguous and sum to `totalDurationInFrames`.
3. Scan dialogue/narration text for verbal descriptions of physical actions (Show, Don't Tell). Flag every hit.

## Step 2 - Visual frame audit

Render three stills and inspect each one visually (use frame 0 if no dialogue):

- `npx remotion still src/index.ts Episode out/qa_start.png --props=sessions/episode-N/episode.json --scale=0.33 --log=error --frame=<first dialogue frame>`
- `npx remotion still src/index.ts Episode out/qa_mid.png --props=sessions/episode-N/episode.json --scale=0.33 --log=error --frame=<middle frame>`
- `npx remotion still src/index.ts Episode out/qa_end.png --props=sessions/episode-N/episode.json --scale=0.33 --log=error --frame=<last frame - 1>`

Check for: subtitle overlap with social UI zones (subtitles must sit at `bottom: 360px`; nothing important in the bottom 360px or top 250px), layer z-index bugs (characters vs. desk/foreground), facial misalignment, open mouths during thought/narration, and characters outside the canvas.

## Step 3 - Report & memory update
Play the opening, each perspective change and the final beat with sound. Compare them to the locked hooks and turns: a memory should read differently with eyes closed as well as with sound muted. Listen for mechanical repeats, masked dialogue, spoken tags or a delivery that contradicts the line. Check captions against the audio on both sides of a pause: only narration or highlighted lines, no bracketed direction or placeholder dots. Report the scene/time of any mismatch; distinguish a planning revision from a rendering defect. If playback is unavailable, mark the listening audit unverified.

Report findings in a short table (check, result, details). Fix real defects (re-run `/video` pipeline only if audio changed). Once the user approves, append to `episodes` in `story-bible.json`: `{ "episodeNumber", "title", "languageCode", "summary", "cliffhanger", "characters", "environments", "durationSec", "renderedAt" }`, so future episodes keep continuity.
