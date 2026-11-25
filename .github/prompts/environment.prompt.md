---
name: environment
description: Build only the missing sets in the active episode plan.
agent: agent
---

# /environment

1. Read `AGENTS.md` and the animator skill. Run `npm run session -- status`; stop on error. Open the returned episode's `plan.json`. Verify returning locations map to their planned components in `src/components/backgrounds/index.ts`. Repair missing technical registrations from the plan. If any creative choice is missing, stop: **Complete /create first.**
2. For each `missing.environment` ID only, draw `src/components/backgrounds/<component>.tsx` as a named `BackgroundComponent`. Use its planned camera, depth layers, character slots, lighting variants and animated props. Check every scene using this set for floor alignment and foreground occlusion. Register the component by plan ID and upsert the asset snapshot (omit `source`) in `story-bible.json`. Preserve returning sets.
3. Render `EnvironmentCheck` stills into `out/episode_<N>_qa/` with the planned lighting and interactive states; check planned poses/occlusion with a registered scene character where applicable. Inspect, fix and re-render; run `npm run typecheck` after TypeScript changes. Finish any outstanding QA on resumed work.
4. Run `npm run session -- finish-environment`. If nothing needed building, report **No environments need to be created for this episode.** Otherwise report new IDs and QA paths. Continue with `/video`.
