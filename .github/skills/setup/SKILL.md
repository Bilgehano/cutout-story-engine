---
name: setup
description: One-time environment, ElevenLabs API/MCP and Remotion scaffold configuration. Unlocks /character, /environment, /video and /review.
agent: agent
---

# /setup

Read `AGENTS.md` and `.github/skills/cutout-animator/SKILL.md` first. Run the steps in order. Stop and report on any failure; never fake a passing check.

## Step 1 - Binary & system audit

Run and report each result:

- `node -v` (Node 18+ required)
- `ffmpeg -version`
- `ffprobe -version`
- Check that `bin/rhubarb` (or `bin/rhubarb.exe` on Windows) exists.

If `ffmpeg`/`ffprobe`/`node` are missing, stop and tell the user how to install them for their OS.

If `rhubarb` is missing, install it automatically. The user must NEVER have to download it manually:

1. Detect the OS (`process.platform` via `node -p "process.platform"`): `win32` -> asset suffix `Windows`, `darwin` -> `macOS`, `linux` -> `Linux`.
2. Fetch `https://api.github.com/repos/DanielSWolf/rhubarb-lip-sync/releases/latest` (send a `User-Agent` header) and pick the asset whose name ends with `-<suffix>.zip` (e.g. `Rhubarb-Lip-Sync-<version>-Windows.zip`); use its `browser_download_url`.
3. Download the zip to a temp file (e.g. in the OS temp directory).
4. Extract ALL contents (the `rhubarb`/`rhubarb.exe` binary AND the required `res/` folder, plus any other bundled files) directly into `bin/`. Release zips usually wrap everything in one top-level folder: flatten it, so the result is `bin/rhubarb` (or `bin/rhubarb.exe`) plus `bin/res/` and never `bin/<wrapper>/...`. Use `Expand-Archive` on Windows or `unzip` on macOS/Linux (or an equivalent Node script), and do not touch `bin/.gitkeep`.
5. Delete the temp zip (and any temporary extraction folder).
6. On macOS/Linux run `chmod +x bin/rhubarb`.
7. Verify by running `bin/rhubarb --version` (or `bin\rhubarb.exe --version`) and report the version.

Only if the automated GitHub download fails because of network/firewall restrictions (API or asset request blocked, timeout, DNS/proxy error) do you **STOP**, state the error, and ask the user to download the matching zip from https://github.com/DanielSWolf/rhubarb-lip-sync/releases and extract it (binary plus `res/` folder) into `bin/`; then continue once they confirm.

## Step 2 - ElevenLabs API key & MCP

1. Read `.env`. If `ELEVENLABS_API_KEY` is missing or empty, ask the user to paste their `ELEVENLABS_API_KEY` now, then write `.env` as `ELEVENLABS_API_KEY=<key>` (keep any other existing lines). Never echo the key back.
2. Verify the key works: `GET https://api.elevenlabs.io/v1/user` with header `xi-api-key`. On 401, ask for a new key.
3. Create or verify `.vscode/mcp.json` so it contains the official ElevenLabs MCP server:

```json
{
  "servers": {
    "elevenlabs": {
      "type": "http",
      "url": "https://api.elevenlabs.io/v1/mcp",
      "headers": { "Authorization": "Bearer ${env:ELEVENLABS_API_KEY}" }
    }
  }
}
```

## Step 3 - Plan detection & storyteller voice

1. Query `GET https://api.elevenlabs.io/v1/user/subscription` with header `xi-api-key: $ELEVENLABS_API_KEY`. If `tier` is `"free"` set `planTier = "free"`, otherwise `planTier = "paid"`. Report the tier and the remaining character quota (`character_limit - character_count`).
2. Ask the user exactly these 2 questions:
   1. **Default channel language** (`languageCode`, e.g. `"de"`, `"en"`, `"tr"`).
   2. **Storyteller Voice ID (`narratorVoiceId`)**. Explain: if left blank, you will query `GET https://api.elevenlabs.io/v1/voices` and automatically pick the best warm, engaging narrative voice compatible with the detected plan tier (a premade Free-compatible voice on the Free tier, the highest-quality narrative voice on a Paid tier).
3. If the Voice ID is blank, query `GET https://api.elevenlabs.io/v1/voices` and choose:
   - Free tier: only `category: "premade"` voices; prefer a warm, narrative, middle-aged voice (labels such as `descriptive: "calm"`, `narration`, `storytelling`, `warm`).
   - Paid tier: the best-quality narrative voice among all returned voices (prefer `professional`/`cloned` narrative voices over premade, otherwise a premade narrative voice).
   - Check the chosen voice supports the chosen language (`verified_languages`/`labels.language`) when that data exists. Tell the user which voice (name + id) you picked.

## Step 4 - Remotion project scaffold

1. If `package.json`, `tsconfig.json` or `remotion.config.ts` are missing, initialize a Remotion + TypeScript project (`type: "module"`, scripts `studio`, `typecheck`, `produce`). Pin all `remotion`/`@remotion/*` packages to the same exact version.
2. Run `npm install` and make sure `@remotion/media-utils` and `dotenv` are installed (`npm install @remotion/media-utils dotenv` if not).
3. Verify these scaffold files exist and are intact: `src/types.ts`, `src/components/Subtitle.tsx`, `src/components/CharacterActor.tsx`, `src/EpisodeComposition.tsx`, `src/CheckCompositions.tsx`, `src/Root.tsx`, `src/index.ts`, `src/components/characters/index.ts`, `src/components/backgrounds/index.ts`. If one is missing, restore it with `git checkout -- <file>`; if that is impossible, regenerate it from section 10 of `.github/skills/cutout-animator/SKILL.md`. `Subtitle.tsx` must sit in the social safe-zone at `bottom: 360px`, white fill, thick `#1E1B18` outer stroke via `paintOrder: "stroke fill"`, 3-4 words per chunk.
4. Copy `story-bible.template.json` to `story-bible.json` (do not overwrite an existing `story-bible.json` without asking) and set `planTier`, `defaultLanguage`, `narratorVoiceId`, keeping `characters: []`, `environments: []`, `episodes: []`.
5. Run `npm run typecheck` and `npx remotion compositions src/index.ts`. Both must succeed; fix issues before continuing.
6. Write `.setup-complete` containing the ISO timestamp.
7. Confirm setup is complete. The next step is `/create`.
