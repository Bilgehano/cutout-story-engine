import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { EpisodeScene } from "../types";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Frame at which the heart stops: the scene's eyes-closing event in a dying scene. */
const stopFrame = (scene: EpisodeScene) =>
  scene.effect === "dying" ? scene.events.find((e) => e.type === "eyes")?.frame ?? scene.durationInFrames : Infinity;

/** Double thump: 1 at the beat, falling to 0. The attack races; the dying heart drags. */
const beatAt = (scene: EpisodeScene, frame: number) => {
  if (frame >= stopFrame(scene)) return 0;
  const period = scene.effect === "heartAttack" ? 17 : 27;
  const t = frame % period;
  const thump = (d: number) => (t >= d ? Math.exp(-(t - d) / 3) : 0);
  return Math.min(1, thump(0) + 0.7 * thump(6));
};

/** Impact frame of a fall, if the scene has one. */
const impactFrame = (scene: EpisodeScene) => {
  const fall = scene.events.find((e) => e.type === "fall");
  return fall ? fall.frame + fall.durationInFrames : null;
};

/** Blur, zoom pulse and camera shake applied to the picture itself. */
export const useHeartStyle = (scene: EpisodeScene): React.CSSProperties => {
  const frame = useCurrentFrame();
  if (!scene.effect) return {};
  const beat = beatAt(scene, frame);
  const progress = frame / scene.durationInFrames;
  const impact = impactFrame(scene);
  const hit = impact !== null && frame >= impact ? Math.exp(-(frame - impact) / 5) : 0;
  // Waves of lost focus that grow as he passes out.
  const blur = scene.effect === "dying" ? Math.max(0, Math.sin(frame / 8)) * (1 + progress * 4) + beat * 1.5 : Math.max(0, Math.sin(frame / 8)) * (2 + progress * 9) + beat * 3 + hit * 14;
  return {
    filter: `blur(${blur}px) saturate(${1 - progress * 0.45})`,
    transform: `translate(${Math.sin(frame * 2.3) * (hit * 34 + beat * 5)}px, ${Math.cos(frame * 2.9) * hit * 40}px) scale(${1.04 + beat * 0.035 + progress * 0.05}) rotate(${Math.sin(frame / 14) * progress * 1.6}deg)`,
  };
};

export const HeartOverlay: React.FC<{ scene: EpisodeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  if (!scene.effect) return null;
  const beat = beatAt(scene, frame);
  const progress = frame / scene.durationInFrames;
  const stop = stopFrame(scene);
  const period = scene.effect === "heartAttack" ? 17 : 27;
  // ECG trace scrolling left; it goes flat once the heart stops.
  const points: string[] = [];
  for (let x = 0; x <= 1080; x += 8) {
    const at = frame - (1080 - x) / 12;
    const t = ((at % period) + period) % period;
    const spike = at >= stop ? 0 : t < 1 ? -150 : t < 2 ? 90 : t < 3 ? -30 : 0;
    points.push(`${x},${1700 + spike * 0.8}`);
  }
  const red = 0.4 + beat * 0.5;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 64%, transparent ${46 - progress * 26}%, rgba(150,0,0,${red}) ${74 - progress * 20}%, rgba(20,0,0,0.96) 100%)` }} />
      <AbsoluteFill style={{ background: "#C4001A", opacity: beat * 0.16 }} />
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: "absolute" }}>
        <polyline points={points.join(" ")} fill="none" stroke="#FF2436" strokeWidth={9} strokeLinejoin="round" opacity={interpolate(frame, [0, 8], [0, 0.9], clamp)} style={{ filter: "drop-shadow(0 0 14px #FF2436)" }} />
      </svg>
    </AbsoluteFill>
  );
};
