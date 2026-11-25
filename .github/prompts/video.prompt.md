---
name: video
description: Render the locked episode with its planned timing, cast, locations, voices and effects.
agent: agent
---

# /video

1. Read `AGENTS.md` and the animator skill. Run `npm run session -- video`. Stop on failure and report the indicated prerequisite. Inspect the active `plan.json`; if a creative decision is unresolved, report its field and **Complete /create first.** Do not interview, recast, rewrite or retime.
2. Run `npm run produce`. It uses this episode's plan, placed assets, voices, delivery settings and timed cues. If synthesized speech exceeds its slot, report the scene, line and needed time for `/create`; never shift later beats. For tool errors report the failed dependency rather than editing the plan. Keep audio caches.
3. Report `out/episode_<N>.mp4`, the episode-specific props file and the producer's credit usage. Continue with `/review`.
