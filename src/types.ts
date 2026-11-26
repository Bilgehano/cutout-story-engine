import type React from "react";

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;

/** Every character is drawn inside this box; its bottom-center is the foot anchor. */
export const CHARACTER_BOX = { width: 600, height: 1200 } as const;
/** Y coordinate (px from top of the 1080x1920 canvas) of the floor line. */
export const CHARACTER_FLOOR_Y = 1500;

export const OUTLINE_COLOR = "#1E1B18";
export const OUTLINE_WIDTH = 3;

export type MouthShape = "X" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type Mood =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "worried";
export type Pose = "standing" | "sitting_desk";
export type TimeOfDay = "day" | "sunset" | "night";
export type LineType = "dialogue" | "thought" | "narration";
export type GestureIntensity = "calm" | "moderate" | "expressive";

export type MouthCue = { start: number; end: number; value: MouthShape };

export type CharacterProps = {
  pose: Pose;
  mouthShape: MouthShape;
  isTalking: boolean;
  /** Pupil offset, each axis in [-1, 1]. */
  eyeLook: { x: number; y: number };
  mood: Mood;
  prevMood: Mood;
  /** 0..1 spring progress from prevMood to mood. */
  moodBlend: number;
  gestureIntensity?: GestureIntensity;
  /** Mirror the character horizontally. */
  flip?: boolean;
  /** Optional color overrides (hair, skin, outfit, ...). */
  colors?: Record<string, string>;
};

export type BackgroundProps = {
  timeOfDay: TimeOfDay;
  /** 0 = closed, 1 = fully open. */
  doorState: number;
  phoneVibrate: boolean;
  /** 1 = lamp at full brightness, lower values dim the lamp. */
  lightFlicker: number;
  /** The characterSlot layer: characters are rendered between mid and foreground. */
  children?: React.ReactNode;
};

export type CharacterComponent = React.FC<CharacterProps>;
export type BackgroundComponent = React.FC<BackgroundProps>;

export type EventType =
  | "phoneVibrate"
  | "doorState"
  | "lightFlicker"
  | "characterEnter"
  | "eyeLook"
  | "mood"
  | "jump";

export type EpisodeEvent = {
  type: EventType;
  /** Frame relative to the scene start. */
  frame: number;
  durationInFrames: number;
  characterId?: string;
  value?: string | number | boolean | { x: number; y: number };
};

export type EpisodeSegment = {
  captions?: {text: string; start: number; end: number}[];
  index: number;
  lineType: LineType;
  speakerId: string;
  text: string;
  audioFile: string;
  /** Frame relative to the scene start. */
  startFrame: number;
  durationInFrames: number;
  audioDurationSec: number;
  mouthCues: MouthCue[];
};

export type EpisodeSfx = {
  volume?: number;
  file: string;
  startFrame: number;
  durationInFrames: number;
};

export type SceneCharacter = {
  characterId: string;
  pose: Pose;
  /** Horizontal anchor as a fraction of the canvas width (0..1). */
  x: number;
  flip?: boolean;
  gestureIntensity?: GestureIntensity;
};

export type EpisodeScene = {
  transition?: "cut" | "blink" | "flash" | "fadeFromBlack";
  perspective?: "present" | "memory";
  id: string;
  environmentId: string;
  timeOfDay: TimeOfDay;
  ambienceFile: string | null;
  characters: SceneCharacter[];
  startFrame: number;
  durationInFrames: number;
  segments: EpisodeSegment[];
  sfx: EpisodeSfx[];
  events: EpisodeEvent[];
};

export type EpisodeData = {
  episodeNumber: number;
  languageCode: string;
  fps: number;
  width: number;
  height: number;
  totalDurationInFrames: number;
  scenes: EpisodeScene[];
};

export const emptyEpisode: EpisodeData = {
  episodeNumber: 0,
  languageCode: "en",
  fps: VIDEO_FPS,
  width: VIDEO_WIDTH,
  height: VIDEO_HEIGHT,
  totalDurationInFrames: 30,
  scenes: [],
};
