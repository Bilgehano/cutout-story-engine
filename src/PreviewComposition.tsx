import React from "react";
import { AbsoluteFill } from "remotion";
import { characterRegistry } from "./components/characters";
import { backgroundRegistry } from "./components/backgrounds";
import { CHARACTER_BASELINE_Y, CHARACTER_BOX, SLOT_X } from "./components/types";
import type { DoorState, EyeLook, Mood, Pose, Slot, TimeOfDay, Viseme } from "./components/types";

export type PreviewProps = {
  /** Registered character id (optional when previewing an empty environment). */
  characterId?: string;
  /** Registered environment id (optional: a neutral studio backdrop is used when omitted). */
  environmentId?: string;
  /** "scene" = one frame composition; "visemes" = 3x3 sheet of all nine Rhubarb mouth shapes. */
  mode: "scene" | "visemes";
  slot: Slot;
  pose: Pose;
  outfit?: string;
  viseme: Viseme;
  mood: Mood;
  eyeLook: EyeLook;
  isTalking: boolean;
  timeOfDay: TimeOfDay;
  doorState: DoorState;
  doorProgress: number;
};

export const previewDefaults: PreviewProps = {
  mode: "scene",
  slot: "center",
  pose: "standing",
  viseme: "X",
  mood: "neutral",
  eyeLook: "center",
  isTalking: false,
  timeOfDay: "day",
  doorState: "closed",
  doorProgress: 0,
};

const ALL_VISEMES: Viseme[] = ["X", "A", "B", "C", "D", "E", "F", "G", "H"];

/** Dev-only composition used by /character, /environment and /review for `npx remotion still Preview ...`. */
export const PreviewComposition: React.FC<PreviewProps> = (props) => {
  const Character = props.characterId ? characterRegistry[props.characterId] : undefined;
  if (props.characterId && !Character) {
    throw new Error(`Character "${props.characterId}" is not registered in src/components/characters/index.ts`);
  }

  if (props.mode === "visemes") {
    if (!Character) throw new Error("mode=visemes requires characterId");
    const cell = 360;
    return (
      <AbsoluteFill style={{ background: "#d9d4cc" }}>
        {ALL_VISEMES.map((v, i) => (
          <div
            key={v}
            style={{
              position: "absolute",
              left: (i % 3) * cell,
              top: 140 + Math.floor(i / 3) * 560,
              width: cell,
              height: 560,
              overflow: "hidden",
            }}
          >
            <div style={{ width: CHARACTER_BOX.width, height: CHARACTER_BOX.height, transform: "scale(0.7) translate(-100px, -60px)", transformOrigin: "0 0" }}>
              <Character viseme={v} isTalking={false} mood={props.mood} eyeLook={props.eyeLook} pose={props.pose} outfit={props.outfit} />
            </div>
            <div style={{ position: "absolute", left: 12, top: 4, font: "700 40px Arial", color: "#1E1B18" }}>{v}</div>
          </div>
        ))}
      </AbsoluteFill>
    );
  }

  const characterNode = Character ? (
    <div
      style={{
        position: "absolute",
        left: SLOT_X[props.slot] - CHARACTER_BOX.width / 2,
        top: CHARACTER_BASELINE_Y - CHARACTER_BOX.height,
        width: CHARACTER_BOX.width,
        height: CHARACTER_BOX.height,
      }}
    >
      <Character
        viseme={props.viseme}
        isTalking={props.isTalking}
        mood={props.mood}
        eyeLook={props.eyeLook}
        pose={props.pose}
        outfit={props.outfit}
      />
    </div>
  ) : null;

  const Background = props.environmentId ? backgroundRegistry[props.environmentId] : undefined;
  if (props.environmentId && !Background) {
    throw new Error(`Environment "${props.environmentId}" is not registered in src/components/backgrounds/index.ts`);
  }

  if (Background) {
    return (
      <AbsoluteFill>
        <Background
          timeOfDay={props.timeOfDay}
          doorState={props.doorState}
          doorProgress={props.doorProgress}
          characterSlot={characterNode}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: "linear-gradient(#d9d4cc, #b8b1a6)" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: CHARACTER_BASELINE_Y, height: 2, background: "#1E1B18", opacity: 0.4 }} />
      {characterNode}
    </AbsoluteFill>
  );
};
