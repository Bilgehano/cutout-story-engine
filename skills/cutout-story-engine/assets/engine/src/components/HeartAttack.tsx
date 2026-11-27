import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundComponent, EpisodeScene, MouthShape, Pose } from "../types";
import { characterRegistry } from "./characters";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Shot boundaries in seconds: face, hand on chest, collapse, black impact, then the face on the floor. */
const HAND = 1.0;
const COLLAPSE = 1.8;
const IMPACT = 2.5;
const FLOOR = 2.8;

/** Heartbeat frames: one huge beat, then racing, then dragging until the heart stops. */
const beatFrames = (fps: number, stop: number) => {
  const beats = [2];
  for (let f = Math.round(HAND * fps); f < IMPACT * fps; f += 12) beats.push(f);
  for (let f = Math.round(FLOOR * fps), gap = 17; f < stop - 6; f += gap, gap += 2.5) beats.push(Math.round(f));
  return beats;
};

const thumpAt = (beats: number[], frame: number) => {
  const thump = (d: number) => (d >= 0 ? Math.exp(-d / 3) : 0);
  return Math.min(1, beats.reduce((v, b) => v + thump(frame - b) + 0.6 * thump(frame - b - 6), 0));
};

type CameraProps = {
  /** Puppet coordinate (600x1200 space) that lands on screen point (sx, sy). */
  fx: number; fy: number; sx: number; sy: number; zoom: number; rotate?: number; children: React.ReactNode;
};

const Camera: React.FC<CameraProps> = ({ fx, fy, sx, sy, zoom, rotate = 0, children }) => (
  <div style={{
    position: "absolute", left: sx - fx * zoom, top: sy - fy * zoom, width: 600 * zoom, height: 1200 * zoom,
    transformOrigin: `${fx * zoom}px ${fy * zoom}px`, transform: `rotate(${rotate}deg)`,
  }}>{children}</div>
);

type Props = {
  scene: EpisodeScene;
  characterId: string;
  Background: BackgroundComponent;
  mouthShape: MouthShape;
  isTalking: boolean;
  /** True while the inner voice plays: the mouth stays closed. */
  thinking: boolean;
};

/** Close-up opening: the viewer sees the attack on the face and the chest, then stays with the face. */
export const HeartAttack: React.FC<Props> = ({ scene, characterId, Background, mouthShape, isTalking, thinking }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const Character = characterRegistry[characterId];
  const stop = scene.events.find((e) => e.type === "eyes")?.frame ?? scene.durationInFrames;
  const beats = beatFrames(fps, stop);
  const beat = thumpAt(beats, frame);
  // Everything gets worse over time: red, blur and darkness start near zero.
  const danger = interpolate(frame, [0, stop], [0, 1], clamp);
  const closed = interpolate(frame, [stop, stop + 8], [0, 1], clamp);
  const jolt = { x: Math.sin(frame * 2.3) * beat * 16, y: Math.cos(frame * 2.9) * beat * 12 };
  const pulse = 1 + beat * 0.07;

  const puppet = (pose: Pose, talking: boolean, eyeY: number) => Character ? (
    <Character
      pose={pose} mouthShape={talking ? mouthShape : "X"} isTalking={talking}
      eyeLook={{ x: 0, y: eyeY }} mood="worried" prevMood="worried" moodBlend={1}
      conditions={thinking ? ["tired", "dying", "pain", "mute"] : ["tired", "dying", "pain"]} eyesClosed={closed} still
    />
  ) : null;

  const room = (scale: number, blur: number, tilt: number, origin: string) => (
    <AbsoluteFill style={{ filter: `blur(${blur}px) brightness(0.62)`, transform: `scale(${scale}) rotate(${tilt}deg)`, transformOrigin: origin }}>
      <Background timeOfDay={scene.timeOfDay} doorState={0} phoneVibrate={false} lightFlicker={1}>{null}</Background>
    </AbsoluteFill>
  );

  let shot: React.ReactNode;
  if (t < HAND) {
    const push = interpolate(t, [0, HAND], [3.1, 3.45], clamp);
    shot = (
      <>
        {room(1.9, 9, 0, "40% 35%")}
        <Camera fx={300} fy={295} sx={540 + jolt.x} sy={820 + jolt.y} zoom={push * pulse}>{puppet("standing", false, 0)}</Camera>
      </>
    );
  } else if (t < COLLAPSE) {
    const push = interpolate(t, [HAND, COLLAPSE], [3.5, 4.1], clamp);
    shot = (
      <>
        {room(2.2, 11, -3, "40% 55%")}
        <Camera fx={310} fy={590} sx={540 + jolt.x * 1.4} sy={900 + jolt.y} zoom={push * pulse} rotate={-4}>{puppet("standing", false, 1)}</Camera>
      </>
    );
  } else if (t < IMPACT) {
    // Knees give way first, then the body tips and drops out of frame while the room tilts.
    const fall = interpolate(t, [COLLAPSE, IMPACT], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
    shot = (
      <>
        {room(1.25 + fall * 0.25, 3 + fall * 12, fall * 14, "50% 70%")}
        <Camera fx={300} fy={560} sx={540 - fall * 150 + jolt.x} sy={760 + fall * 850} zoom={1.7 + fall * 0.5} rotate={-6 - fall * 52}>
          <div style={{ width: "100%", height: "100%", filter: `blur(${fall * 7}px)` }}>{puppet("standing", false, -1)}</div>
        </Camera>
      </>
    );
  } else if (t < FLOOR) {
    shot = <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  } else {
    const local = interpolate(frame, [FLOOR * fps, scene.durationInFrames], [0, 1], clamp);
    const zoom = (4.3 + local * 0.9) * (1 + beat * 0.035);
    const hit = Math.exp(-(frame - FLOOR * fps) / 5);
    const sx = 520 + Math.sin(frame * 2.3) * hit * 30;
    const sy = 930 + Math.cos(frame * 2.9) * hit * 36 + jolt.y * 0.4;
    // Screen position of a point given in puppet coordinates.
    const at = (px: number, py: number) => ({ x: sx + (px - 118) * zoom, y: sy + (py - 1089) * zoom });
    const eyeSpot = at(93, 1115);
    const tear = interpolate(frame, [FLOOR * fps + 20, FLOOR * fps + 75], [0, 1], clamp);
    // The phone lies on the floor in front of his face, clear of the body and the heart trace.
    const phone = { x: sx - 190, y: sy + 560 };
    shot = (
      <AbsoluteFill style={{ filter: `blur(${Math.max(0, Math.sin(frame / 9)) * danger * 5}px)` }}>
        <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: "absolute" }}>
          <rect width={1080} height={1920} fill="#241A1C" />
          <rect width={1080} height={660} fill="#171A2B" />
          {[660, 790, 960, 1180, 1460, 1780].map((y) => <path key={y} d={`M0 ${y} H1080`} stroke="#120C0E" strokeWidth={7} />)}
          <path d="M220 660 V790 M810 790 V960 M330 960 V1180 M900 1180 V1460 M180 1460 V1780" stroke="#120C0E" strokeWidth={7} />
          <ellipse cx={sx} cy={sy + 95 * zoom} rx={150 * zoom} ry={16 * zoom} fill="#000" opacity={0.35} />
        </svg>
        <Camera fx={118} fy={1089} sx={sx} sy={sy} zoom={zoom}>{puppet("lying_floor", isTalking, -0.4)}</Camera>
        <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: "absolute" }}>
          {/* The phone that will not stop lighting up, beside his face. */}
          <g transform={`translate(${phone.x} ${phone.y}) rotate(-14)`}>
            <ellipse rx={230} ry={120} fill="#8FC7FF" opacity={0.16 + 0.1 * Math.sin(frame / 3)} />
            <rect x={-150} y={-70} width={300} height={140} rx={26} fill="#15151B" stroke="#1E1B18" strokeWidth={8} />
            <rect x={-132} y={-54} width={264} height={108} rx={14} fill="#CDE6FF" />
            <rect x={-108} y={-28} width={170} height={18} rx={9} fill="#44627F" />
            <rect x={-108} y={8} width={126} height={18} rx={9} fill="#7C96B0" />
          </g>
          {tear > 0 && closed < 1 ? (
            <path d={`M${eyeSpot.x} ${eyeSpot.y + tear * 130 - 30} q20 30 0 40 q-20 -10 0 -40 Z`} fill="#CFF0FF" stroke="#4E8FB8" strokeWidth={4} />
          ) : null}
        </svg>
      </AbsoluteFill>
    );
  }

  // Heart monitor: only near the end, so it lands when the beats are failing.
  const traceFrom = Math.max(FLOOR * fps, stop - 3.2 * fps);
  const points: string[] = [];
  for (let x = 0; x <= 1080; x += 8) {
    const when = frame - (1080 - x) / 12;
    const since = Math.min(...beats.map((b) => (when >= b ? when - b : Infinity)));
    const spike = since < 1 ? -150 : since < 2 ? 90 : since < 3 ? -30 : 0;
    points.push(`${x},${1700 + spike * 0.8 * (1 - closed)}`);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: `saturate(${1 - danger * 0.5})` }}>{shot}</AbsoluteFill>
      {t < IMPACT || t >= FLOOR ? (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 47%, transparent ${62 - danger * 34}%, rgba(150,0,0,${0.15 + danger * 0.45 + beat * 0.35}) ${86 - danger * 20}%, rgba(15,0,0,${0.35 + danger * 0.6}) 100%)` }} />
      ) : null}
      <AbsoluteFill style={{ background: "#C4001A", opacity: beat * (0.06 + danger * 0.12) }} />
      {frame >= traceFrom ? (
        <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: "absolute", zIndex: 5 }}>
          <polyline points={points.join(" ")} fill="none" stroke="#FF2436" strokeWidth={9} strokeLinejoin="round" opacity={interpolate(frame, [traceFrom, traceFrom + 8], [0, 0.9], clamp)} style={{ filter: "drop-shadow(0 0 14px #FF2436)" }} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
