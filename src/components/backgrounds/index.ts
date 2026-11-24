import type { BackgroundComponent } from "../../types";

/**
 * Environment registry.
 * The /environment command adds one import + one entry per generated environment, e.g.
 *
 *   import { Bedroom } from "./Bedroom";
 *   export const backgroundRegistry: Record<string, BackgroundComponent> = { Bedroom };
 *
 * Keys MUST equal the environment `id` stored in story-bible.json.
 */
export const backgroundRegistry: Record<string, BackgroundComponent> = {};
