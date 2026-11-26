# Animation, QA and pipeline

## 6. Remotion animation rules

- Use `useCurrentFrame()` and `useVideoConfig()`; never `setTimeout`, CSS transitions, or `Math.random()` (renders must be deterministic).
- `interpolate` for linear/clamped motion (always set `extrapolateLeft/Right: "clamp"` when the range matters). `spring` for natural settling (`config: { damping: 200 }` for smooth, `{ damping: 18, stiffness: 120 }` for bouncy entries).
- Oscillation (breathing, gestures) uses `Math.sin(frame / period + phase)` with per-character phase offsets.
- Characters and backgrounds are pure functions of props + frame.
- Compositions: `Episode` (props from `src/data/episode.json`), `CharacterCheck`, `EnvironmentCheck`.
- Audio: three layers inside each scene: speech `1.0`, SFX `0.85`, ambience `0.18` with `loop`.

## 8. Visual QA commands

Create the props file (for example `src/data/check.char.json` containing `{"characterId":"Mara","pose":"standing"}`, and `src/data/check.env.json` containing `{"environmentId":"Bedroom","characterId":"Mara","pose":"sitting_desk"}`), then render a still:

```
npx remotion still src/index.ts CharacterCheck out/char_Mara_check.png --props=src/data/check.char.json
npx remotion still src/index.ts EnvironmentCheck out/bg_Bedroom_check.png --props=src/data/check.env.json
npx remotion still src/index.ts Episode out/qa_mid.png --props=src/data/episode.json --frame=120
```

Inspect every PNG visually: proportions, outline weight, shading, layer order, subtitle safe-zone (`bottom: 360px`).

## 9. Pipeline files

- `scripts/produce.mjs`: ElevenLabs TTS / ambience / SFX (SHA-256 cached in `public/audio`, `public/ambience`, `public/sfx`), ffmpeg + Rhubarb for `dialogue` only (cached in `public/lipsync`), ffprobe durations, `src/data/episode.json`, render. `--no-render` stops after writing `episode.json`.
- `schemas/plan.schema.json`: schema for the active `sessions/episode-N/plan.json`. `scripts/session.mjs` validates it and enforces the setup, planning and asset gates.
- Use the plan's verified expressive model. TTS requests include bracketed performance tags and per-line settings; captions use clean source words and provider timestamps. Audio and alignment share a cache key.
- Speech occupies its measured audio duration within its planned slot; remaining frames are silent.

