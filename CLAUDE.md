@AGENTS.md

## Claude Code notes

- Commands are skills in `.claude/skills/`: `/setup`, `/create`, `/video`, `/episode-review`. Where a prompt says `/review`, use `/episode-review` (`/review` is built into Claude Code).
- Each command delegates to `.github/prompts/`; load reference files only when that prompt lists them.
- ElevenLabs MCP: `.mcp.json` is the project config. In `/setup`, have the user authorize it via `/mcp`, then run the read-only voice lookup.
- Inspect rendered stills in `out/` with the Read tool.
