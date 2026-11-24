import type { ReactNode } from "react";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/**
 * Character canvas contract: every character renders one <svg viewBox="0 0 800 1000"> whose
 * bottom-center point (400, 1000) is the anchor (feet when standing, seat line when sitting).
 * The composition places that anchor at (SLOT_X[slot], CHARACTER_BASELINE_Y).
 * Backgrounds must draw their floor line / seat line at CHARACTER_BASELINE_Y.
 */
export const CHARACTER_BOX = { width: 800, height: 1000 } as const;
export const CHARACTER_BASELINE_Y = 1480;
export const SLOT_X = { left: 300, center: 540, right: 780 } as const;

/** The 9 Rhubarb Lip Sync mouth shapes. */
export type Viseme = "X" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export type Mood = "neutral" | "happy" | "sad" | "angry" | "surprised" | "worried" | "skeptical";

export type EyeLook = "center" | "left" | "right" | "up" | "down";

export type Pose = "standing" | "sitting";

export type TimeOfDay = "day" | "sunset" | "night";

export type DoorState = "closed" | "open";

export type Slot = "left" | "center" | "right";

export type CharacterProps = {
  /** Current Rhubarb viseme for this frame ("X" when silent). */
  viseme: Viseme;
  /** True while this character's voiceover line is playing; enables gesture arms. */
  isTalking: boolean;
  mood: Mood;
  eyeLook: EyeLook;
  pose: Pose;
  /** Outfit key registered by the character (e.g. "dark_sweater"). */
  outfit?: string;
  /** Mirror the character horizontally (face left). */
  flip?: boolean;
  /** Optional color overrides (hair, skin, outfit, ...). Keys are defined per character. */
  colors?: Record<string, string>;
};

export type BackgroundProps = {
  timeOfDay: TimeOfDay;
  doorState: DoorState;
  /** 0 = fully closed, 1 = fully open (animated by the composition). */
  doorProgress: number;
  /** Characters are rendered by the composition and injected between `mid` and `foreground`. */
  characterSlot: ReactNode;
};

export type MouthCue = { start: number; end: number; value: Viseme };

export type SceneEvent =
  | { type: "doorOpen"; atFrame: number }
  | { type: "doorClose"; atFrame: number }
  | { type: "enter"; atFrame: number; characterId: string; enterFrom: "left" | "right" | "door" }
  | { type: "exit"; atFrame: number; characterId: string; exitTo: "left" | "right" | "door" }
  | { type: "mood"; atFrame: number; characterId: string; mood: Mood }
  | { type: "eyeLook"; atFrame: number; characterId: string; eyeLook: EyeLook }
  | { type: "jump"; atFrame: number; characterId: string };

export type EpisodeLine = {
  characterId: string;
  text: string;
  audioFile: string;
  lipsyncFile: string;
  /** Start frame inside the scene. */
  startFrame: number;
  /** Frames reserved for this line: ceil((durationSec + 0.25) * 30). */
  durationInFrames: number;
  /** Frames of actual speech: ceil(durationSec * 30). */
  speechFrames: number;
  mouthCues: MouthCue[];
};

export type EpisodeSceneCharacter = {
  characterId: string;
  slot: Slot;
  pose: Pose;
  outfit?: string;
  flip?: boolean;
  colors?: Record<string, string>;
};

export type EpisodeScene = {
  id: string;
  environmentId: string;
  timeOfDay: TimeOfDay;
  doorState: DoorState;
  camera: { zoomFrom: number; zoomTo: number; focusX: number; focusY: number };
  characters: EpisodeSceneCharacter[];
  events: SceneEvent[];
  lines: EpisodeLine[];
  durationInFrames: number;
};

export type Episode = {
  episodeNumber: number;
  title?: string;
  languageCode: string;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  scenes: EpisodeScene[];
};
