#!/usr/bin/env node
/**
 * Contact sheet of a rendered episode for visual QA: one frame every 1.5 seconds, tiled six across
 * (row r, column c, counted from 0, shows second (r * 6 + c) * 1.5).
 *
 *   node scripts/sheet.mjs [episode number]   ->   out/sheet_<n>.png
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const latest = () => Math.max(0, ...fs.readdirSync("out").map((f) => /^episode_(\d+)\.mp4$/.exec(f)?.[1]).filter(Boolean).map(Number));
const number = Number(process.argv[2] ?? latest());
const input = `out/episode_${number}.mp4`;
if (!number || !fs.existsSync(input)) {
  console.error(`[sheet] ERROR: ${input} not found. Run npm run produce first.`);
  process.exit(1);
}
const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]).toString());
const rows = Math.ceil(Math.ceil(seconds / 1.5) / 6);
const output = `out/sheet_${number}.png`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-vf",
  // No text overlay: drawtext needs fontconfig, which many ffmpeg builds lack. Tile k is at k * 1.5s.
  `fps=1/1.5,scale=270:-1,tile=6x${rows}:padding=6:color=white`,
  "-frames:v", "1", output]);
console.log(`[sheet] ${output}: ${seconds.toFixed(1)}s, one frame every 1.5s, six per row (tile k, counted from 0, is at k x 1.5s).`);
