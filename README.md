# Cutout Story Engine

A GitHub template for a modular **2D SVG cut-out puppet animation studio**: layered React + SVG characters and environments rendered by [Remotion](https://www.remotion.dev) at 1080x1920 / 30 FPS, voiced by [ElevenLabs](https://elevenlabs.io) and lip-synced with [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync). Everything is driven by Copilot slash commands.

## Prerequisites

- Node.js 18+, `ffmpeg` and `ffprobe` on your `PATH`
- An ElevenLabs API key (the free tier works)
- Rhubarb Lip Sync in `bin/` (the `/setup` command walks you through it)

## Workflow

1. `/setup`: audits tools, stores your `ELEVENLABS_API_KEY`, configures the ElevenLabs MCP server, detects your plan, picks the storyteller voice, scaffolds Remotion and creates `story-bible.json`.
2. `/create`: give it a premise or say "continue after episode 1". The AI checks earlier episodes, asks about preferences you want to set, and fills in the rest. It chooses the runtime, designs the cast and sets, assigns voices and writes a second-by-second plan. No media is generated.
3. `/character`: builds and visually checks only the missing puppets specified in that plan. If the entire cast is already built, it records the stage as complete without redrawing anything.
4. `/environment`: does the same for sets. An episode can reuse the hall from episode 1 and build just one new location.
5. `/video`: renders the locked plan after both asset stages finish. Dialogue, thoughts, narration, SFX and visual cues use planned scene-relative times. If speech won't fit, it reports the line to revise in `/create` rather than changing the duration.
6. `/review`: audits the rendered episode and records approved continuity in the story bible.

Each new episode has its own local `sessions/episode-N/brief.md` and `plan.json`. The newest numbered folder stays active across chats; an unfinished episode blocks production instead of falling back to an older plan. Ask `/create` to **revise the active episode** to edit it in place. After a revision, run both asset commands again. Shared artwork and audio caches remain in their normal locations. Back up `sessions/` along with your story bible and generated assets; they are not committed.

See the [example shooting script](examples/episode-plan.json) for the actual plan format. Existing projects keep their setup and assets; use `/create` before the next render. The old `src/data/draft_script.json` is not production input.

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
