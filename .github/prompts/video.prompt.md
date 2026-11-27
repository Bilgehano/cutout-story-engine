---
name: video
description: Render the locked episode with its planned timing, cast, locations, voices and effects.
agent: agent
---

# /video

1. `npm run session -- status`. Stop on failure; unresolved creative choices go to `/create`. Never recast, rewrite or retime.
2. Assets. Open the plan only if something is listed in `missing`.
   - `missing.character`: read `reference/characters.md`, draw `src/components/characters/<component>.tsx` with all planned poses, outfits and conditions as `export const <component>` (registered automatically; never edit `characters/index.ts`), inspect one `CharacterSheet`. An unlocked character is edited, not redrawn.
   - `missing.environment`: read `reference/environments.md`, draw the set as `export const <component>` in `src/components/backgrounds/<component>.tsx` (registered automatically), inspect one `EnvironmentCheck` still.
   - `npm run typecheck` if TypeScript changed. Then `npm run session -- finish-character` and `-- finish-environment` (always both; they register and fingerprint, so do not edit `story-bible.json`). `npm run session -- video` must pass.
3. `npm run produce`. If speech exceeds its slot, report scene, line and needed time for `/create`. Keep audio caches.
4. Report the MP4 path and new/cached audio counts. Next: `/review`.
