import React from "react";
import { OUTLINE_COLOR } from "../types";

type SubtitleProps = {
  text: string;
  /** Frame relative to the start of the segment. */
  frame: number;
  /** Number of frames the voice is actually audible. */
  spokenFrames: number;
  italic?: boolean;
};

/** Splits text into balanced chunks of 3-4 words. */
export const chunkWords = (text: string): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const chunkCount = Math.max(1, Math.ceil(words.length / 4));
  const chunks: string[] = [];
  let cursor = 0;
  for (let i = 0; i < chunkCount; i++) {
    const remainingChunks = chunkCount - i;
    const size = Math.ceil((words.length - cursor) / remainingChunks);
    chunks.push(words.slice(cursor, cursor + size).join(" "));
    cursor += size;
  }
  return chunks;
};

export const Subtitle: React.FC<SubtitleProps> = ({
  text,
  frame,
  spokenFrames,
  italic,
}) => {
  const chunks = chunkWords(text);
  if (chunks.length === 0 || frame < 0 || frame >= spokenFrames) {
    return null;
  }
  const weights = chunks.map((chunk) => chunk.length + 4);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  let activeIndex = chunks.length - 1;
  for (let i = 0; i < chunks.length; i++) {
    acc += (weights[i] / totalWeight) * spokenFrames;
    if (frame < acc) {
      activeIndex = i;
      break;
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        bottom: 360,
        display: "flex",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <span
        style={{
          color: "#FFFFFF",
          fontFamily: "Arial Black, Impact, Helvetica, sans-serif",
          fontSize: 84,
          fontWeight: 900,
          lineHeight: 1.1,
          fontStyle: italic ? "italic" : "normal",
          textTransform: "uppercase",
          WebkitTextStroke: `14px ${OUTLINE_COLOR}`,
          paintOrder: "stroke fill",
          strokeLinejoin: "round",
        }}
      >
        {chunks[activeIndex]}
      </span>
    </div>
  );
};
