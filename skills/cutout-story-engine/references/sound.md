# Speech, sound and events

What to put on screen and when is in `storytelling.md`; this file is the vocabulary the engine understands.

## 1. Speech modes and lip-sync isolation

| `lineType`  | Voice                          | Rhubarb | Speaker mouth      | Other characters | Arms / gestures |
| ----------- | ------------------------------ | ------- | ------------------ | ---------------- | --------------- |
| `dialogue`  | `character.voiceId`            | YES     | cues, `isTalking`  | `X`, not talking | none            |
| `thought`   | `character.voiceId`            | NO      | `X`, `isTalking=false` | `X`          | none; use `eyeLook` + `mood` |
| `narration` | `narratorVoiceId`, speaker `"narrator"` | NO | all `X`            | all `X`          | none            |

`produce.mjs` writes `[{ "start": 0, "end": 999, "value": "X" }]` for `thought` and `narration`. `EpisodeComposition.tsx` additionally enforces closed mouths at render time: only a `dialogue` segment of the matching `speakerId` can yield a non-`X` shape or `isTalking={true}`.

Thought beats should be paired with `mood`/`eyeLook` events so the viewer sees the thinking. Characters never use speech gestures; acting is eyes, brows, mood, posture and camera.

**Captions:** every spoken line is captioned from the provider timestamps, in short phrases. `highlight: true` shows the caption in yellow (hook, reveal, vow); `caption: false` hides it (background chatter). A speaker who is off screen (a voice through a door) is a `dialogue` line whose speaker is not in `characters`; no mouth moves.

## 2. Show, Don't Tell standards

Never voice physical actions or ambient events. Convey them with three channels:

1. **Ambience** (`scene.ambience`): one looping ElevenLabs sound-generation prompt per scene, e.g. `"quiet bedroom at night, faint distant traffic, soft room tone"`. Mixed at volume 0.18. Present-day scenes only; one bed per location.
2. **SFX** (`scene.sfx[]`): `{ prompt, atSec, durationSec }`, one cue per physical event, mixed at 0.85. Prompts are concrete and short: `"single slow heavy heartbeat, close and muffled, chest resonance"`, `"two soft knuckle knocks on a wooden door"`, `"one dull body thud on a carpeted floor"`.
3. **Visual events** (`scene.events[]`): `{ type, atSec, durationSec?, characterId?, value? }` synchronized to the SFX `atSec`.

**Never generate:** crowd laughter, cheering or applause; phone vibrations, beeps, monitor tones or flatlines in a hook; whooshes to fill silence. They sound synthetic and cost more retention than they add. Laughter is shown, not heard: smug faces, chat messages, a climbing reaction counter.

| event            | value                                         | effect                                           |
| ---------------- | --------------------------------------------- | ------------------------------------------------ |
| `phoneVibrate`   | `true` (window = `durationSec`, default 1.5s) | background phone prop shakes                      |
| `doorState`      | `"open" \| "ajar" \| "closed"` or 0..1        | door swings via spring                            |
| `lightFlicker`   | window = `durationSec` (default 2s)           | lamp brightness flickers                          |
| `characterEnter` | `"left" \| "right"` (+ `characterId`)         | character hidden until `atSec`, then springs in   |
| `eyeLook`        | `center/left/right/up/down/phone` or `{x,y}`  | eased pupil move, held until the next `eyeLook`   |
| `mood`           | a mood name                                   | eyebrow/face blend, held until the next `mood`    |
| `jump`           | none                                          | 12-frame startle hop                              |
| `eyes`           | `open \| closed` (+ `characterId`)            | holds the eyelids                                 |
| `standUp`        | none (+ `characterId`, pose `lying_floor`)    | rises to standing over `durationSec`              |
| `fall`           | none (+ `characterId`)                        | drops from standing to the floor                  |
| `walk`           | target x (0..1) (+ `characterId`)             | walks there over `durationSec`                    |
| `camera`         | `{x, y, zoom}` in canvas px, zoom 1..6        | glides from the previous framing to this one      |
| `knock`          | none                                          | "knock" lettering at the door, in the episode language |
| `notify`         | none                                          | chat reactions pop up over the phone              |
| `title`          | text, `*word*` red, `\|` line break, max 60 chars | big hook text in the upper middle for `durationSec` |
| `endCard`        | text                                          | closing call to action over a darkened picture    |

A camera at zoom `z` shows the set only while `540/z <= x <= 1080-540/z` and `960/z <= y <= 1920-960/z`; outside that it shows the black past the set.

## 3. Scene settings

| Field        | Values                                       | Effect |
| ------------ | -------------------------------------------- | ------ |
| `perspective`| `present \| memory`                          | memories render darker, black and white, with a vignette |
| `transition` | `cut \| blink \| flash \| fadeFromBlack \| eyesOpen` | how the scene starts |
| `exit`       | `flash \| eyesClose`                          | how the scene ends |
| `effect`     | `heartAttack \| dying`                        | heartbeat-synced blur, red pulses, tunnel vision and an ECG line; the close-up heart-attack opening for `heartAttack` |
| `label`      | text                                         | small phone-style time stamp at the top ("Vor 3 Tagen") |

## 4. Timeline

The plan fixes every cue's scene-relative start and duration; round times to 30 FPS and leave explicit silence between speech slots. `npm run produce` fits the speech slots to the recorded audio: a longer take pushes every later cue in the scene back by the same amount, and more than 0.35s of trailing silence in a slot is trimmed. The plan file stays as written; `sessions/episode-N/timing.json` lists each change. `--keep-timing` renders the plan exactly and fails on an overflow.

