---
name: create
description: Plan a complete episode from a premise, including continuity, designs, voices and a second-by-second shooting script.
agent: agent
---

# /create

Read `reference/sound.md`. Text and JSON only: no components, stills, audio, samples or renders. Never change shared voice defaults.

**Live gate (also for revisions):** first do a read-only voice lookup through the ElevenLabs MCP tools. If unavailable or unauthorized, stop and send the creator to `/setup`; no REST, receipt or cached substitute. The model is `voiceModel` from `session -- summary`; for a new series verify `eleven_v4` or `eleven_v3` is available for account and language (`GET /v1/models`) and use it, else report the blocker.

1. **Open.** New: `npm run session -- new`. Revision: stay in the newest `sessions/episode-N`; never overwrite another. Continuity: `npm run session -- summary` (planned events are not canon until approved).
2. **Story.** Put must-haves in `brief.md`; decide everything unspecified (speakers, narration, silence; channel language by default). Ask only on conflicting constraints or blockers. Sketch two tellings that differ in what the audience discovers and when, pick one, note why in one sentence, present only that one. The first second must show or sound a concrete detail raising a specific question; the last beat must earn a new question, choice or consequence after paying something off. Record as `openingHook`/`closingHook`.
3. **Assets** (only those used, including off-screen speakers).
   - Returning: `{"id":"Mara","source":"reuse"}` only.
   - New character: silhouette, face, hair, palette, role (`design`, max 60 words), poses, all `outfits`/`conditions` the series will need, gesture intensity, a `voiceId` from the account catalog (premade on free tier; verify supplied IDs; no collisions) and a baseline `voiceSettings`.
   - New location: framing, floor line, layers, palette, lighting, occlusion, props (max 50 words). Changed art means a new ID, or ask before `npm run session -- unlock <id>` and list it as `build` with its full definition.
4. **`plan.json`** per `schemas/plan.schema.json` (shape: `examples/episode-plan.json`). Scene lengths sum to the runtime. `beats`: one short sentence per visible or audible change. Only renderable actions; split scenes to change blocking, pose, shot or location; `x` is a canvas-width fraction.
   - Each scene has a `turn` (want, obstacle, change), `transition` into it, and `perspective`; memories are marked, reveal something that changes the present, get their own sound bed, and return explicitly.
   - Each sentence or change of intention is its own non-overlapping `atSec`/`durationSec` line with playable `intent`, 1-3 `tags` (no brackets) and clean `text`. Keep motive out of `text`. Omit `voiceSettings` to use the speaker baseline; override only when needed (stability within 0.25, similarity within 0.15; v3 stability 0, 0.5 or 1). `highlight:true` rarely; narration is captioned.
   - Write for the ear: numbers, dates, times and abbreviations as this speaker says them (`19:30` -> `halb acht` for a teenager, `neunzehn Uhr dreißig` for an announcement). No editorial dashes or ellipses; use separate slots and timed silence.
   - `ambience` is a steady bed or `null`. Every audible action has a timed `sfx` (source, surface, rhythm, distance, decay; `volume` if needed); words belong in `lines`, wordless vocals in `sfx`. Thoughts get a visible eye or mood event.
5. **Check once**, then fix: each must-have has a scene; each cut adds knowledge or tension; lines sound like these people without names or tags; each reveal has a renderable image plus a line, sound or silence; sound-only and picture-only reading of every boundary is clear; no effect masks a key word.
6. `npm run session -- lock`, fix errors. Present the scenes in order with opening, key lines and delivery, sound/transition choices, ending, runtime and plan path. Stop for the creator's verdict; `/video` means accepted.
