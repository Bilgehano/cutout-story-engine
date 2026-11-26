---
trigger: always_on
---

Always read and strictly obey `.github/skills/cutout-animator/SKILL.md` alongside `AGENTS.md` at the start of every session, before answering or editing anything.

## Antigravity Integration Notes

- **Slash commands (`/setup`, `/create`, `/video`, `/review`):** Exposed in Antigravity via `.agents/skills.json` pointing to `.github/skills/`. Each skill delegates to its prompt in `.github/prompts/<command>.prompt.md`.
- **ElevenLabs MCP in `/setup`:** When `setup.prompt.md` instructs you to configure the ElevenLabs MCP server for the active client (`.mcp.json` / `.vscode/mcp.json`), use Antigravity's configuration instead:
  - Workspace config is tracked in `.agents/mcp_config.json` (`"elevenlabs": { "serverUrl": "https://api.elevenlabs.io/v1/mcp" }`) for Antigravity CLI and IDE.
  - On surfaces that read global MCP config (such as the Antigravity App), if `elevenlabs` is not yet connected, add `"elevenlabs": { "serverUrl": "https://api.elevenlabs.io/v1/mcp" }` to `~/.gemini/config/mcp_config.json` while preserving unrelated servers.
  - Have the user complete OAuth authorization in Antigravity (**Customizations > Installed > MCP Servers > Authenticate** in the App, **Manage MCP Servers** in the IDE, or `/mcp` in the CLI), then run the authenticated read-only voice lookup before writing `.setup-complete`.
- **Visual QA (`/video` and `/review`):** Inspect rendered `.png` stills in `out/` directly with `read_file`.
- **Language policy:** Write repository documentation in English; write spoken lines in the planned episode language.
