import type { FC } from "react";
import type { CharacterProps } from "../types";

/**
 * Character registry. The `/character` command appends one import and one entry per character.
 * Keys must match `id` values in story-bible.json.
 */
export const characterRegistry: Record<string, FC<CharacterProps>> = {};
