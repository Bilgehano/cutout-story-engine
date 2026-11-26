# Scaffold regeneration (only if git checkout is impossible)

## 10. Scaffold specs (used by `/setup` when a file is missing)

`/setup` first tries `git checkout -- <file>` for any missing tracked scaffold file. If that is impossible, regenerate from these specs:

- `src/types.ts`: shared types/constants from the shared contracts in SKILL.md, `EpisodeData` types (`EpisodeScene`, `EpisodeSegment`, `EpisodeSfx`, `EpisodeEvent`), `emptyEpisode`.
- `src/components/Subtitle.tsx`: compact sentence-case captions on a contrast panel at `bottom: 360px`. Show aligned phrases only during narration or explicitly highlighted lines. Leave pauses blank. Scene entry overlays and memory filters affect artwork, not captions.
- `src/components/CharacterActor.tsx`: positions a registered character in the 600x1200 box at `x * 1080`, floor `1500`.
- `src/EpisodeComposition.tsx`: per-scene `<Sequence>`; held-state springs for `eyeLook`/`mood`/`doorState`; windowed `phoneVibrate`/`lightFlicker`; `characterEnter`/`jump`; strict mouth isolation; three `<Audio>` layers (1.0 / 0.85 / 0.18 loop); `Subtitle`.
- `src/CheckCompositions.tsx`, `src/Root.tsx`, `src/index.ts`: `Episode` (duration from `totalDurationInFrames` via `calculateMetadata`), `CharacterCheck`, `EnvironmentCheck` at 1080x1920 / 30 FPS.
