# Copilot Instructions

In every session, before doing anything else:

1. Read `AGENTS.md` at the repository root and obey it strictly.
2. Read `.github/skills/cutout-animator/SKILL.md` and follow its implementation standards exactly.

These two files override any default behavior. In particular: no external generative image/video APIs, audio-first timing, mandatory visual QA renders with `npx remotion still`, and English for all repository content (video content uses the selected video language).

Slash commands are defined in `.github/prompts/`: `/setup`, `/character`, `/environment`, `/video`, `/review`.
