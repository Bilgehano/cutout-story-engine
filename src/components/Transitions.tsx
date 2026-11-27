import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { EpisodeScene } from "../types";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const EYES_FRAMES = 22;

/** Bright light burst: 0 = invisible, 1 = whole frame washed out. */
const Flash: React.FC<{ level: number }> = ({ level }) =>
  level <= 0 ? null : (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, #FFFFFF 0%, #FFF4D6 45%, #FFD98A 100%)", opacity: Math.min(1, level * 1.15) }} />
    </AbsoluteFill>
  );

/** Two soft eyelids; open 1 = fully out of view, 0 = darkness. */
const Eyelids: React.FC<{ open: number }> = ({ open }) => {
  if (open >= 1) return null;
  const edge = 960 * (1 - open);
  const bow = 520 * Math.sin(Math.PI * Math.min(1, open * 0.5 + 0.5 * open));
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%">
        <g fill="#000" style={{ filter: "blur(38px)" }}>
          <path d={`M-200 -200 H1280 V${edge - bow + 40} Q540 ${edge + bow + 40} -200 ${edge - bow + 40} Z`} />
          <path d={`M-200 2120 H1280 V${1920 - edge + bow - 40} Q540 ${1920 - edge - bow - 40} -200 ${1920 - edge + bow - 40} Z`} />
        </g>
      </svg>
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(open, [0, 0.35, 1], [1, 0.45, 0], clamp) }} />
    </AbsoluteFill>
  );
};

export const SceneTransitions: React.FC<{ scene: EpisodeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const end = scene.durationInFrames - 1;
  const flashIn = scene.transition === "flash" ? interpolate(frame, [0, 2, 8], [1, 0.8, 0], clamp) : 0;
  const flashOut = scene.exit === "flash" ? interpolate(frame, [end - 5, end], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) }) : 0;
  const opening = scene.transition === "eyesOpen"
    ? interpolate(frame, [0, 2, 8, 11, EYES_FRAMES], [0, 0, 0.32, 0.12, 1], clamp)
    : 1;
  const closing = scene.exit === "eyesClose"
    ? interpolate(frame, [end - EYES_FRAMES, end - 15, end - 11, end - 2], [1, 0.4, 0.58, 0], clamp)
    : 1;
  return (
    <AbsoluteFill>
      {scene.perspective === "memory" ? (
        <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, transparent 36%, rgba(0,0,0,0.82) 100%)" }} />
      ) : null}
      {scene.transition === "fadeFromBlack" ? <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [0, 6], [1, 0], clamp) }} /> : null}
      <Eyelids open={Math.min(opening, closing)} />
      <Flash level={Math.max(flashIn, flashOut)} />
    </AbsoluteFill>
  );
};
