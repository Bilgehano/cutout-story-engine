import React from "react";
import {
  CHARACTER_BOX,
  CHARACTER_FLOOR_Y,
  VIDEO_WIDTH,
  type CharacterProps,
  type GestureIntensity,
  type Mood,
  type MouthShape,
  type Pose,
} from "../types";
import { characterRegistry } from "./characters";

export type CharacterActorProps = {
  characterId: string;
  pose: Pose;
  /** Horizontal anchor as a fraction of the canvas width. */
  x: number;
  flip?: boolean;
  outfit?: string;
  conditions?: string[];
  gestureIntensity?: GestureIntensity;
  mouthShape: MouthShape;
  isTalking: boolean;
  eyeLook: { x: number; y: number };
  mood: Mood;
  prevMood: Mood;
  moodBlend: number;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
};

/** Positions a registered character on the floor line of the 1080x1920 canvas. */
export const CharacterActor: React.FC<CharacterActorProps> = ({
  characterId,
  x,
  offsetX = 0,
  offsetY = 0,
  opacity = 1,
  ...characterProps
}) => {
  const Character = characterRegistry[characterId];
  const props: CharacterProps = characterProps;

  return (
    <div
      style={{
        position: "absolute",
        left: x * VIDEO_WIDTH - CHARACTER_BOX.width / 2 + offsetX,
        top: CHARACTER_FLOOR_Y - CHARACTER_BOX.height + offsetY,
        width: CHARACTER_BOX.width,
        height: CHARACTER_BOX.height,
        opacity,
      }}
    >
      {Character ? (
        <Character {...props} />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            border: "6px dashed #D7263D",
            color: "#D7263D",
            fontSize: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          Character "{characterId}" is not registered
        </div>
      )}
    </div>
  );
};
