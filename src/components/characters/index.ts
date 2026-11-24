import type { CharacterComponent } from "../../types";

/**
 * Character registry.
 * The /character command adds one import + one entry per generated character, e.g.
 *
 *   import { Mara } from "./Mara";
 *   export const characterRegistry: Record<string, CharacterComponent> = { Mara };
 *
 * Keys MUST equal the character `id` stored in story-bible.json.
 */
export const characterRegistry: Record<string, CharacterComponent> = {};
