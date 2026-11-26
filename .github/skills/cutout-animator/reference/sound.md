# Speech, sound and events

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

Timeline: the locked plan fixes each scene length and every cue's scene-relative start and duration. Leave explicit silence between speech slots. Round times to 30 FPS. If synthesized speech exceeds its slot, revise the plan in `/create`.

