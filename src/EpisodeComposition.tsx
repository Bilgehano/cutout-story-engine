import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { characterRegistry } from "./components/characters";
import { backgroundRegistry } from "./components/backgrounds";
import { Subtitle } from "./components/Subtitle";
import {
  CHARACTER_BASELINE_Y,
  CHARACTER_BOX,
  SLOT_X,
  WIDTH,
} from "./components/types";
import type {
  Episode,
  EpisodeLine,
  EpisodeScene,
  EpisodeSceneCharacter,
  EyeLook,
  Mood,
  SceneEvent,
  Viseme,
} from "./components/types";

const TRANSITION_FRAMES = 24;

type CharacterEvent = Extract<SceneEvent, { characterId: string }>;

const eventsForCharacter = (scene: EpisodeScene, characterId: string): CharacterEvent[] =>
  scene.events.filter((e): e is CharacterEvent => "characterId" in e && e.characterId === characterId);

const latest = <T extends { atFrame: number }>(events: T[], frame: number): T | undefined =>
  events.filter((e) => e.atFrame <= frame).sort((a, b) => a.atFrame - b.atFrame).pop();

const activeLine = (scene: EpisodeScene, frame: number): EpisodeLine | undefined =>
  scene.lines.find((l) => frame >= l.startFrame && frame < l.startFrame + l.durationInFrames);

const visemeAt = (line: EpisodeLine | undefined, frame: number, fps: number): Viseme => {
  if (!line) return "X";
  const t = (frame - line.startFrame) / fps;
  const cue = line.mouthCues.find((c) => t >= c.start && t < c.end);
  return cue ? cue.value : "X";
};

/** Resolves entrance / exit animation state for one character at a frame. */
const presence = (scene: EpisodeScene, character: EpisodeSceneCharacter, frame: number, fps: number) => {
  const events = eventsForCharacter(scene, character.characterId)
    .filter((e) => e.type === "enter" || e.type === "exit")
    .sort((a, b) => a.atFrame - b.atFrame);
  const full = { visible: true, offsetX: 0, opacity: 1, scale: 1 };
  if (events.length === 0) return full;
  if (events[0].type === "enter" && frame < events[0].atFrame) return { ...full, visible: false };
  const last = latest(events, frame);
  if (!last) return full;

  const p = spring({ frame: frame - last.atFrame, fps, config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES });
  const hidden = last.type === "enter" ? 1 - p : p;
  if (hidden >= 0.999) return { ...full, visible: false };

  const direction = last.type === "enter" ? last.enterFrom : (last as Extract<SceneEvent, { type: "exit" }>).exitTo;
  const x = SLOT_X[character.slot];
  if (direction === "door") {
    return { visible: true, offsetX: 0, opacity: 1 - hidden, scale: 0.85 + 0.15 * (1 - hidden) };
  }
  const away = direction === "left" ? -(x + CHARACTER_BOX.width / 2 + 40) : WIDTH - x + CHARACTER_BOX.width / 2 + 40;
  return { visible: true, offsetX: away * hidden, opacity: 1, scale: 1 };
};

const doorProgressAt = (scene: EpisodeScene, frame: number, fps: number): number => {
  const initial = scene.doorState === "open" ? 1 : 0;
  const doorEvents = scene.events.filter((e) => e.type === "doorOpen" || e.type === "doorClose");
  const last = latest(doorEvents, frame);
  if (!last) return initial;
  const p = spring({ frame: frame - last.atFrame, fps, config: { damping: 200 }, durationInFrames: 20 });
  return last.type === "doorOpen" ? p : 1 - p;
};

const jumpOffset = (scene: EpisodeScene, characterId: string, frame: number, fps: number): number => {
  const jumps = eventsForCharacter(scene, characterId).filter((e) => e.type === "jump");
  const last = latest(jumps, frame);
  if (!last) return 0;
  const settle = spring({
    frame: frame - last.atFrame,
    fps,
    from: 1,
    to: 0,
    config: { damping: 7, stiffness: 180, mass: 0.6 },
  });
  return -90 * settle;
};

const SceneView: React.FC<{ scene: EpisodeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line = activeLine(scene, frame);
  const viseme = visemeAt(line, frame, fps);
  const speaking = line !== undefined && frame - line.startFrame < line.speechFrames;

  const zoom = interpolate(frame, [0, Math.max(1, scene.durationInFrames)], [scene.camera.zoomFrom, scene.camera.zoomTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const Background = backgroundRegistry[scene.environmentId];

  const characterNodes = scene.characters.map((sc) => {
    const Character = characterRegistry[sc.characterId];
    if (!Character) {
      throw new Error(`Character "${sc.characterId}" is not registered in src/components/characters/index.ts`);
    }
    const pres = presence(scene, sc, frame, fps);
    if (!pres.visible) return null;

    const events = eventsForCharacter(scene, sc.characterId);
    const moodEvent = latest(events.filter((e): e is Extract<SceneEvent, { type: "mood" }> => e.type === "mood"), frame);
    const eyeEvent = latest(events.filter((e): e is Extract<SceneEvent, { type: "eyeLook" }> => e.type === "eyeLook"), frame);
    const mood: Mood = moodEvent ? moodEvent.mood : "neutral";
    const eyeLook: EyeLook = eyeEvent ? eyeEvent.eyeLook : "center";
    const isTalking = speaking && line?.characterId === sc.characterId;

    const x = SLOT_X[sc.slot] + pres.offsetX;
    const y = jumpOffset(scene, sc.characterId, frame, fps);

    return (
      <div
        key={sc.characterId}
        style={{
          position: "absolute",
          left: x - CHARACTER_BOX.width / 2,
          top: CHARACTER_BASELINE_Y - CHARACTER_BOX.height + y,
          width: CHARACTER_BOX.width,
          height: CHARACTER_BOX.height,
          opacity: pres.opacity,
          transform: `scale(${pres.scale})`,
          transformOrigin: "50% 100%",
        }}
      >
        <Character
          viseme={isTalking ? viseme : "X"}
          isTalking={isTalking}
          mood={mood}
          eyeLook={eyeLook}
          pose={sc.pose}
          outfit={sc.outfit}
          flip={sc.flip}
          colors={sc.colors}
        />
      </div>
    );
  });

  const characterLayer = <>{characterNodes}</>;

  return (
    <AbsoluteFill style={{ backgroundColor: "#1E1B18" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${scene.camera.focusX}% ${scene.camera.focusY}%` }}>
        {Background ? (
          <Background
            timeOfDay={scene.timeOfDay}
            doorState={scene.doorState}
            doorProgress={doorProgressAt(scene, frame, fps)}
            characterSlot={characterLayer}
          />
        ) : (
          <AbsoluteFill style={{ background: "linear-gradient(#3a4a63, #1E1B18)" }}>{characterLayer}</AbsoluteFill>
        )}
      </AbsoluteFill>

      {scene.lines.map((l, i) => (
        <Sequence key={i} from={l.startFrame} durationInFrames={l.durationInFrames}>
          <Audio src={staticFile(l.audioFile)} />
          <Subtitle text={l.text} speechFrames={l.speechFrames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const EpisodeComposition: React.FC<{ episode: Episode }> = ({ episode }) => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#1E1B18" }}>
      {episode.scenes.map((scene) => {
        const from = cursor;
        cursor += scene.durationInFrames;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.durationInFrames}>
            <SceneView scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
