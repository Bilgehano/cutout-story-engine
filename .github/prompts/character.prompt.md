---
name: character
description: Build only the missing puppets in the active episode plan.
agent: agent
---

# /character

1. Read `AGENTS.md` and the animator skill. Run `npm run session -- status`; stop on error. Read `plan.json` in the returned directory. Verify existing cast IDs map to the specified components in `src/components/characters/index.ts`. Repair missing technical registrations from the plan; if there is any unresolved design, identity or voice choice, stop: **Complete /create first.**
2. For each `missing.character` ID only, draw `src/components/characters/<component>.tsx` from its saved design. Use the animator skill's named layers, nine visemes, eye/mood controls, blink, breathing and gesture rules. Implement the planned poses and colors. Export the named `CharacterComponent`, register it by plan ID, and upsert the asset snapshot (omit `source`) in `story-bible.json`. Never pick a new voice or replace returning artwork.
3. Use `CharacterCheck` as in animator section 8. Render stills for the planned poses and an open dialogue viseme into `out/episode_<N>_qa/`; inspect and fix before finishing. Run `npm run typecheck` after TypeScript changes. If resuming partial work, finish any outstanding QA before marking complete.
4. Run `npm run session -- finish-character`. If all assets were already available, report **No characters need to be created for this episode.** Otherwise report the new IDs and QA paths. Continue with `/environment`.
