# /video

1. `npm run session -- status`. Stop on failure; unresolved creative choices go to `/create`. Never recast or rewrite.
2. Assets. Open the plan only if something is listed in `missing`.
   - `missing.character`: read `references/characters.md` (in this skill), draw `src/components/characters/<component>.tsx` with all planned poses, outfits and conditions as `export const <component>` (registered automatically; never edit `characters/index.ts`), inspect one `CharacterSheet`. An unlocked character is edited, not redrawn.
   - `missing.environment`: read `references/environments.md` (in this skill), draw the set as `export const <component>` in `src/components/backgrounds/<component>.tsx` (registered automatically), inspect one `EnvironmentCheck` still with the planned character and pose in place.
   - `npm run typecheck` if TypeScript changed. Then `npm run session -- finish-character` and `-- finish-environment` (always both; they register and fingerprint, so do not edit `story-bible.json`). `npm run session -- video` must pass.
3. `npm run produce`. It records the speech, fits every slot to the recorded audio (longer lines push later cues back, slack is trimmed; `sessions/episode-N/timing.json` lists the changes), renders and limits the audio peaks. Keep audio caches.
4. **Watch the result before handing it over.** `npm run sheet` writes `out/sheet_<n>.png` (one frame every 1.5s, six per row); inspect it: the opening frame is a close-up with its title card, captions never cover a face, a chat or a label, every time jump shows its transition, nothing shows the edge of a set, and the end card appears. Fix rendering defects (art, layout, camera) and render again; at most 2 rounds. Route story problems to `/create`.
5. Report the MP4 path, the runtime (planned and fitted), new and cached audio counts and what you could not check by ear. Next: `/review`.
