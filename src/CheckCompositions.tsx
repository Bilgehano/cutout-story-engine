import React from "react";
import { AbsoluteFill } from "remotion";
import { CharacterActor } from "./components/CharacterActor";
import { backgroundRegistry } from "./components/backgrounds";
import type { Mood, MouthShape, Pose, TimeOfDay } from "./types";

export type CharacterCheckProps = {
  characterId: string;
  pose?: Pose;
  mood?: Mood;
  mouthShape?: MouthShape;
  isTalking?: boolean;
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
}) => (
  <AbsoluteFill style={{ backgroundColor: "#EFE9DF" }}>
    <CharacterActor
      characterId={characterId}
      pose={pose}
      x={0.5}
      mouthShape={mouthShape}
      isTalking={isTalking}
      mood={mood}
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
