import type { FC } from "react";
import type { BackgroundProps } from "../types";

/**
 * Environment registry. The `/environment` command appends one import and one entry per environment.
 * Keys must match `id` values in story-bible.json.
 */
export const backgroundRegistry: Record<string, FC<BackgroundProps>> = {};
