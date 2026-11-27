import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { EpisodeEvent, EpisodeScene } from "../types";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const font = "Arial, sans-serif";

/** Camera move across the picture. Each "camera" event glides from the previous framing to its target {x, y, zoom}. */
export const cameraStyle = (events: EpisodeEvent[], frame: number): React.CSSProperties => {
  const moves = events.filter((e) => e.type === "camera").sort((a, b) => a.frame - b.frame);
  if (!moves.length) return {};
  let cam = { x: 540, y: 960, zoom: 1 };
  for (const move of moves) {
    if (frame < move.frame) break;
    const to = move.value as typeof cam;
    const p = interpolate(frame, [move.frame, move.frame + move.durationInFrames], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    cam = { x: cam.x + (to.x - cam.x) * p, y: cam.y + (to.y - cam.y) * p, zoom: cam.zoom + (to.zoom - cam.zoom) * p };
  }
  return { transformOrigin: "0 0", transform: `translate(${540 - cam.x * cam.zoom}px, ${960 - cam.y * cam.zoom}px) scale(${cam.zoom})` };
};

/** Things that belong to the room and move with the camera: knocking at the door, notifications over the phone. */
export const RoomEffects: React.FC<{ events: EpisodeEvent[] }> = ({ events }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = (e: EpisodeEvent) => frame >= e.frame && frame < e.frame + e.durationInFrames;
  const knock = events.find((e) => e.type === "knock" && active(e));
  const notify = events.find((e) => e.type === "notify" && active(e));
  if (!knock && !notify) return null;
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%">
        {knock ? [0, 9, 18].map((delay, i) => {
          const age = frame - knock.frame - delay;
          if (age < 0) return null;
          const grow = spring({ frame: age, fps, config: { damping: 12, stiffness: 220 } });
          return (
            <g key={delay} transform={`translate(${150 + i * 62} ${860 + i * 58}) scale(${grow}) rotate(${-10 + i * 9})`} opacity={interpolate(age, [14, 26], [1, 0], clamp)}>
              <text textAnchor="middle" fontFamily={font} fontSize={50} fontWeight={900} fill="#FFF4D6" stroke="#1E1B18" strokeWidth={9} paintOrder="stroke">KLOPF</text>
            </g>
          );
        }) : null}
        {notify ? [0, 8, 15, 21, 27, 33].map((delay, i) => {
          const age = frame - notify.frame - delay;
          if (age < 0) return null;
          const pop = spring({ frame: age, fps, config: { damping: 14, stiffness: 190 } });
          const y = 1188 - i * 30 - age * 0.35;
          return (
            <g key={delay} transform={`translate(${874 + (i % 2) * 16} ${y}) scale(${pop})`} opacity={interpolate(age, [34, 46], [1, 0], clamp)}>
              <rect x={-66} y={-13} width={132} height={27} rx={9} fill="#fff" stroke="#1E1B18" strokeWidth={2} />
              <circle cx={-52} cy={1} r={6} fill="#D7263D" />
              <text x={-40} y={6} fontFamily={font} fontSize={17} fontWeight={700} fill="#1E1B18">{["😂😂😂", "HAHAHA", "Sticker 😭", "wie peinlich", "🤣🤣", "LOL"][i]}</text>
            </g>
          );
        }) : null}
      </svg>
    </AbsoluteFill>
  );
};

/** Small phone-style time stamp that drops in at the top of a scene. */
export const TimeLabel: React.FC<{ text?: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!text) return null;
  const drop = spring({ frame: frame - 5, fps, config: { damping: 13, stiffness: 170 } });
  const typed = text.slice(0, Math.max(0, Math.floor((frame - 8) * 1.1)));
  const hand = frame * -14;
  return (
    <div style={{ position: "absolute", top: 68, left: 40, display: "flex", transform: `translateY(${(drop - 1) * 190}px)`, opacity: Math.min(1, drop) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 30px 14px 20px", borderRadius: 50, background: "rgba(18,18,22,0.9)", border: "2px solid rgba(255,255,255,0.28)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
        <svg width={44} height={44} viewBox="-22 -22 44 44">
          <circle r={19} fill="none" stroke="#fff" strokeWidth={4} />
          <path d="M0 0 V-12" stroke="#fff" strokeWidth={4} strokeLinecap="round" transform={`rotate(${hand})`} />
          <path d="M0 0 H8" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        </svg>
        {/* The hidden full text keeps the pill from resizing while it types. */}
        <div style={{ display: "grid", font: `700 40px/1.2 ${font}`, color: "#fff", whiteSpace: "pre" }}>
          <span style={{ gridArea: "1 / 1", visibility: "hidden" }}>{text}</span>
          <span style={{ gridArea: "1 / 1" }}>{typed}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Big hook text in the upper middle, below the top UI zone, so the opening reads with the sound off.
 * Words wrapped in *stars* turn red and never split across lines; `|` forces a line break, and lines that
 * would not fit shrink the text. Each word pops in, and the block fades out at the end of the event.
 */
export const TitleCard: React.FC<{ scene: EpisodeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = scene.events.find((e) => e.type === "title" && frame >= e.frame && frame < e.frame + e.durationInFrames);
  if (!card) return null;
  const age = frame - card.frame;
  const fade = interpolate(card.frame + card.durationInFrames - frame, [0, 5], [0, 1], clamp);
  const lines = String(card.value).split("|").map((line) =>
    line.split("*").flatMap((part, i) => (i % 2 === 1 ? [{ text: part.trim(), red: true }] : part.split(" ").filter(Boolean).map((text) => ({ text, red: false })))).filter((w) => w.text));
  const longest = Math.max(...lines.map((words) => words.map((w) => w.text).join(" ").length));
  const size = lines.length > 1 ? Math.min(96, Math.floor(1000 / (longest * 0.62))) : 96;
  const outline = "-4px -4px 0 #1E1B18, 4px -4px 0 #1E1B18, -4px 4px 0 #1E1B18, 4px 4px 0 #1E1B18, 0 6px 0 #1E1B18, 0 10px 30px rgba(0,0,0,0.85)";
  let index = 0;
  return (
    <div style={{ position: "absolute", top: 270, left: 40, right: 40, display: "flex", justifyContent: "center", opacity: fade }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 34px 22px", borderRadius: 30, border: "4px solid #FF2436", background: "rgba(16,10,12,0.82)", boxShadow: "0 0 40px rgba(255,36,54,0.35), 0 14px 40px rgba(0,0,0,0.55)", transform: `scale(${spring({ frame: age, fps, config: { damping: 14, stiffness: 180 } })})` }}>
      {lines.map((words, row) => (
        <div key={row} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 22px" }}>
          {words.map((word) => {
            const pop = spring({ frame: age - index++ * 2, fps, config: { damping: 12, stiffness: 210 } });
            return (
              <span key={index} style={{ display: "inline-block", whiteSpace: "nowrap", font: `900 ${size}px/1.12 ${font}`, color: word.red ? "#FF3B4C" : "#fff", textShadow: outline, transform: `translateY(${(1 - pop) * 40}px) scale(${0.85 + 0.15 * pop})`, opacity: Math.min(1, Math.max(0, pop)) }}>{word.text}</span>
            );
          })}
        </div>
      ))}
      </div>
    </div>
  );
};

/** Closing call to action over a darkened picture. */
export const EndCard: React.FC<{ scene: EpisodeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = scene.events.find((e) => e.type === "endCard");
  if (!card || frame < card.frame) return null;
  const age = frame - card.frame;
  const words = String(card.value).split(" ");
  const shine = interpolate(age, [18, 40], [-300, 1300], clamp);
  return (
    <AbsoluteFill style={{ background: `rgba(8,4,6,${interpolate(age, [0, 10], [0, 0.72], clamp)})`, justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "relative", overflow: "hidden", maxWidth: 860, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 24px", padding: "46px 54px", borderRadius: 34, border: "5px solid #FF2436", background: "rgba(16,10,12,0.94)", boxShadow: "0 0 60px rgba(255,36,54,0.55)", transform: `scale(${spring({ frame: age, fps, config: { damping: 13, stiffness: 150 } })})` }}>
        {words.map((word, i) => {
          const pop = spring({ frame: age - 6 - i * 3, fps, config: { damping: 11, stiffness: 200 } });
          return (
            <span key={i} style={{ display: "inline-block", font: `900 82px/1.25 ${font}`, color: i >= words.length - 2 ? "#FF3B4C" : "#fff", transform: `translateY(${(1 - pop) * 50}px)`, opacity: Math.min(1, Math.max(0, pop)) }}>{word}</span>
          );
        })}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: shine, width: 120, background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.35), transparent)" }} />
      </div>
    </AbsoluteFill>
  );
};
