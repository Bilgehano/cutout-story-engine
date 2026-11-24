# Cutout Animator Skill

This skill defines how every character, environment and episode in this repository is built. It is mandatory reading alongside `AGENTS.md`.

Canvas: **1080x1920 (9:16), 30 FPS**, 100% React + SVG in Remotion. Outline: `3px #1E1B18`, flat cel shading (one base tone + one shadow tone + optional highlight). No raster art, no external generative image/video APIs.

## 1. Shared contracts (`src/types.ts`)

- `CharacterProps`: `pose`, `mouthShape`, `isTalking`, `eyeLook {x,y}` (-1..1), `mood`, `prevMood`, `moodBlend` (0..1), `gestureIntensity`, `flip`, `colors`.
- `BackgroundProps`: `timeOfDay`, `doorState` (0..1), `phoneVibrate`, `lightFlicker` (0..1), `children` (the character slot).
- Characters live in a `CHARACTER_BOX` of 600x1200 SVG units; the bottom-center of the box is the foot anchor placed on `CHARACTER_FLOOR_Y` (1500px). Draw with `viewBox="0 0 600 1200"`, `width="100%"`, `height="100%"`.
- Moods: `neutral | happy | sad | angry | surprised | worried`. Poses: `standing | sitting_desk`.
- Registries (`characters/index.ts`, `backgrounds/index.ts`) map `id` -> component. Keys must equal the ids in `story-bible.json`.

## 2. Character SVG layer hierarchy

Draw back-to-front. Every layer is a named `<g id="...">`. Props make colors customizable (`colors?.hair ?? "#3B2A20"`).

```
<svg viewBox="0 0 600 1200">
  <g id="shadow">            ground ellipse (standing) -- skipped when sitting_desk
  <g id="body-root">         breathing + sway transform (translateY / scaleY around hips)
    <g id="hair-back">
    <g id="leg-back"> <g id="leg-front">          (standing only; sitting_desk hides legs behind the desk)
    <g id="arm-back">        upper arm -> <g id="forearm-back" transform=rotate(a, elbowX, elbowY)> -> hand
    <g id="torso">           outfit, collar, neck
    <g id="head">            pivot at the neck; tiny tilt on gestures
      <g id="face">          skin, ears, nose, cheeks, freckles/scars
      <g id="eyes">          whites, pupils (offset by eyeLook), eyelids (blink), glasses
      <g id="eyebrows">      lerped from prevMood -> mood with moodBlend
      <g id="mouth">         9-viseme switch (section 3)
      <g id="facial-hair">
      <g id="hair-front">    fringe, hat
    <g id="arm-front">       same elbow-pivot structure as arm-back
```

Mandatory behaviours:

- **Breathing:** `Math.sin(frame / 22)` drives a +/-3 unit `translateY` and a +/-0.4% `scaleY` on `body-root`.
- **Auto-blink:** a blink every ~105 frames: `const phase = frame % 105; const blink = interpolate(phase, [0, 3, 6], [1, 0.05, 1], { extrapolateRight: "clamp" })`. Offset the phase per character so two characters never blink together. Scale the eyelid/eye `scaleY` by `blink`.
- **eyeLook:** pupils translate by `eyeLook.x * 7` and `eyeLook.y * 5` units (clamped inside the eye white).
- **Mood eyebrows:** define a target `{ lift, tilt, curve }` per mood; blend `prev -> current` using `moodBlend` (already a Remotion `spring` computed by the composition). Mouth corners may follow the mood only while the mouth is `X`.
- **Gestures:** only when `isTalking === true`. Forearms rotate around the elbow pivot with `Math.sin` at different phases/frequencies per arm. Amplitude by `gestureIntensity`: `calm 6deg`, `moderate 14deg`, `expressive 26deg`. When `isTalking` is false the arms ease back to a rest angle with `spring`.
- **Poses:** `standing` draws the full body; `sitting_desk` draws torso up, hands resting/gesturing above the desk line (the desk is a foreground layer of the environment).

## 3. Rhubarb viseme switch-case

Always implement all nine shapes. `X` is the closed/idle mouth.

```tsx
const Mouth: React.FC<{ shape: MouthShape }> = ({ shape }) => {
  switch (shape) {
    case "A": // closed, P / B / M
      return <path d="M-14 0 Q0 2 14 0" stroke={OUTLINE} strokeWidth={3} fill="none" />;
    case "B": // slightly open, clenched teeth: K / S / T / EE
      return <rect x="-16" y="-4" width="32" height="8" rx="3" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "C": // open: EH / AE
      return <ellipse cx="0" cy="2" rx="16" ry="11" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "D": // wide open: AA
      return <ellipse cx="0" cy="4" rx="18" ry="18" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "E": // rounded, slightly open: AO / ER
      return <ellipse cx="0" cy="3" rx="11" ry="13" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "F": // puckered: UW / OW / W
      return <ellipse cx="0" cy="2" rx="7" ry="8" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />;
    case "G": // upper teeth on lower lip: F / V
      return <path d="M-15 -3 H15 Q10 8 0 8 Q-10 8 -15 -3 Z" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />; // + white upper teeth rect
    case "H": // tongue up: L
      return <ellipse cx="0" cy="3" rx="15" ry="10" fill="#6B2D2D" stroke={OUTLINE} strokeWidth={3} />; // + pink tongue ellipse
    case "X": // idle / closed
    default:
      return <path d="M-12 0 Q0 3 12 0" stroke={OUTLINE} strokeWidth={3} fill="none" />;
  }
};
```

Adapt coordinates/proportions to each character's face; keep the shape semantics.

## 4. Speech modes and lip-sync isolation

| `lineType`  | Voice                          | Rhubarb | Speaker mouth      | Other characters | Arms / gestures |
| ----------- | ------------------------------ | ------- | ------------------ | ---------------- | --------------- |
| `dialogue`  | `character.voiceId`            | YES     | cues, `isTalking`  | `X`, not talking | speaker only    |
| `thought`   | `character.voiceId`            | NO      | `X`, `isTalking=false` | `X`          | none; use `eyeLook` + `mood` |
| `narration` | `narratorVoiceId`, speaker `"narrator"` | NO | all `X`            | all `X`          | none            |

`produce.mjs` writes `[{ "start": 0, "end": 999, "value": "X" }]` for `thought` and `narration`. `EpisodeComposition.tsx` additionally enforces closed mouths at render time: only a `dialogue` segment of the matching `speakerId` can yield a non-`X` shape or `isTalking={true}`.

Thought beats should be paired with `mood`/`eyeLook` events so the viewer sees the thinking.

## 5. Show, Don't Tell standards

Never voice physical actions or ambient events. Convey them with three channels:

1. **Ambience** (`scene.ambience`): one looping ElevenLabs sound-generation prompt per scene, e.g. `"quiet bedroom at night, faint distant traffic, soft room tone"`. Mixed at volume 0.18.
2. **SFX** (`scene.sfx[]`): `{ prompt, atSec, durationSec }`, one cue per physical event, mixed at 0.85. Prompts are concrete and short: `"smartphone vibrating on a wooden desk, two buzzes"`, `"wooden door creaking open slowly"`, `"soft footsteps on a hardwood floor, four steps"`.
3. **Visual events** (`scene.events[]`): `{ type, atSec, durationSec?, characterId?, value? }` synchronized to the SFX `atSec`.

| event            | value                                         | effect                                           |
| ---------------- | --------------------------------------------- | ------------------------------------------------ |
| `phoneVibrate`   | `true` (window = `durationSec`, default 1.5s) | background phone prop shakes                      |
| `doorState`      | `"open" \| "ajar" \| "closed"` or 0..1        | door swings via spring                            |
| `lightFlicker`   | window = `durationSec` (default 2s)           | lamp brightness flickers                          |
| `characterEnter` | `"left" \| "right"` (+ `characterId`)         | character hidden until `atSec`, then springs in   |
| `eyeLook`        | `center/left/right/up/down/phone` or `{x,y}`  | eased pupil move, held until the next `eyeLook`   |
| `mood`           | a mood name                                   | eyebrow/face blend, held until the next `mood`    |
| `jump`           | none                                          | 12-frame startle hop                              |

Timeline: each scene starts with `leadInSec` (default 0.4s) of silence; lines play sequentially after it. `atSec` values are relative to the scene start, so place a `phoneVibrate` + sfx at e.g. `0.6` to have the buzz land before the first line. Scene length = max(lines end, `holdSec`, last sfx end, last event + 0.5s).

## 6. Remotion animation rules

- Use `useCurrentFrame()` and `useVideoConfig()`; never `setTimeout`, CSS transitions, or `Math.random()` (renders must be deterministic).
- `interpolate` for linear/clamped motion (always set `extrapolateLeft/Right: "clamp"` when the range matters). `spring` for natural settling (`config: { damping: 200 }` for smooth, `{ damping: 18, stiffness: 120 }` for bouncy entries).
- Oscillation (breathing, gestures) uses `Math.sin(frame / period + phase)` with per-character phase offsets.
- Characters and backgrounds are pure functions of props + frame.
- Compositions: `Episode` (props from `src/data/episode.json`), `CharacterCheck`, `EnvironmentCheck`.
- Audio: three layers inside each scene: speech `1.0`, SFX `0.85`, ambience `0.18` with `loop`.

## 7. Environment layer hierarchy

A background component receives `BackgroundProps` and renders, inside one `AbsoluteFill`:

```
<g id="back">          sky / wall / far scenery (colors by timeOfDay)
<g id="mid">           furniture, window with scrolling view, door (rotates by doorState), lamp (opacity by lightFlicker), phone prop (shake when phoneVibrate)
{children}             characterSlot: characters are injected here
<g id="foreground">    desk / counter / plants drawn IN FRONT of seated characters
```

Time-of-day palettes: `day` bright and neutral, `sunset` warm orange wash + long shadows, `night` desaturated blue wash with warm lamp glow. Props animate from frame/props only (e.g. phone shake = `Math.sin(frame * 2.4) * 4` while `phoneVibrate`). Wrap each layer in an SVG `<svg viewBox="0 0 1080 1920">` positioned absolutely so z-order is explicit: `back`, `mid`, `children`, `foreground`.

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
- `schemas/draft_script.schema.json`: schema for `src/data/draft_script.json`.
- Model: `eleven_flash_v2_5` on `planTier: "free"`, `eleven_multilingual_v2` otherwise; `language_code` is sent with every request.
- `durationInFrames = Math.ceil((durationSec + 0.25) * 30)` per segment.

## 10. Scaffold specs (used by `/setup` when a file is missing)

`/setup` first tries `git checkout -- <file>` for any missing tracked scaffold file. If that is impossible, regenerate from these specs:

- `src/types.ts`: shared types/constants from section 1, `EpisodeData` types (`EpisodeScene`, `EpisodeSegment`, `EpisodeSfx`, `EpisodeEvent`), `emptyEpisode`.
- `src/components/Subtitle.tsx`: absolute at `bottom: 360px`, white fill, `WebkitTextStroke: 14px #1E1B18` with `paintOrder: "stroke fill"`, balanced chunks of 3-4 words timed over the spoken frames, italic for `thought`.
- `src/components/CharacterActor.tsx`: positions a registered character in the 600x1200 box at `x * 1080`, floor `1500`.
- `src/EpisodeComposition.tsx`: per-scene `<Sequence>`; held-state springs for `eyeLook`/`mood`/`doorState`; windowed `phoneVibrate`/`lightFlicker`; `characterEnter`/`jump`; strict mouth isolation; three `<Audio>` layers (1.0 / 0.85 / 0.18 loop); `Subtitle`.
- `src/CheckCompositions.tsx`, `src/Root.tsx`, `src/index.ts`: `Episode` (duration from `totalDurationInFrames` via `calculateMetadata`), `CharacterCheck`, `EnvironmentCheck` at 1080x1920 / 30 FPS.
