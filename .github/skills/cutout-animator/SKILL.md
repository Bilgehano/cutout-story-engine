---
name: cutout-animator
description: Build modular SVG cut-out puppet characters and environments for Remotion, drive them with ElevenLabs audio and Rhubarb visemes, and produce vertical 9:16 episodes.
---

# Cut-Out Animator Skill

This skill is the technical reference for every character, environment, and episode in this repository. `AGENTS.md` defines the rules; this file defines the exact implementation standards. Everything is code-driven React + SVG in Remotion at `1080x1920`, `30 FPS`.

## 1. Component contracts (`src/components/types.ts`)

Never redefine these types. Import them.

- `CharacterProps`: `viseme`, `isTalking`, `mood`, `eyeLook`, `pose`, `outfit?`, `flip?`, `colors?`.
- `BackgroundProps`: `timeOfDay`, `doorState`, `doorProgress` (0..1), `characterSlot` (ReactNode).
- Registries: `characterRegistry` (`characters/index.ts`) and `backgroundRegistry` (`backgrounds/index.ts`). Keys equal the `id` in `story-bible.json`.

### Character canvas
Each character renders exactly one `<svg viewBox="0 0 800 1000" width="100%" height="100%">`. The anchor is the **bottom-center (400, 1000)**: feet when standing, seat line when sitting. The composition places the anchor at `(SLOT_X[slot], CHARACTER_BASELINE_Y = 1480)`.

### Environment canvas
Environments fill `1080x1920`. The floor line (standing) or chair seat line (sitting) must sit at `y = CHARACTER_BASELINE_Y` (1480). Layer order inside the environment component:

1. `back` – sky, walls, far scenery, window views.
2. `mid` – furniture and props behind the characters.
3. `{characterSlot}` – injected characters.
4. `foreground` – desk fronts, plants, door frame overlays, vignette, light overlays.

Props: `timeOfDay` (`day | sunset | night`) switches palette + light overlays; `doorState`/`doorProgress` animate a door (rotate or scaleX of the door leaf using `doorProgress`).

## 2. SVG `<g>` layer stack (characters)

Paint order, back to front. Every layer is its own `<g id="...">`:

1. `shadow` – ground ellipse (standing) or none (sitting).
2. `back-hair` – hair mass behind head and neck.
3. `arm-back` – far upper arm + forearm group (forearm pivots at the elbow).
4. `legs` / `lap` – legs and shoes (standing) or thighs/lower legs (sitting).
5. `torso` – outfit body, collar, wrinkles, neck shading.
6. `neck` – neck with a soft gradient shadow under the jaw.
7. `head` – face shape with cheek gradients.
8. `ears`.
9. `face-details` – nose, cheek blush, facial hair, glasses frame.
10. `eyes` – whites, iris, pupil (offset by `eyeLook`), eyelids (blink).
11. `eyebrows` – driven by `mood`.
12. `mouth` – the 9 viseme shapes.
13. `front-hair` – fringe and layered hair tufts.
14. `arm-front` – near arm group; gestures when `isTalking`.

Art rules: `stroke="#1E1B18"`, `strokeWidth={3}`, `strokeLinejoin="round"`, `strokeLinecap="round"` on every shape. Use `<linearGradient>`/`<radialGradient>` for cheek, neck, and cloth shading. Hair has 3+ overlapping tufts with differing tones. Colors come from `colors` prop with defaults; no flat single-fill stick figures. Define gradient ids with a unique character prefix (e.g. `anna-skin`) to avoid collisions.

## 3. Rhubarb viseme switch-case rules

The mouth `<g>` must switch over all nine shapes with no fallthrough defaults hiding a missing case.

| Viseme | Sound | Mouth shape |
|---|---|---|
| `X` | silence / idle | closed, relaxed lips, slight smile line |
| `A` | P, B, M | lips pressed tightly together |
| `B` | K, S, T, EE (most consonants) | lips slightly apart, teeth together |
| `C` | EH, AE | medium open, rounded rectangle |
| `D` | AA | widest open, jaw dropped, tongue visible |
| `E` | AO, ER | medium open, rounded (O-like) |
| `F` | UW, OW, W | small puckered circle |
| `G` | F, V | upper teeth touching lower lip |
| `H` | L | open, tongue tip raised behind upper teeth |

```tsx
switch (viseme) {
  case "X": return <MouthClosed />;
  case "A": return <MouthPressed />;
  case "B": return <MouthSlightlyOpen />;
  case "C": return <MouthMedium />;
  case "D": return <MouthWide />;
  case "E": return <MouthRounded />;
  case "F": return <MouthPuckered />;
  case "G": return <MouthTeethOnLip />;
  case "H": return <MouthTongueUp />;
}
```

The composition resolves the viseme from `mouthCues` (`start <= t < end`, `t = (frame - lineStart) / fps`) and passes `"X"` when the character is not speaking.

## 4. Remotion animation standards

- Use `useCurrentFrame()` and `useVideoConfig()` only. No CSS transitions, no `setTimeout`, no `Math.random()` (use deterministic functions of `frame`).
- **Blinking:** period `105` frames. `const phase = frame % 105`; eyelids close with `interpolate(phase, [0, 3, 6], [1, 0, 1], clamp)`. Offset each character's phase by a stable per-character constant so two characters never blink in sync.
- **Breathing:** `Math.sin(frame / 20) * 3` translateY on `torso` + head; shoulders move at half amplitude.
- **Mood eyebrows:** `spring({ frame, fps, config: { damping: 18, stiffness: 140 } })` between the previous and new brow pose when `mood` changes. Track the frame of change with a per-render lookup (`useMemo` on `mood` is not enough; interpolate from the previous mood target stored in a local constant table).
- **Eye look:** pupil offset table: `center (0,0)`, `left (-6,0)`, `right (6,0)`, `up (0,-5)`, `down (0,5)`.
- **Talking gestures:** when `isTalking`, forearms rotate around the **elbow pivot** with `rotate(angle, elbowX, elbowY)`. Angle = `-25 + Math.sin(frame / 7) * 12` (expressive) or `-8 + Math.sin(frame / 12) * 4` (reserved). Ease in/out with `spring` so arms do not snap.
- **Head bob while talking:** `Math.sin(frame / 5) * 1.5` degrees rotation about the neck pivot.
- Always `extrapolateLeft/Right: "clamp"` in `interpolate`.
- Springs for reactions (`jump`, entrances) use `damping` 7–12 for bouncy, `damping: 200` for smooth.

## 5. Scene events (draft script → `episode.json`)

Events are placed with `atSec` (seconds from scene start) or `atLine` + optional `offsetSec` (relative to a line start). `produce.mjs` converts them to `atFrame`.

| `type` | Fields | Effect |
|---|---|---|
| `doorOpen` / `doorClose` | – | animates `doorProgress` |
| `enter` | `characterId`, `enterFrom: left \| right \| door` | character hidden until the event, then slides/fades into its slot |
| `exit` | `characterId`, `exitTo: left \| right \| door` | reverse of enter |
| `mood` | `characterId`, `mood` | `neutral, happy, sad, angry, surprised, worried, skeptical` |
| `eyeLook` | `characterId`, `eyeLook` | `center, left, right, up, down` |
| `jump` | `characterId` | spring jump reaction |

Scene `camera`: `{ zoomFrom, zoomTo, focusX, focusY }` is a Ken Burns zoom (defaults `1 → 1.08`, focus `50% 40%`).

## 6. Draft script schema (`src/data/draft_script.json`)

```json
{
  "episodeNumber": 1,
  "title": "The Visitor",
  "languageCode": "en",
  "scenes": [
    {
      "id": "scene_1",
      "environmentId": "apartment",
      "timeOfDay": "night",
      "doorState": "closed",
      "camera": { "zoomFrom": 1, "zoomTo": 1.1, "focusX": 50, "focusY": 40 },
      "characters": [
        { "characterId": "anna", "slot": "left", "pose": "standing", "outfit": "dark_sweater" },
        { "characterId": "mark", "slot": "right", "pose": "standing" }
      ],
      "lines": [
        { "characterId": "anna", "text": "Did you hear that knock?", "voiceId": "OPTIONAL_VOICE_ID" },
        { "characterId": "mark", "text": "Nobody is supposed to be here." }
      ],
      "events": [
        { "type": "enter", "characterId": "mark", "enterFrom": "door", "atSec": 0.5 },
        { "type": "doorOpen", "atLine": 1, "offsetSec": 0.8 },
        { "type": "mood", "characterId": "anna", "mood": "worried", "atLine": 0 },
        { "type": "jump", "characterId": "anna", "atLine": 1, "offsetSec": 1.2 }
      ]
    }
  ]
}
```

A scene with no lines must provide `holdSec`. `voiceId` per line is optional (see §7).

## 7. ElevenLabs multilingual configuration

- Endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/${voiceId}` with header `xi-api-key`.
- Body: `{ "text", "model_id": "eleven_multilingual_v2", "language_code": draft.languageCode, "voice_settings": { ... } }`. If the model rejects `language_code`, `produce.mjs` retries once without it and logs a warning.
- Language resolution order: `draft.languageCode` → `story-bible.json` `defaultLanguage`.
- Voice resolution order per line: `line.voiceId` → character `voices[languageCode].voiceId` → character `voiceId` → `voiceProfiles[languageCode].defaultVoiceId` → `ELEVENLABS_DEFAULT_VOICE_ID`.
- Write dialogue, subtitles, and TTS text in the same language. Use native punctuation and diacritics (ä ö ü ß, ç ğ ı ö ş ü, ñ á é, à â ç é). Never transliterate.
- Rhubarb recognizes English only with PocketSphinx; for every other language the pipeline uses `-r phonetic`.
- Audio files are cached by a hash of text + voice + language + model; use `--force` to regenerate.

## 8. Timing pipeline

1. ElevenLabs mp3 → `public/audio/`.
2. FFmpeg: `ffmpeg -y -i in.mp3 -ar 16000 -ac 1 out.wav`.
3. Rhubarb: `bin/rhubarb[.exe] -f json -o public/lipsync/x.json out.wav`.
4. `ffprobe` duration of the WAV.
5. `durationInFrames = Math.ceil((durationSec + 0.25) * 30)` per line; scene length is the sum (or `holdSec`).

## 9. Visual QA checklist

Render with the shipped `Preview` composition (`src/PreviewComposition.tsx`) and inspect the PNG:

```bash
# Character check (all props optional; see PreviewProps)
npx remotion still Preview out/char_<Name>_check.png --props="{\"characterId\":\"<id>\"}"
# Viseme sheet (3x3 grid of X A B C D E F G H)
npx remotion still Preview out/char_<Name>_visemes.png --props="{\"characterId\":\"<id>\",\"mode\":\"visemes\"}"
# Environment + character
npx remotion still Preview out/bg_<Name>_check.png --props="{\"environmentId\":\"<envId>\",\"characterId\":\"<id>\",\"pose\":\"standing\",\"timeOfDay\":\"night\"}"
# Episode frame
npx remotion still Episode out/qa_mid.png --frame=<n>
```

On Windows PowerShell, if quoting `--props` fails, pass a JSON file path instead: `--props=out/props.json`.

Checklist:

- Outlines are consistent `3px #1E1B18`; no clipped limbs; head/neck/torso join cleanly.
- Eyes, eyebrows, and mouth are centered on the face; viseme shapes are distinguishable.
- Characters stand on the floor line / sit on the seat line; foreground props overlap correctly.
- Subtitles stay above the 360px social UI safe zone and never overflow the screen width.
