---
name: video
description: Render the locked episode with its planned timing, cast, locations, voices and effects.
agent: agent
---

# /video

1. Read `AGENTS.md` and the animator skill. Run `npm run session -- status` and open the returned locked plan. Stop on failure. If a creative decision is unresolved, report its field and **Complete /create first.** Do not interview, recast, rewrite or retime.
2. Execute both internal asset stages in this invocation (including for existing assets and revised locks):
   - **Puppets:** verify registry mappings for returning cast. For each `missing.character` draw the specified named component, implement planned poses, visemes and mood controls, register by plan ID and upsert the snapshot without `source` in the story bible. Render `CharacterCheck` stills of planned poses and an open viseme into `out/episode_<N>_qa/`. Inspect and fix before `npm run session -- finish-character`.
   - **Sets:** verify returning set registrations, build only `missing.environment`, register and upsert snapshots likewise. Render `EnvironmentCheck` for planned lighting, interactive states, floor alignment and occlusion with the cast. Inspect and fix before `npm run session -- finish-environment`. On resume, finish outstanding QA even if files already exist. Preserve returning designs and all audio caches.
   - Typecheck changed TypeScript. Run `npm run session -- video` to verify both stage receipts against this plan.
3. Run `npm run produce`. It sends each line with the locked delivery settings and neighbouring turns in separate ElevenLabs context fields. Scenes and changes of speech mode break continuity; one character's private thoughts never become another's dialogue context. Only the current line is voiced and captioned when eligible. If speech exceeds its slot, report the scene, line and needed time for `/create`; never shift later beats. Report tool errors rather than editing the plan.
4. Report `out/episode_<N>.mp4`, episode props and new/cached audio counts. Continue with `/review`.
