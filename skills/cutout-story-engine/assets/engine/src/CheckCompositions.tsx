import React from "react";
import { AbsoluteFill } from "remotion";
import { CharacterActor, type CharacterActorProps } from "./components/CharacterActor";
import { backgroundRegistry } from "./components/backgrounds";
import {
  CHARACTER_BOX,
  CHARACTER_FLOOR_Y,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type Mood,
  type MouthShape,
  type Pose,
  type TimeOfDay,
} from "./types";

export type CharacterCheckProps = {
  characterId: string;
  pose?: Pose;
  mood?: Mood;
  mouthShape?: MouthShape;
  isTalking?: boolean;
  outfit?: string;
  conditions?: string[];
};

export type EnvironmentCheckProps = {
  environmentId: string;
  characterId?: string;
  pose?: Pose;
  x?: number;
  timeOfDay?: TimeOfDay;
  doorState?: number;
  phoneVibrate?: boolean;
  lightFlicker?: number;
};

const still = {
  eyeLook: { x: 0, y: 0 },
  prevMood: "neutral" as Mood,
  moodBlend: 1,
};

/** Neutral studio backdrop for character QA stills. */
export const CharacterCheck: React.FC<CharacterCheckProps> = ({
  characterId,
  pose = "standing",
  mood = "neutral",
  mouthShape = "X",
  isTalking = false,
  outfit,
  conditions,
}) => (
  <AbsoluteFill style={{ backgroundColor: "#EFE9DF" }}>
    <CharacterActor
      characterId={characterId}
      pose={pose}
      x={0.5}
      mouthShape={mouthShape}
      isTalking={isTalking}
      mood={mood}
      outfit={outfit}
      conditions={conditions}
      {...still}
    />
  </AbsoluteFill>
);

/** Environment QA still with an optional registered character inside the character slot. */
export const EnvironmentCheck: React.FC<EnvironmentCheckProps> = ({
  environmentId,
  characterId,
  pose = "standing",
  x = 0.5,
  timeOfDay = "day",
  doorState = 0,
  phoneVibrate = false,
  lightFlicker = 1,
}) => {
  const Background = backgroundRegistry[environmentId];
  if (!Background) {
    return (
      <AbsoluteFill
        style={{ backgroundColor: "#222", color: "#fff", fontSize: 48 }}
      >
        Environment "{environmentId}" is not registered
      </AbsoluteFill>
    );
  }
  return (
    <Background
      timeOfDay={timeOfDay}
      doorState={doorState}
      phoneVibrate={phoneVibrate}
      lightFlicker={lightFlicker}
    >
      {characterId ? (
        <CharacterActor
          characterId={characterId}
          pose={pose}
          x={x}
          mouthShape="X"
          isTalking={false}
          mood="neutral"
          {...still}
        />
      ) : null}
    </Background>
  );
};

export type CharacterSheetProps = {
  characterId: string;
  poses?: Pose[];
  outfits?: string[];
  conditions?: string[];
};

const MOODS: Mood[] = ["neutral", "happy", "sad", "angry", "surprised", "worried"];
const MOUTHS: MouthShape[] = ["X", "A", "B", "C", "D", "E", "F", "G", "H"];

/** Every pose, outfit, condition, mood and mouth shape in one still, so QA needs a single image. */
export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  characterId,
  poses = ["standing"],
  outfits = [],
  conditions = [],
}) => {
  const cells: (Partial<CharacterActorProps> & { label: string })[] = [
    ...poses.map((pose) => ({ label: pose, pose })),
    ...outfits.map((outfit) => ({ label: outfit, outfit })),
    ...conditions.map((c) => ({ label: c, conditions: [c] })),
    ...MOODS.map((mood) => ({ label: mood, mood })),
    ...MOUTHS.map((mouthShape) => ({ label: `mouth ${mouthShape}`, mouthShape, isTalking: true })),
  ];
  const columns = Math.ceil(Math.sqrt(cells.length));
  const rows = Math.ceil(cells.length / columns);
  const width = VIDEO_WIDTH / columns;
  const height = VIDEO_HEIGHT / rows;
  const scale = Math.min(width / CHARACTER_BOX.width, (height - 30) / CHARACTER_BOX.height);
  return (
    <AbsoluteFill style={{ backgroundColor: "#EFE9DF" }}>
      {cells.map(({ label, ...cell }, i) => (
        <div key={`${label}-${i}`} style={{ position: "absolute", left: (i % columns) * width, top: Math.floor(i / columns) * height, width, height, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: width / 2 - VIDEO_WIDTH / 2, top: 0, width: VIDEO_WIDTH, height: VIDEO_HEIGHT, transformOrigin: `50% ${CHARACTER_FLOOR_Y - CHARACTER_BOX.height}px`, transform: `translateY(${CHARACTER_BOX.height - CHARACTER_FLOOR_Y}px) scale(${scale})` }}>
            <CharacterActor characterId={characterId} x={0.5} pose="standing" mouthShape="X" isTalking={false} mood="neutral" {...still} {...cell} />
          </div>
          <div style={{ position: "absolute", bottom: 4, width: "100%", textAlign: "center", fontSize: 22, color: "#1E1B18" }}>{label}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
