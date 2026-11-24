import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

const MAX_WORDS_PER_CHUNK = 4;

/** Splits text into balanced chunks of 3-4 words (fewer only for very short lines). */
export const chunkWords = (text: string): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunkCount = Math.ceil(words.length / MAX_WORDS_PER_CHUNK);
  const base = Math.floor(words.length / chunkCount);
  const extra = words.length % chunkCount;
  const chunks: string[] = [];
  let cursor = 0;
  for (let i = 0; i < chunkCount; i++) {
    const size = base + (i < extra ? 1 : 0);
    chunks.push(words.slice(cursor, cursor + size).join(" "));
    cursor += size;
  }
  return chunks;
};

type SubtitleProps = {
  text: string;
  /** Frames during which the line is actually spoken (subtitle timing spans this range). */
  speechFrames: number;
};

/**
 * Safe-zone subtitle. Place inside a <Sequence> that starts when the line starts.
 * Sits at bottom: 360px to stay clear of TikTok / Reels / Shorts UI.
 */
export const Subtitle: React.FC<SubtitleProps> = ({ text, speechFrames }) => {
  const frame = useCurrentFrame();
  const chunks = chunkWords(text);
  if (chunks.length === 0) return null;

  const weights = chunks.map((c) => c.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const boundaries: number[] = [];
  let acc = 0;
  for (const w of weights) {
    acc += w;
    boundaries.push((acc / total) * Math.max(speechFrames, 1));
  }
  let index = boundaries.findIndex((b) => frame < b);
  if (index === -1) index = chunks.length - 1;

  const chunkStart = index === 0 ? 0 : boundaries[index - 1];
  const pop = interpolate(frame - chunkStart, [0, 4], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        bottom: 360,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `scale(${pop})`,
          textAlign: "center",
          fontFamily: "'Arial Black', Impact, 'Segoe UI', sans-serif",
          fontWeight: 900,
          fontSize: 88,
          lineHeight: 1.12,
          textTransform: "uppercase",
          color: "#FFFFFF",
          WebkitTextStroke: "16px #1E1B18",
          paintOrder: "stroke fill",
          strokeLinejoin: "round",
          letterSpacing: 1,
        }}
      >
        {chunks[index]}
      </div>
    </div>
  );
};
