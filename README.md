# Cut-Out Animation Studio (Template)

A GitHub Template Repository for a modular **2D SVG cut-out puppet animation studio**: code-driven characters and environments in **Remotion**, voiceovers from **ElevenLabs** (multi-language), and lip sync from **Rhubarb Lip Sync**. Output: vertical `1080x1920` 9:16 videos at 30 FPS for TikTok, Reels, and Shorts. No AI image/video generators are used.

## Use as a template

1. Click **Use this template** on GitHub and create your repository.
2. Clone it and open it in an editor with GitHub Copilot agent mode (Copilot reads `AGENTS.md` and `.github/copilot-instructions.md` automatically).
3. Put optional art references into `refs/`.

## Prerequisites

- Node.js 18+
- FFmpeg (including `ffprobe`) on your `PATH`
- Rhubarb Lip Sync: download from [DanielSWolf/rhubarb-lip-sync releases](https://github.com/DanielSWolf/rhubarb-lip-sync/releases) and extract the executable and its `res/` folder into `bin/` (`bin/rhubarb.exe` on Windows, `bin/rhubarb` elsewhere)
- An ElevenLabs API key

## Workflow

Run these prompts in Copilot Chat, in order:

| Step | Command | What it does |
|---|---|---|
| 1 | `/setup` | Checks dependencies, asks for your channel language and default voice, installs packages, initializes config. |
| 2 | `/character` | Asks 6 questions, then builds, registers, and visually verifies a character. |
| 3 | `/environment` | Asks 4 questions, then builds, registers, and visually verifies a background. |
| 4 | `/video` | Writes the script in your chosen language, generates audio, lip sync, timing, and renders the episode. |
| 5 | `/review` | Checks the MP4, validates data, renders QA stills, and updates the story bible. |

Copy `.env.example` to `.env` and set `ELEVENLABS_API_KEY` before `/video`.

## Languages

`story-bible.json` has a channel `defaultLanguage` (e.g. `en`, `de`, `tr`, `es`, `fr`) and per-language `voiceProfiles`. Override per episode with `"languageCode"` in `src/data/draft_script.json`. The language drives the script, subtitles, and the ElevenLabs request (`eleven_multilingual_v2` + `language_code`).

## Manual commands

```bash
npm install
npm run studio                                        # Remotion Studio
node .github/skills/cutout-animator/scripts/produce.mjs   # audio-first pipeline + render
node .github/skills/cutout-animator/scripts/produce.mjs --no-render
node .github/skills/cutout-animator/scripts/produce.mjs --force   # regenerate cached audio
npx remotion still Preview out/check.png --props="{\"characterId\":\"<id>\"}"
```

## Structure

```
AGENTS.md                      Workspace constitution
.github/copilot-instructions.md
.github/prompts/               /setup /character /environment /video /review
.github/skills/cutout-animator/  SKILL.md + scripts/produce.mjs
src/components/characters/     SVG puppets + registry
src/components/backgrounds/    SVG environments + registry
src/EpisodeComposition.tsx     Timeline, events, camera, subtitles
src/PreviewComposition.tsx     QA stills
src/data/                      draft_script.json (input), episode.json (generated)
story-bible.json              Canon: language, voices, characters, environments, episodes
refs/  bin/  public/audio/  public/lipsync/  out/
```
