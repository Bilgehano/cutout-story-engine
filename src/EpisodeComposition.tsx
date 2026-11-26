import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CharacterActor } from "./components/CharacterActor";
import { backgroundRegistry } from "./components/backgrounds";
import { Subtitle } from "./components/Subtitle";
import type {
  EpisodeData,
  EpisodeEvent,
  EpisodeScene,
  Mood,
  MouthShape,
} from "./types";

const SPEECH_VOLUME = 1.0;
const SFX_VOLUME = 0.85;
const AMBIENCE_VOLUME = 0.18;

type Vec2 = { x: number; y: number };

const EYE_TARGETS: Record<string, Vec2> = {
  center: { x: 0, y: 0 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  phone: { x: 0.2, y: 1 },
};

const DOOR_TARGETS: Record<string, number> = {
  closed: 0,
  ajar: 0.35,
  open: 1,
};

const toEye = (value: EpisodeEvent["value"]): Vec2 => {
  if (typeof value === "object" && value !== null) {
    return value;
  }
  return EYE_TARGETS[String(value)] ?? EYE_TARGETS.center;
};

const toDoor = (value: EpisodeEvent["value"]): number => {
  if (typeof value === "number") {
    return Math.min(1, Math.max(0, value));
  }
  return DOOR_TARGETS[String(value)] ?? 0;
};

const sortedEvents = (
  events: EpisodeEvent[],
  type: EpisodeEvent["type"],
  characterId?: string,
) =>
  events
    .filter(
      (e) =>
        e.type === type &&
        (characterId === undefined || e.characterId === characterId),
    )
    .sort((a, b) => a.frame - b.frame);

/** Returns the previous and current target of a held state plus a spring progress. */
const heldState = <T,>(
  events: EpisodeEvent[],
  frame: number,
  fps: number,
  initial: T,
  convert: (value: EpisodeEvent["value"]) => T,
): { prev: T; cur: T; blend: number } => {
  let prev = initial;
  let cur = initial;
  let since = -Infinity;
  for (const event of events) {
    if (event.frame > frame) {
      break;
    }
    prev = cur;
    cur = convert(event.value);
    since = event.frame;
  }
  if (since === -Infinity) {
    return { prev, cur, blend: 1 };
  }
  const blend = spring({
    frame: frame - since,
    fps,
    config: { damping: 200 },
    durationInFrames: 12,
  });
  return { prev, cur, blend };
};

const isWindowActive = (events: EpisodeEvent[], frame: number): boolean =>
  events.some(
    (e) =>
      e.value !== false &&
      frame >= e.frame &&
      frame < e.frame + e.durationInFrames,
  );

const flickerLevel = (events: EpisodeEvent[], frame: number): number => {
  if (!isWindowActive(events, frame)) {
    return 1;
  }
  const gate = ((frame * 37) % 11) / 11 > 0.45;
  const depth = ((frame * 53) % 7) / 7;
  return gate ? 1 - 0.75 * depth : 1;
};

const mouthAt = (
  scene: EpisodeScene,
  frame: number,
  fps: number,
  characterId: string,
): { mouthShape: MouthShape; isTalking: boolean } => {
  // Only "dialogue" segments may ever open a mouth; thought/narration stay closed.
  const segment = scene.segments.find(
    (s) =>
      s.lineType === "dialogue" &&
      s.speakerId === characterId &&
      frame >= s.startFrame &&
      frame < s.startFrame + s.durationInFrames,
  );
  if (!segment) {
    return { mouthShape: "X", isTalking: false };
  }
  const t = (frame - segment.startFrame) / fps;
  if (t > segment.audioDurationSec) {
    return { mouthShape: "X", isTalking: false };
  }
  const cue = segment.mouthCues.find((c) => t >= c.start && t < c.end);
  return { mouthShape: cue?.value ?? "X", isTalking: true };
};

const SceneView: React.FC<{ scene: EpisodeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Background = backgroundRegistry[scene.environmentId];

  const door = heldState(
    sortedEvents(scene.events, "doorState"),
    frame,
    fps,
    0,
    toDoor,
  );
  const doorState = interpolate(door.blend, [0, 1], [door.prev, door.cur]);
  const phoneVibrate = isWindowActive(
    sortedEvents(scene.events, "phoneVibrate"),
    frame,
  );
  const lightFlicker = flickerLevel(
    sortedEvents(scene.events, "lightFlicker"),
    frame,
  );

  const activeSegment = scene.segments.find(
    (s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames,
  );

  const actors = scene.characters.map((sceneCharacter) => {
    const id = sceneCharacter.characterId;
    const eye = heldState(
      sortedEvents(scene.events, "eyeLook", id),
      frame,
      fps,
      EYE_TARGETS.center,
      toEye,
    );
    const eyeLook = {
      x: interpolate(eye.blend, [0, 1], [eye.prev.x, eye.cur.x]),
      y: interpolate(eye.blend, [0, 1], [eye.prev.y, eye.cur.y]),
    };
    const mood = heldState<Mood>(
      sortedEvents(scene.events, "mood", id),
      frame,
      fps,
      "neutral",
      (value) => String(value) as Mood,
    );

    let offsetX = 0;
    let opacity = 1;
    const enter = sortedEvents(scene.events, "characterEnter", id)[0];
    if (enter) {
      if (frame < enter.frame) {
        opacity = 0;
      } else {
        const progress = spring({
          frame: frame - enter.frame,
          fps,
          config: { damping: 18, stiffness: 120 },
          durationInFrames: enter.durationInFrames,
        });
        const side = enter.value === "left" ? -1 : 1;
        offsetX = side * (1 - progress) * 1000;
      }
    }

    let offsetY = 0;
    for (const jump of sortedEvents(scene.events, "jump", id)) {
      const t = (frame - jump.frame) / jump.durationInFrames;
      if (t >= 0 && t <= 1) {
        offsetY -= Math.sin(Math.PI * t) * 70;
      }
    }

    const mouth = mouthAt(scene, frame, fps, id);
    return (
      <CharacterActor
        key={id}
        characterId={id}
        pose={sceneCharacter.pose}
        x={sceneCharacter.x}
        flip={sceneCharacter.flip}
        gestureIntensity={sceneCharacter.gestureIntensity}
        mouthShape={mouth.mouthShape}
        isTalking={mouth.isTalking}
        eyeLook={eyeLook}
        mood={mood.cur}
        prevMood={mood.prev}
        moodBlend={mood.blend}
        offsetX={offsetX}
        offsetY={offsetY}
        opacity={opacity}
      />
    );
  });

  const progress = Math.min(1, frame / 14);
  const time = activeSegment ? (frame - activeSegment.startFrame) / fps : -1;
  const caption = activeSegment?.captions?.find(cue => time >= cue.start && time < cue.end);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{
        filter: scene.perspective === "memory" ? "sepia(0.45) saturate(0.7) blur(1.6px)" : undefined,
        clipPath: scene.transition === "blink" ? `inset(${50 * (1 - progress)}% 0)` : undefined,
        backgroundColor: "#000",
      }}>
      {Background ? (
        <Background
          timeOfDay={scene.timeOfDay}
          doorState={doorState}
          phoneVibrate={phoneVibrate}
          lightFlicker={lightFlicker}
        >
          {actors}
        </Background>
      ) : (
        <AbsoluteFill
          style={{
            backgroundColor: "#222",
            color: "#fff",
            fontSize: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Environment "{scene.environmentId}" is not registered
        </AbsoluteFill>
      )}
      </AbsoluteFill>
      {(scene.transition === "flash" || scene.transition === "fadeFromBlack") && progress < 1 ? (
        <AbsoluteFill style={{background:scene.transition === "flash" ? "#fff6e3" : "#000", opacity:1-progress}} />
      ) : null}

      {scene.segments.map((segment) => (
        <Sequence
          key={`speech-${segment.index}`}
          from={segment.startFrame}
          durationInFrames={segment.durationInFrames}
        >
          <Audio src={staticFile(segment.audioFile)} volume={SPEECH_VOLUME} />
        </Sequence>
      ))}
      {scene.sfx.map((cue, i) => (
        <Sequence
          key={`sfx-${i}`}
          from={cue.startFrame}
          durationInFrames={cue.durationInFrames}
        >
          <Audio src={staticFile(cue.file)} volume={cue.volume ?? SFX_VOLUME} />
        </Sequence>
      ))}
      {scene.ambienceFile ? (
        <Audio
          src={staticFile(scene.ambienceFile)}
          volume={AMBIENCE_VOLUME}
          loop
        />
      ) : null}

      <Subtitle text={caption?.text} />
    </AbsoluteFill>
  );
};

export const EpisodeComposition: React.FC<EpisodeData> = ({ scenes }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {scenes.map((scene) => (
      <Sequence
        key={scene.id}
        from={scene.startFrame}
        durationInFrames={scene.durationInFrames}
      >
        <SceneView scene={scene} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
