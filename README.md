# Cutout Story Engine

An **agent skill** that makes vertical (9:16) animated story series: code-drawn 2D SVG cut-out puppets and sets, rendered with [Remotion](https://www.remotion.dev), voiced with [ElevenLabs](https://elevenlabs.io) and lip-synced with [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync). You give it a premise; it plans the episode second by second, builds the characters, records the voices and renders a 1080x1920 MP4 ready for TikTok, Reels and Shorts.

It is installed into your AI agent, not cloned as a project. Your series (characters, sets, scripts, audio, videos) lives in your own folder and never touches this repository.

## Install

### Claude Code (plugin)

```
/plugin marketplace add Bilgehano/cutout-story-engine
/plugin install cutout-story-engine@cutout-story-engine
```

This adds the skill and four commands: `/cutout-story-engine:setup`, `:create`, `:video`, `:review`.

### Any agent that supports Agent Skills

The skill is the folder [`skills/cutout-story-engine`](skills/cutout-story-engine), a standard `SKILL.md` skill with its scripts and engine files inside. Copy it into your agent's skills folder:

```
git clone --depth 1 https://github.com/Bilgehano/cutout-story-engine.git
cp -r cutout-story-engine/skills/cutout-story-engine <skills folder>/
```

For example `~/.claude/skills/` (Claude Code without the plugin), or `.github/skills/` inside a project for GitHub Copilot. Other agents (OpenAI Codex, Gemini CLI, Google Antigravity, Cursor and others) each document their own skills folder. Then ask the agent to "run the cutout-story-engine setup".

To update with `git pull` instead of copying again, keep the clone and link the skill folder to it:

```
# macOS / Linux
ln -s "$PWD/cutout-story-engine/skills/cutout-story-engine" ~/.claude/skills/cutout-story-engine
```
```powershell
# Windows (a junction needs no admin rights)
New-Item -ItemType Junction -Path "$HOME\.claude\skills\cutout-story-engine" -Target "$PWD\cutout-story-engine\skills\cutout-story-engine"
```

From then on `git pull` in the clone updates the skill, and the engine in each series folder follows on its next workflow.

## Requirements

- Node.js 18+, plus `ffmpeg` and `ffprobe` on your `PATH`
- An ElevenLabs account and API key with a tag-capable speech model (Eleven v4 or v3), and the [ElevenLabs MCP server](https://elevenlabs.io/docs/eleven-api/resources/mcp-server) connected in your agent (setup walks you through it)
- Rhubarb Lip Sync is downloaded automatically during setup

## Use

Open your agent in an **empty folder** for your series, then:

1. **setup**: installs the engine into the folder, downloads Rhubarb, checks your ElevenLabs key and MCP connection, detects your plan, picks a storyteller voice and creates `story-bible.json`. Run it again any time to upgrade the engine.
2. **create**: give it a premise ("a bullied student wakes up one year in the past") or say "continue after episode 1". It writes one scene-by-scene proposal with hooks, cast, dialogue, voice direction and effects. Accept it or ask for changes. No media is generated yet.
3. **video**: draws and visually checks any new puppets and sets, records the voices and renders the locked script to `out/episode_<n>.mp4`.
4. **review**: audits the render (format, lip sync, captions, safe zones) and records the episode in the story bible so the next one keeps continuity.

Episodes can be in any language; spoken lines follow the episode language, and non-English episodes use Rhubarb's phonetic recognizer.

## Updating

Update the skill the way you installed it: `/plugin marketplace update cutout-story-engine` for the plugin, or `git pull` in your clone if you linked the skill folder to one. That is all. Before every workflow the skill checks the engine in your series folder and, if this version's engine differs, refreshes the engine files (backing up anything it replaces to `.engine-backup/`). It never touches `story-bible.json`, `sessions/`, `.env`, your characters and sets, audio caches or renders.

Coming from the old template repository (pipeline under `.github/skills/cutout-animator/`)? Install the skill and run setup in that folder; it upgrades in place.

## What lives where

| In this repository (the skill) | In your series folder |
| --- | --- |
| `SKILL.md`, the four workflows, art/sound/animation references | `story-bible.json`, `sessions/episode-N/` (briefs, scripts) |
| The installer and the Remotion engine (`assets/engine/`) | Your characters and sets (`src/components/...`) |
| | Audio caches, `out/` renders, `.env`, `bin/rhubarb` |

Back up your series folder yourself, ideally as your own private Git repository: its `.gitignore` keeps secrets, caches, downloads and renders out and tracks your story, scripts, characters and sets.

## Rules at a glance

No external image or video generators: every character and set is React + SVG. `refs/` images are style references only. Nobody narrates physical actions; sound effects, ambience and animation show them. Only `dialogue` moves mouths; thoughts and narration keep them closed. The full rules are in the engine's `AGENTS.md` and the skill's [`SKILL.md`](skills/cutout-story-engine/SKILL.md).

## Development

```
node skills/cutout-story-engine/scripts/init.mjs --target /tmp/project
cd /tmp/project && npm install && npm run typecheck && npm test
```

The same check runs on every push for Linux, Windows and macOS.

## License

[MIT](LICENSE)
