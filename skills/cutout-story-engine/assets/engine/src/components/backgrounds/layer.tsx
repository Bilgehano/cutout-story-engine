import React from "react";
import { AbsoluteFill } from "remotion";
import { OUTLINE_COLOR } from "../../types";

export const s = { stroke: OUTLINE_COLOR, strokeWidth: 3, strokeLinejoin: "round" as const };

export const Layer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <svg viewBox="0 0 1080 1920" width="100%" height="100%">{children}</svg>
  </AbsoluteFill>
);
