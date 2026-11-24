# Cutout Story Engine

A GitHub template for a modular **2D SVG cut-out puppet animation studio**: layered React + SVG characters and environments rendered by [Remotion](https://www.remotion.dev) at 1080x1920 / 30 FPS, voiced by [ElevenLabs](https://elevenlabs.io) and lip-synced with [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync). Everything is driven by Copilot slash commands.

## Prerequisites

- Node.js 18+, `ffmpeg` and `ffprobe` on your `PATH`
- An ElevenLabs API key (the free tier works)
- Rhubarb Lip Sync in `bin/` (the `/setup` command walks you through it)

## Workflow

1. `/setup`: audits tools, stores your `ELEVENLABS_API_KEY`, configures the ElevenLabs MCP server, detects your plan, picks the storyteller voice, scaffolds Remotion and creates `story-bible.json`.
2. `/character`: 6-question interview, builds a layered SVG puppet (9 visemes, blinking, moods, gestures), registers it and renders a QA still.
3. `/environment`: 4-question interview, builds a layered background (back / mid / character slot / foreground) with animated props and renders a QA still.
4. `/video`: casting gate, Show-Don't-Tell screenplay (`dialogue` / `thought` / `narration` + SFX + ambience + visual events), then `produce.mjs` generates audio, lip-sync and renders `out/episode_<n>.mp4`.
5. `/review`: ffprobe + `episode.json` audit, keyframe stills, then updates the story bible.

## Rules at a glance

See [`AGENTS.md`](AGENTS.md) and [`.github/skills/cutout-animator/SKILL.md`](.github/skills/cutout-animator/SKILL.md). In short: no external image/video generators, `refs/` are style-only, never narrate physical actions (use SFX + ambience + animation), only `dialogue` moves mouths.

## Git hygiene

Only the template is tracked. Secrets, `refs/`, `bin/`, generated characters/environments, audio caches, `src/data/` and `out/` are git-ignored.

## Useful commands

```
npm install          # install dependencies
npm run studio       # open Remotion Studio
npm run typecheck    # TypeScript check
npm run produce      # run the episode pipeline (same as /video step 3)
```

Audio is cached by SHA-256 in `public/audio`, `public/sfx` and `public/ambience`, so animation tweaks and re-renders cost 0 ElevenLabs credits.
