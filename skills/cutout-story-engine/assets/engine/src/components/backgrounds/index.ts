import type { BackgroundComponent } from "../../types";
import { collect } from "../registry";

/**
 * Environment registry, filled automatically: every `<Component>.tsx` in this folder that exports
 * `export const <Component>` is registered under that name. Never edit this file per environment.
 * Keys MUST equal the environment `component` stored in story-bible.json.
 */
export const backgroundRegistry: Record<string, BackgroundComponent> = collect<BackgroundComponent>(
  require.context("./", false, /^\.\/[A-Z][A-Za-z0-9_]*\.tsx$/),
);
