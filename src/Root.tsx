import React from "react";
import { Composition } from "remotion";
import { EpisodeComposition } from "./EpisodeComposition";
import { PreviewComposition, previewDefaults } from "./PreviewComposition";
import episodeData from "./data/episode.json";
import { FPS, HEIGHT, WIDTH } from "./components/types";
import type { Episode } from "./components/types";

const episode = episodeData as unknown as Episode;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Episode"
        component={EpisodeComposition}
        durationInFrames={Math.max(1, episode.totalFrames)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ episode }}
      />
      <Composition
        id="Preview"
        component={PreviewComposition}
        durationInFrames={300}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={previewDefaults}
      />
    </>
  );
};