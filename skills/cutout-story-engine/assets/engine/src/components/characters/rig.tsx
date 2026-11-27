import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { OUTLINE_COLOR as O, type CharacterProps, type Mood, type MouthShape } from "../../types";

/** Shared puppet skeleton. Each character file supplies its own silhouette, face, hair and clothes. */
export type RigLook = {
  skin: string;
  skinShade: string;
  brow: string;
  iris: string;
  lip: string;
  headCx: number;
  headCy: number;
  /** Closed face outline in head coordinates (0,0 = head centre). */
  face: string;
  faceShade: string;
  eyeDx: number;
  eyeY: number;
  eyeRx: number;
  eyeRy: number;
  mouthY: number;
  smirk?: number;
  shoulderY: number;
  shoulderDx: number;
  armWidth: number;
  sleeve: string;
  hipDx: number;
  legWidth: number;
  pants: string;
  shoe: string;
  hairBack?: React.ReactNode;
  hairFront: React.ReactNode;
  faceExtras?: React.ReactNode;
  eyeExtras?: React.ReactNode;
  neck: React.ReactNode;
  torso: React.ReactNode;
  phase: number;
};

const line = { stroke: O, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const BROWS: Record<Mood, { lift: number; tilt: number; curve: number }> = {
  neutral: { lift: 0, tilt: 0, curve: 2 },
  happy: { lift: -5, tilt: 0, curve: 10 },
  sad: { lift: 1, tilt: 11, curve: -8 },
  angry: { lift: 8, tilt: -13, curve: -5 },
  surprised: { lift: -15, tilt: 1, curve: 0 },
  worried: { lift: -4, tilt: 13, curve: -5 },
};

const DARK = "#5A2226";

const Mouth: React.FC<{ shape: MouthShape; curve: number; smirk: number; lip: string }> = ({ shape, curve, smirk, lip }) => {
  const open = (rx: number, ry: number, cy: number) => <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill={DARK} {...line} />;
  switch (shape) {
    case "A":
      return <path d="M-20 0 Q0 3 20 0" fill="none" {...line} strokeWidth={4} />;
    case "B":
      return (<g><rect x={-21} y={-6} width={42} height={13} rx={6} fill={DARK} {...line} /><rect x={-16} y={-4} width={32} height={5} fill="#F4EEE4" /></g>);
    case "C":
      return open(22, 13, 3);
    case "D":
      return (<g>{open(23, 21, 6)}<ellipse cx={0} cy={18} rx={13} ry={6} fill="#C66B6B" /></g>);
    case "E":
      return open(15, 15, 4);
    case "F":
      return <ellipse cx={0} cy={3} rx={10} ry={11} fill={DARK} stroke={lip} strokeWidth={6} />;
    case "G":
      return (<g><path d="M-21 -4 H21 Q14 11 0 11 Q-14 11 -21 -4 Z" fill={DARK} {...line} /><rect x={-14} y={-3} width={28} height={6} fill="#F4EEE4" /></g>);
    case "H":
      return (<g>{open(20, 13, 4)}<ellipse cx={0} cy={9} rx={12} ry={5} fill="#C66B6B" /></g>);
    default:
      return <path d={`M-23 ${-curve * 0.5 + smirk * 0.3} Q0 ${curve} 23 ${-curve * 0.5 - smirk}`} fill="none" {...line} strokeWidth={4} />;
  }
};

/** Outlined limb segment drawn as two stacked round strokes. */
export const Limb: React.FC<{ d: string; width: number; color: string }> = ({ d, width, color }) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={O} strokeWidth={width + 6} />
    <path d={d} stroke={color} strokeWidth={width} />
  </g>
);

export const Puppet: React.FC<CharacterProps & { look: RigLook }> = ({
  look: L, pose, mouthShape, isTalking, eyeLook, mood, prevMood, moodBlend, gestureIntensity = "moderate", flip, conditions = [], eyesClosed = 0, standUp = 0, still = false, walking = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = pose === "lying_floor" ? standUp : 0;
  const lying = pose === "lying_floor" && rise < 1;
  const crying = conditions.includes("crying");
  const sitting = pose === "sitting_desk";
  const tired = conditions.includes("tired");
  const dying = conditions.includes("dying");
  const pain = conditions.includes("pain");
  const mute = conditions.includes("mute");
  const tremble = pain ? Math.sin(frame * 2.7) * 1.6 : 0;
  const stride = walking ? Math.sin(frame / 3.6) : 0;
  const breathe = lying ? 0 : -Math.abs(stride) * 14 + Math.sin(frame / 22 + L.phase) * 3 + (crying ? Math.sin(frame / 4) * 3 : 0);
  // Laboured breathing while lying down: the chest swells slowly.
  const swell = dying && rise === 0 ? 1 + Math.max(0, Math.sin(frame / 13)) * 0.045 * (1 - eyesClosed) : 1;
  const phase = (frame + L.phase * 31) % 105;
  const blink = interpolate(phase, [0, 3, 6], [1, 0.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mix = (key: "lift" | "tilt" | "curve") => interpolate(moodBlend, [0, 1], [BROWS[prevMood][key], BROWS[mood][key]]);
  const brow = { lift: mix("lift"), tilt: mix("tilt"), curve: mix("curve") };
  const lookX = Math.max(-1, Math.min(1, eyeLook.x)) * (flip ? -1 : 1) * 8;
  const lookY = Math.max(-1, Math.min(1, eyeLook.y)) * 6;
  const amp = { calm: 6, moderate: 14, expressive: 26 }[gestureIntensity];
  const talk = isTalking && !lying && !still ? spring({ frame: frame % 600, fps, config: { damping: 200 } }) : 0;
  const swing = (p: number) => talk * amp * (0.55 + Math.sin(frame / 7 + p) * 0.45);

  const arm = (side: -1 | 1) => {
    const sx = 300 + side * L.shoulderDx;
    const sy = L.shoulderY;
    const ex = sx + side * (sitting ? 18 : 28);
    const ey = sy + 190;
    const hx = sitting ? ex - side * 60 : ex + side * 4;
    const hy = sitting ? ey + 110 : ey + 175;
    const rotate = -side * swing(side === 1 ? 0 : 2.1) * (side === 1 ? 1.6 : 0.8);
    // A dying character clutches the chest.
    if (side === 1 && dying && rise < 0.6) {
      return (
        <g>
          <Limb d={`M${sx} ${sy} L${sx + 40} ${sy + 150}`} width={L.armWidth} color={L.sleeve} />
          <Limb d={`M${sx + 40} ${sy + 150} L330 ${sy + 100}`} width={L.armWidth - 8} color={L.sleeve} />
          {pain ? (
            <g transform={`translate(${tremble} 0)`}>
              <path d={`M232 ${sy + 52} L276 ${sy + 74} M236 ${sy + 128} L278 ${sy + 108} M300 ${sy + 38} L305 ${sy + 62} M262 ${sy + 92} L280 ${sy + 92}`} fill="none" {...line} strokeWidth={4} />
              <ellipse cx={328} cy={sy + 94} rx={34} ry={36} fill={L.skin} {...line} />
              {[0, 1, 2, 3].map((n) => <path key={n} d={`M324 ${sy + 66 + n * 18} Q298 ${sy + 62 + n * 18} 282 ${sy + 74 + n * 19}`} fill="none" stroke={O} strokeWidth={21} strokeLinecap="round" />)}
              {[0, 1, 2, 3].map((n) => <path key={n} d={`M324 ${sy + 66 + n * 18} Q298 ${sy + 62 + n * 18} 282 ${sy + 74 + n * 19}`} fill="none" stroke={L.skin} strokeWidth={15} strokeLinecap="round" />)}
            </g>
          ) : <ellipse cx={315} cy={sy + 92} rx={L.armWidth * 0.42} ry={L.armWidth * 0.36} fill={L.skin} {...line} />}
        </g>
      );
    }
    return (
      <g>
        <g transform={`rotate(${rotate} ${ex} ${ey})`}>
          <Limb d={`M${ex} ${ey} L${hx} ${hy}`} width={L.armWidth - 8} color={L.sleeve} />
          <ellipse cx={hx} cy={hy + 22} rx={L.armWidth * 0.34} ry={L.armWidth * 0.42} fill={L.skin} {...line} />
        </g>
        <Limb d={`M${sx} ${sy} L${ex} ${ey}`} width={L.armWidth} color={L.sleeve} />
      </g>
    );
  };

  const eye = (side: -1 | 1) => {
    const x = side * L.eyeDx;
    const shut = eyesClosed > 0.92;
    const iris = pain ? 6 : 9;
    const ry = L.eyeRy * (pain ? 1.28 : 1) * Math.max(0.08, blink * (1 - eyesClosed) * (crying ? 0.75 : 1));
    const clip = `eye-${L.phase}-${side}-${pose}`.replace(/\./g, "_");
    return (
      <g>
        {tired ? <path d={`M${x - L.eyeRx - 4} ${L.eyeY + 7} Q${x} ${L.eyeY + 32} ${x + L.eyeRx + 4} ${L.eyeY + 7}`} fill="#7A4A68" opacity={0.72} /> : null}
        {shut ? (
          <path d={`M${x - L.eyeRx} ${L.eyeY} Q${x} ${L.eyeY + 9} ${x + L.eyeRx} ${L.eyeY}`} fill="none" {...line} strokeWidth={4} />
        ) : (
          <g>
            <clipPath id={clip}><ellipse cx={x} cy={L.eyeY} rx={L.eyeRx} ry={ry} /></clipPath>
            <ellipse cx={x} cy={L.eyeY} rx={L.eyeRx} ry={ry} fill="#FBF7EF" />
            <g clipPath={`url(#${clip})`}>
              <circle cx={x + lookX + tremble} cy={L.eyeY + lookY} r={iris} fill={L.iris} />
              <circle cx={x + lookX + tremble} cy={L.eyeY + lookY} r={iris / 2} fill={O} />
              <circle cx={x + lookX + tremble + 3} cy={L.eyeY + lookY - 3} r={2} fill="#fff" />
            </g>
            <ellipse cx={x} cy={L.eyeY} rx={L.eyeRx} ry={ry} fill="none" {...line} />
          </g>
        )}
        <path
          d={`M${x - side * 24} ${L.eyeY - 31 + brow.lift - brow.tilt} Q${x} ${L.eyeY - 38 + brow.lift - brow.tilt / 2} ${x + side * 24} ${L.eyeY - 29 + brow.lift + brow.tilt * 0.35}`}
          fill="none" stroke={L.brow} strokeWidth={9} strokeLinecap="round"
        />
        {crying ? (
          <g fill="#9FD8F5" stroke="#4E8FB8" strokeWidth={2}>
            <path d={`M${x - L.eyeRx + 3} ${L.eyeY + ry} Q${x} ${L.eyeY + ry + 9} ${x + L.eyeRx - 3} ${L.eyeY + ry} Q${x} ${L.eyeY + ry + 3} ${x - L.eyeRx + 3} ${L.eyeY + ry} Z`} />
            {[0, 22].map((delay) => {
              const t = ((frame + delay + (side === 1 ? 11 : 0)) % 44) / 44;
              const ty = L.eyeY + 20 + t * 78;
              return <path key={delay} d={`M${x + side * 12} ${ty - 14} q11 16 0 21 q-11 -5 0 -21 Z`} opacity={1 - t * t} />;
            })}
          </g>
        ) : null}
      </g>
    );
  };

  const hip = 760;
  const leg = (side: -1 | 1) => {
    const x = 300 + side * L.hipDx;
    const foot = 300 + side * (L.hipDx + 12);
    return (
      <g transform={`translate(0 ${-Math.max(0, stride * side) * 34}) rotate(${stride * side * 7} ${x} ${hip})`}>
        <Limb d={`M${x} ${hip} L${foot} 1130`} width={L.legWidth} color={L.pants} />
        <path d={`M${foot - 38} 1135 Q${foot - 40} 1180 ${foot + side * 22 - 22} 1180 L${foot + side * 22 + 30} 1180 Q${foot + 44} 1150 ${foot + 34} 1130 Z`} fill={L.shoe} {...line} />
      </g>
    );
  };

  // Lying: the standing puppet turned on its side, head left, resting on the floor line.
  const s = 0.56;
  const k = s + (1 - s) * rise;
  const poseTransform = lying
    ? `translate(${597 - 297 * rise} ${1089 + 91 * rise}) rotate(${-90 * (1 - rise)}) scale(${k}) translate(-300 -1180)`
    : sitting ? "translate(0 210)" : undefined;

  return (
    <svg viewBox="0 0 600 1200" width="100%" height="100%" style={{ overflow: "visible", transform: flip ? "scaleX(-1)" : undefined }}>
      {lying ? <ellipse cx={300} cy={1185} rx={295} ry={22} fill="#000" opacity={0.3} /> : null}
      {!sitting && !lying ? <ellipse cx={300} cy={1182} rx={170} ry={22} fill="#000" opacity={0.2} /> : null}
      <g transform={poseTransform}>
        {!sitting ? <g>{leg(-1)}{leg(1)}</g> : null}
        <g transform={`translate(0 ${breathe}) translate(300 760) scale(${swell} 1) translate(-300 -760)`}>
          <g transform={`translate(${L.headCx} ${L.headCy})`}>{L.hairBack}</g>
          {L.neck}
          {L.torso}
          {arm(-1)}
          <g transform={`translate(${L.headCx} ${L.headCy}) rotate(${talk * Math.sin(frame / 13 + L.phase) * 2.5})`}>
            <ellipse cx={-Math.abs(L.eyeDx) * 2.15} cy={14} rx={17} ry={25} fill={L.skin} {...line} />
            <ellipse cx={Math.abs(L.eyeDx) * 2.15} cy={14} rx={17} ry={25} fill={L.skin} {...line} />
            <path d={L.face} fill={L.skin} {...line} />
            <path d={L.faceShade} fill={L.skinShade} opacity={0.7} />
            {L.faceExtras}
            {eye(-1)}
            {eye(1)}
            {L.eyeExtras}
            <path d={`M2 ${L.eyeY + 14} Q18 ${L.mouthY - 28} -4 ${L.mouthY - 27}`} fill="none" {...line} />
            <g transform={`translate(0 ${L.mouthY})`}>
              {pain && !mute && !isTalking && eyesClosed < 0.5
                ? <g transform={`scale(${1.15 + Math.max(0, Math.sin(frame / 4)) * 0.18})`}><Mouth shape="D" curve={0} smirk={0} lip={L.lip} /></g>
                : <Mouth shape={isTalking ? mouthShape : "X"} curve={brow.curve} smirk={L.smirk ?? 0} lip={L.lip} />}
            </g>
            {L.hairFront}
            {pain ? [[-92, -34, 0], [96, -20, 13], [-70, 34, 25], [78, 48, 7]].map(([dx, dy, delay]) => {
              const t = ((frame + delay) % 40) / 40;
              return <path key={dx} d={`M${dx} ${dy + t * 26 - 12} q10 15 0 20 q-10 -5 0 -20 Z`} fill="#BFE8FA" stroke="#4E8FB8" strokeWidth={2} />;
            }) : null}
          </g>
          {arm(1)}
        </g>
      </g>
    </svg>
  );
};

export const stroke = line;
