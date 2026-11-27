import React from "react";
import { Composition } from "remotion";
import { EpisodeComposition } from "./EpisodeComposition";
import {
  CharacterCheck,
  CharacterSheet,
  EnvironmentCheck,
  type CharacterCheckProps,
  type EnvironmentCheckProps,
} from "./CheckCompositions";
import {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  emptyEpisode,
  type EpisodeData,
} from "./types";

const characterCheckDefaults: CharacterCheckProps = { characterId: "" };
const environmentCheckDefaults: EnvironmentCheckProps = { environmentId: "" };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={EpisodeComposition}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      fps={VIDEO_FPS}
      durationInFrames={emptyEpisode.totalDurationInFrames}
      defaultProps={emptyEpisode as EpisodeData}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, props.totalDurationInFrames),
      })}
    />
    <Composition
      id="CharacterCheck"
      component={CharacterCheck}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      fps={VIDEO_FPS}
      durationInFrames={1}
      defaultProps={characterCheckDefaults}
    />
    <Composition
      id="CharacterSheet"
      component={CharacterSheet}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      fps={VIDEO_FPS}
      durationInFrames={1}
      defaultProps={characterCheckDefaults}
    />
    <Composition
      id="EnvironmentCheck"
      component={EnvironmentCheck}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      fps={VIDEO_FPS}
      durationInFrames={1}
      defaultProps={environmentCheckDefaults}
    />
  </>
);
