# Storytelling and retention playbook

`/create` applies every rule here by default, without being asked. The creator gives a premise, a few sentences or a novel summary; everything below is the agent's job. These rules come from finished episodes: each one replaced a round of creator corrections. Break a rule only for a concrete reason written in `brief.md`.

## 1. The series layer (`series.json`, once per series)

A short premise is not an episode. Before the first episode, turn it into `series.json` in the project root:

```json
{
  "title": "Bastis Rache",
  "logline": "A bullied student dies at 19 and wakes up one year earlier, determined to change everything.",
  "genre": "revenge / second chance / glow-up",
  "audience": "German TikTok, 16-25",
  "language": "de",
  "tone": "raw, fast, emotional; small wins feel huge",
  "protagonist": { "id": "Bastian", "want": "make them regret it", "wound": "humiliated in front of everyone", "look": "glasses taped in the middle, acne, greasy hair, stained hoodie" },
  "rules": ["He remembers everything from the first life", "Only he knows the future"],
  "arc": [
    { "episode": 1, "beat": "Dies at 03:12, wakes up a year earlier, swears revenge" },
    { "episode": 2, "beat": "First day back: uses one memory to dodge a humiliation" }
  ],
  "endCard": "Folge {n+1} morgen"
}
```

- `arc` has 8-12 beats; each beat is one episode with its own turn. Escalate: every beat costs more or wins bigger than the last. Revenge, glow-up and second-chance stories pay off a small victory every episode and save the big one for the season end.
- A novel summary is compressed, not adapted line by line: keep the protagonist's want, the central wound, the antagonists and the 8-12 biggest reversals; cut subplots.
- Later episodes read `series.json` through `npm run session -- summary` and take the next unplayed beat unless the creator says otherwise. Update `arc` when an episode changes the plan.

## 2. Episode shape (45-65 seconds)

| Part | Time | Job |
| --- | --- | --- |
| Cold open | 0-3s | The most extreme moment of the episode, in close-up, with a title card |
| Hook payoff | 3-10s | One shot that says what the series is (the premise) or why this moment matters |
| Turns | 10-50s | 3-5 short scenes, each one a new piece of information or a new blow |
| Payoff | last 10s | The emotional release, then a new open question |
| End card | last 2-3s | `endCard` with the series call to action |

- **Start at the end.** If the episode has a death, a slap, a reveal or a decision, open on it and then show how we got there. Never open on someone waking up, walking in or setting the scene.
- **Close-up first.** The first frame is a face or a hand filling the screen, never a wide room with a small figure. Viewers decide in the first second.
- **Title card.** A `title` event at 0s in the first scene states the hook in max 8 words in the episode language, with the key word in `*red*`, and matches what is said or thought (for example `Ich bin mit *19* gestorben.`). It stays 2-3s.
- **Premise in a glimpse.** For a pilot, a 2-3s flash-forward of the turnaround ("then I woke up a year earlier") right after the cold open tells the viewer what they are watching; then go back.
- **One turn per scene.** Every scene ends in a different state than it began (humiliated, betrayed, alone, alive again). If two scenes do the same job, cut one.
- **Escalate.** Each memory is worse than the last (public mockery, rejection, a leaked photo seen by everyone, the mother hearing him cry).
- **End open.** The last beat pays off this episode and asks a new question (a vow, a threat, a new person, a ticking clock). Never resolve the cliffhanger in the final seconds.

## 3. Pacing

- **No dead air.** Max 0.6s of silence between lines unless a sound or an action fills it. A silent reaction beat is 0.5-1.0s, not 2s.
- **Short scenes.** 2-7s each. A scene over 6s needs a camera move or a blocking change every 3s. Long monologues get two or three camera framings.
- **Fast transitions.** Flashes and eye transitions take 6-12 frames. Never fade slowly.
- **Talk speed stays natural.** Speed comes from cutting waits, not from fast voices.
- **Fewer, stronger lines.** Total speech is about 60-70% of the runtime. A line that only explains what the picture shows is cut.

## 4. Time and memory

- Every change of time gets a visible transition: `flash` in and out of memories, `eyesClose`/`eyesOpen` for dying, fainting or waking, `blink` for a short jump.
- Every memory scene has a `label` with how long ago it was, in the episode language and as on a phone ("Vor 3 Monaten", "Vor 1 Woche"); the first return to the present gets one too ("Heute, 03:12 Uhr"). Labels count down towards the present.
- Memories render darker and in black and white automatically (`perspective: "memory"`). They have **no ambience** and no crowd sounds; only the story sounds that matter.
- After the memories, return to the exact present moment the episode opened on, so the viewer feels the loop close.

## 5. Speech

- **The protagonist speaks for the viewer.** Inner reactions are `thought` lines in his own voice, mouth closed, eyes and mood moving. Use a narrator only if the series is told by one; never narrate an action.
- **Dying, fainting, crying:** weak, broken, quiet delivery (`tags` like `weak`, `breathless`, `crying`), never shouting. Vows and decisions: firm and confident, never whispered.
- One take per thought: a speech that belongs together is one line, so the voice does not reset between sentences.
- Lines sound like the people: teenagers use short, everyday words ("Chill mal", "Lieber nicht"). A bully is smug in three words, not a paragraph.
- Every spoken line is captioned automatically; mark the hook, the reveal and the vow with `highlight` so their captions stand out. Set `caption: false` for background chatter and for a line whose words a `title` card already shows, so the same sentence is not on screen twice.

## 6. Sound design: less, but exact

- **Hooks are heartbeat-and-breath only.** Nothing that sounds like an app or a device (no phone vibration, no beeps, no flatline tones) unless the phone is the story.
- **No generated crowd laughter or cheering.** It sounds fake. Show mockery with faces, chat messages and reaction counters instead.
- One `ambience` per location, only in present-day scenes, and not the same bed in two cuts in a row.
- Every `sfx` is an action we see (knock, thud, notification, footsteps). Never fill silence with a whoosh just because it is quiet.
- A sound and its picture start together; a voice through a door is a `dialogue` line from an off-screen speaker after a `knock`.

## 7. Picture

- **Characters read at a glance.** Exaggerate the archetype in the look: the loser has taped glasses, acne, greasy hair and a stained hoodie; the bully has a smug grin and expensive clothes; the popular girl has perfect hair and a cold look. A stranger must know who is who from one frame.
- **Hands stay still while talking** (the engine never adds speech gestures). Acting is eyes, brows, mood, posture and camera.
- **Everyone looks at someone.** Listeners look at the speaker; a mocked character looks down.
- Use the camera: push in on the face for emotion, cut to the phone or the door for information, pull back for isolation. Keep every camera inside the set (`session -- lock` warns when a framing shows the edge).
- Phone screens are story beats: the photo appears first, then messages arrive one by one, then reactions climb. Never show a finished chat.

## 8. Before locking: the checklist

`npm run session -- lock` prints `warnings` for the rules it can measure (opening title and first sound, runtime, dead air, static shots, missing transitions or labels, camera past the set, end card). Fix each one or keep it on purpose with one sentence in `brief.md`. Then check the rest yourself:

1. The first frame is a close-up and the hook reads muted.
2. Each scene has one turn, and the turns escalate.
3. Every time jump has a transition and a label.
4. No sound from the "never" list above.
5. The ending pays off something and opens a new question; the end card is there.
