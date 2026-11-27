import type { CharacterComponent } from "../../types";
import { collect } from "../registry";

/**
 * Character registry, filled automatically: every `<Component>.tsx` in this folder that exports
 * `export const <Component>` is registered under that name. Never edit this file per character.
 * Keys MUST equal the character `component` stored in story-bible.json.
 */
export const characterRegistry: Record<string, CharacterComponent> = collect<CharacterComponent>(
  require.context("./", false, /^\.\/[A-Z][A-Za-z0-9_]*\.tsx$/),
);
