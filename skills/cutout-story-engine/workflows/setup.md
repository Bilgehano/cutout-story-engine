# /setup

Run the steps in order. Stop and report on any failure; never fake a passing check.

## Step 1 - Engine install

Run `node -v` (Node 18+ required; if missing, stop and tell the user how to install it for their OS). The project is the folder the user is working in; the engine lives in this skill under `assets/engine/`.

1. Install or update the engine with this skill's installer, run from the project folder (the skill's own path, not the project's):
   - New project: `node <skill>/scripts/init.mjs`
   - Existing project (`.cutout-engine.json` with an older version, or engine files missing): `node <skill>/scripts/init.mjs --upgrade`. It refreshes engine files only, backs up every file it replaces to `.engine-backup/<timestamp>/`, and never touches `story-bible.json`, `sessions/`, `.env`, generated characters and environments, audio caches or `out/`. Tell the user which files it replaced.
   - Projects from the old template layout (pipeline under `.github/skills/cutout-animator/`) upgrade the same way; afterwards the user may delete that old folder.
2. Run `npm install`.

## Step 2 - Binary & system audit

Run and report each result:

- `ffmpeg -version`
- `ffprobe -version`
- Check that `bin/rhubarb` (or `bin/rhubarb.exe` on Windows) exists.

If `ffmpeg`/`ffprobe` are missing, stop and tell the user how to install them for their OS.

If `rhubarb` is missing, install it automatically. The user must NEVER have to download it manually:

1. Detect the OS (`process.platform` via `node -p "process.platform"`): `win32` -> asset suffix `Windows`, `darwin` -> `macOS`, `linux` -> `Linux`.
2. Fetch `https://api.github.com/repos/DanielSWolf/rhubarb-lip-sync/releases/latest` (send a `User-Agent` header) and pick the asset whose name ends with `-<suffix>.zip` (e.g. `Rhubarb-Lip-Sync-<version>-Windows.zip`); use its `browser_download_url`.
3. Download the zip to a temp file (e.g. in the OS temp directory).
4. Extract ALL contents (the `rhubarb`/`rhubarb.exe` binary AND the required `res/` folder, plus any other bundled files) directly into `bin/`. Release zips usually wrap everything in one top-level folder: flatten it, so the result is `bin/rhubarb` (or `bin/rhubarb.exe`) plus `bin/res/` and never `bin/<wrapper>/...`. Use `Expand-Archive` on Windows or `unzip` on macOS/Linux (or an equivalent Node script), and do not touch `bin/.gitkeep`.
5. Delete the temp zip (and any temporary extraction folder).
6. On macOS/Linux run `chmod +x bin/rhubarb`.
7. Verify by running `bin/rhubarb --version` (or `bin\rhubarb.exe --version`) and report the version.

Only if the automated GitHub download fails because of network/firewall restrictions (API or asset request blocked, timeout, DNS/proxy error) do you **STOP**, state the error, and ask the user to download the matching zip from https://github.com/DanielSWolf/rhubarb-lip-sync/releases and extract it (binary plus `res/` folder) into `bin/`; then continue once they confirm.

## Step 3 - ElevenLabs API key & MCP

1. Check for a non-empty `ELEVENLABS_API_KEY` in `.env` without printing it. If missing, ask the user to populate it locally using `.env.example`.
2. Verify the key works: `GET https://api.elevenlabs.io/v1/user` with header `xi-api-key`. On 401, ask for a new key.
3. Configure the [official hosted MCP server](https://elevenlabs.io/docs/eleven-api/resources/mcp-server) (`https://api.elevenlabs.io/v1/mcp`) for the agent you are running in, merging into existing config and keeping unrelated servers:
   - Claude Code: project `.mcp.json` from `assets/mcp/claude-code.mcp.json`; the user authorizes it with `/mcp`.
   - VS Code / GitHub Copilot: `.vscode/mcp.json` from `assets/mcp/vscode.mcp.json`.
   - Antigravity: workspace `.agents/mcp_config.json` from `assets/mcp/antigravity.mcp.json` (surfaces that read global config: `~/.gemini/config/mcp_config.json`); authenticate under Manage MCP Servers, or `/mcp` in the CLI.
   - Any other agent: add an HTTP MCP server named `elevenlabs` with that URL in the agent's own MCP config.
   The server uses OAuth, not the REST API key. Have the user authorize the matching ElevenLabs workspace in their client. Discover the server's tools and perform an authenticated, read-only voice lookup. If the server is absent, disconnected, or the lookup fails, stop before marking setup complete. A config file or successful REST request alone does not pass.

## Step 4 - Plan detection & storyteller voice

1. Query `GET https://api.elevenlabs.io/v1/user/subscription` with header `xi-api-key: $ELEVENLABS_API_KEY`. If `tier` is `"free"` set `planTier = "free"`, otherwise `planTier = "paid"`. Report the tier and the remaining character quota (`character_limit - character_count`).
2. Ask the user exactly these 2 questions:
   1. **Default channel language** (`languageCode`, e.g. `"de"`, `"en"`, `"tr"`).
   2. **Storyteller Voice ID (`narratorVoiceId`)**. Explain: if left blank, you will query `GET https://api.elevenlabs.io/v1/voices` and automatically pick the best warm, engaging narrative voice compatible with the detected plan tier (a premade Free-compatible voice on the Free tier, the highest-quality narrative voice on a Paid tier).
3. If the Voice ID is blank, query `GET https://api.elevenlabs.io/v1/voices` and choose:
   - Free tier: only `category: "premade"` voices; prefer a warm, narrative, middle-aged voice (labels such as `descriptive: "calm"`, `narration`, `storytelling`, `warm`).
   - Paid tier: the best-quality narrative voice among all returned voices (prefer `professional`/`cloned` narrative voices over premade, otherwise a premade narrative voice).
   - Check the chosen voice supports the chosen language (`verified_languages`/`labels.language`) when that data exists. Tell the user which voice (name + id) you picked.

## Step 5 - Story bible and checks

1. Copy `story-bible.template.json` to `story-bible.json` (do not overwrite an existing `story-bible.json` without asking) and set `planTier`, `defaultLanguage`, `narratorVoiceId` (leave `voiceModel` null; the first lock pins it), keeping `characters: []`, `environments: []`, `episodes: []`.
2. Run `npm run typecheck`, `npm test` and `npx remotion compositions src/index.ts`. All must succeed; fix issues before continuing.
3. Only after the live MCP lookup and engine checks succeed, write `.setup-complete` as `elevenlabs-mcp:verified <ISO timestamp>`.
4. Confirm setup is complete. The next step is `/create`.
