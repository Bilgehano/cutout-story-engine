#!/usr/bin/env node
/**
 * produce.mjs - Episode production pipeline.
 *
 *   locked session plan -> ElevenLabs TTS / ambience / SFX (cached by SHA-256)
 *                     -> ffmpeg + Rhubarb Lip Sync (ONLY for "dialogue" lines)
 *                     -> ffprobe durations -> src/data/episode.json
 *                     -> npx remotion render Episode out/episode_<n>.mp4
 *
 * Usage: node .github/skills/cutout-animator/scripts/produce.mjs [--no-render]
 */
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { session } from "./session.mjs";
import { speechRequest, captionCues } from "./performance.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
process.chdir(ROOT);
dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const API = "https://api.elevenlabs.io/v1";
const IS_WINDOWS = process.platform === "win32";

const stats = { ttsNew: 0, ttsCached: 0, sfxNew: 0, sfxCached: 0, ambNew: 0, ambCached: 0, chars: 0 };
const warnings = [];

const log = (message) => console.log(`[produce] ${message}`);
const warn = (message) => {
  warnings.push(message);
  console.warn(`[produce] WARNING: ${message}`);
};
const fail = (message) => {
  throw new Error(message);
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function elevenPost(endpoint, body, label) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: endpoint.endsWith("/with-timestamps") ? "application/json" : "audio/mpeg",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
    const detail = await response.text();
    lastError = Object.assign(
      new Error(`${label} failed (HTTP ${response.status}): ${detail}`),
      { status: response.status },
    );
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 4) {
      break;
    }
    const waitMs = 1500 * 2 ** (attempt - 1);
    log(`${label}: HTTP ${response.status}, retrying in ${waitMs}ms...`);
    await sleep(waitMs);
  }
  throw lastError;
}

async function cachedAudio(dir, hash, generate) {
  const file = path.join("public", dir, `${hash}.mp3`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    return { file, publicPath: `${dir}/${hash}.mp3`, cached: true };
  }
  fs.writeFileSync(file, await generate());
  return { file, publicPath: `${dir}/${hash}.mp3`, cached: false };
}

async function synthesizeSpeech(lines, index, voiceId, modelId, languageCode) {
  const line = lines[index];
  const request = speechRequest(lines, index, voiceId, modelId, languageCode);
  const hash = sha256({kind:"aligned-tts", ...request});
  const cueFile = path.join("public", "audio", `${hash}.json`);
  const result = await cachedAudio("audio", hash, async () => {
    const endpoint = `/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`;
    const { audio_base64, alignment } = JSON.parse((await elevenPost(endpoint, request.body, "Directed speech")).toString());
    if (!audio_base64) fail("ElevenLabs returned no speech audio.");
    fs.writeFileSync(cueFile, JSON.stringify(captionCues(alignment, line.text)));
    return Buffer.from(audio_base64, "base64");
  });
  if (result.cached) {
    stats.ttsCached++;
  } else {
    stats.ttsNew++;
    stats.chars += request.body.text.length;
  }
  if (!fs.existsSync(cueFile)) fail(`Missing speech alignment ${cueFile}; restore the cache pair before rendering.`);
  return { ...result, hash, captions: JSON.parse(fs.readFileSync(cueFile, "utf8")) };
}

async function generateAmbience(prompt) {
  const hash = sha256({ kind: "ambience", prompt, duration: 10, loop: true });
  const result = await cachedAudio("ambience", hash, () =>
    elevenPost(
      "/sound-generation",
      { text: prompt, duration_seconds: 10, loop: true, prompt_influence: 0.4 },
      "Ambience generation",
    ),
  );
  result.cached ? stats.ambCached++ : stats.ambNew++;
  return result;
}

async function generateSfx(prompt, durationSec) {
  const hash = sha256({ kind: "sfx", prompt, durationSec });
  const result = await cachedAudio("sfx", hash, () =>
    elevenPost(
      "/sound-generation",
      { text: prompt, duration_seconds: durationSec, prompt_influence: 0.5 },
      "Sound effect generation",
    ),
  );
  result.cached ? stats.sfxCached++ : stats.sfxNew++;
  return result;
}

function probeDuration(file) {
  const output = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" },
  ).trim();
  const seconds = Number.parseFloat(output);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    fail(`ffprobe could not read a valid duration from ${file}`);
  }
  return seconds;
}

function resolveRhubarb() {
  const candidates = IS_WINDOWS ? ["bin/rhubarb.exe", "bin/rhubarb"] : ["bin/rhubarb", "bin/rhubarb.exe"];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    fail("Rhubarb binary not found in bin/. Run /setup first.");
  }
  return path.resolve(found);
}

const CLOSED_MOUTH_CUES = () => [{ start: 0, end: 999, value: "X" }];

function runRhubarb(ttsFile, hash, rhubarbBinary) {
  const cacheFile = path.join("public", "lipsync", `${hash}.json`);
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8")).mouthCues;
  }
  const wavFile = path.join("public", "lipsync", `${hash}.wav`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", ttsFile, "-ar", "16000", "-ac", "1", wavFile]);
  execFileSync(rhubarbBinary, ["-f", "json", "-q", "-o", cacheFile, wavFile], { stdio: "inherit" });
  fs.rmSync(wavFile, { force: true });
  const { mouthCues } = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  if (!Array.isArray(mouthCues) || mouthCues.length === 0) {
    fail(`Rhubarb returned no mouth cues for ${ttsFile}`);
  }
  return mouthCues;
}

function resolveVoice(speakerId, bible) {
  if (speakerId === "narrator") {
    if (!bible.narratorVoiceId) {
      fail('story-bible.json has no "narratorVoiceId". Run /setup.');
    }
    return bible.narratorVoiceId;
  }
  const character = bible.characters.find((c) => c.id === speakerId);
  if (!character?.voiceId) {
    fail(`Character "${speakerId}" has no voiceId in story-bible.json.`);
  }
  return character.voiceId;
}

async function produceScene(scene, sceneIndex, draft, ctx) {
  const segments = [];

  for (const [index, line] of (scene.lines ?? []).entries()) {
    const voiceId = resolveVoice(line.speakerId, draft);
    const tts = await synthesizeSpeech(scene.lines, index, voiceId, ctx.modelId, draft.languageCode);
    const audioDurationSec = probeDuration(tts.file);
    const durationInFrames = Math.ceil(audioDurationSec * FPS);
    if (durationInFrames > Math.round(line.durationSec * FPS)) {
      fail(`${scene.id} line ${index + 1} needs ${durationInFrames} frames, exceeding its planned slot. Revise the timing or text in /create first.`);
    }
    // Rhubarb runs ONLY for dialogue; thought and narration keep every mouth closed.
    const mouthCues =
      line.lineType === "dialogue"
        ? runRhubarb(tts.file, tts.hash, ctx.rhubarb())
        : CLOSED_MOUTH_CUES();
    log(`scene ${sceneIndex + 1} line ${index + 1} [${line.lineType}] ${audioDurationSec.toFixed(2)}s ${tts.cached ? "(cached)" : "(new)"}`);
    segments.push({
      index,
      lineType: line.lineType,
      speakerId: line.speakerId,
      text: line.text,
      captions: line.lineType === "narration" || line.highlight ? tts.captions : [],
      audioFile: tts.publicPath,
      startFrame: Math.round(line.atSec * FPS),
      durationInFrames,
      audioDurationSec,
      mouthCues,
    });
  }

  let ambienceFile = null;
  if (scene.ambience) {
    ambienceFile = (await generateAmbience(scene.ambience)).publicPath;
  }

  const end = scene.durationSec * FPS;

  const sfx = [];
  for (const cue of scene.sfx ?? []) {
    const generated = await generateSfx(cue.prompt, cue.durationSec);
    const startFrame = Math.round(cue.atSec * FPS);
    const durationInFrames = Math.round(cue.durationSec * FPS);
    sfx.push({ file: generated.publicPath, startFrame, durationInFrames, volume:cue.volume });
  }

  const events = (scene.events ?? []).map((event) => {
    const frame = Math.round(event.atSec * FPS);
    const durationInFrames = Math.round(event.durationSec * FPS);
    return {
      type: event.type,
      frame,
      durationInFrames,
      ...(event.characterId ? { characterId: event.characterId } : {}),
      ...(event.value !== undefined ? { value: event.value } : {}),
    };
  });

  return {
    id: scene.id ?? `scene_${sceneIndex + 1}`,
    environmentId: scene.environmentId,
    transition: scene.transition,
    perspective: scene.perspective,
    timeOfDay: scene.timeOfDay ?? "day",
    ambienceFile,
    characters: scene.characters.map((c) => ({
      characterId: c.characterId,
      pose: c.pose ?? "standing",
      x: c.x ?? 0.5,
      ...(c.flip ? { flip: true } : {}),
      gestureIntensity: draft.characters.find((asset) => asset.id === c.characterId).gestureIntensity,
    })),
    durationInFrames: end,
    segments,
    sfx,
    events,
  };
}

async function main() {
  const skipRender = process.argv.includes("--no-render");

  const { dir, plan: draft, bible } = session("video");

  for (const dir of ["audio", "sfx", "ambience", "lipsync"]) {
    fs.mkdirSync(path.join("public", dir), { recursive: true });
  }
  fs.mkdirSync("out", { recursive: true });

  const modelId = draft.modelId;
  log(`Plan tier: ${bible.planTier} | TTS model: ${modelId} | language: ${draft.languageCode}`);

  let rhubarbPath = null;
  const ctx = {
    modelId,
    rhubarb: () => (rhubarbPath ??= resolveRhubarb()),
  };

  const scenes = [];
  let startFrame = 0;
  for (const [index, scene] of draft.scenes.entries()) {
    const produced = await produceScene(scene, index, draft, ctx);
    produced.startFrame = startFrame;
    startFrame += produced.durationInFrames;
    scenes.push(produced);
  }

  const episode = {
    episodeNumber: draft.episodeNumber,
    languageCode: draft.languageCode,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    totalDurationInFrames: startFrame,
    scenes,
  };
  fs.writeFileSync("src/data/episode.json", `${JSON.stringify(episode, null, 2)}\n`);
  const props = `${dir}/episode.json`;
  fs.copyFileSync("src/data/episode.json", props);
  log(
    `episode.json written: ${startFrame} frames (${(startFrame / FPS).toFixed(1)}s). ` +
      `TTS new/cached ${stats.ttsNew}/${stats.ttsCached}, SFX ${stats.sfxNew}/${stats.sfxCached}, ` +
      `ambience ${stats.ambNew}/${stats.ambCached}. New TTS characters billed: ${stats.chars}.`,
  );

  if (skipRender) {
    log("--no-render set: skipping Remotion render.");
    return;
  }
  const output = `out/episode_${draft.episodeNumber}.mp4`;
  log(`Rendering ${output} ...`);
  const render = spawnSync(
    "npx",
    ["remotion", "render", "src/index.ts", "Episode", output, `--props=${props}`],
    { stdio: "inherit", shell: true },
  );
  if (render.status !== 0) {
    fail(`Remotion render failed with exit code ${render.status}.`);
  }
  log(`Done: ${output}${warnings.length ? ` (${warnings.length} warning(s) above)` : ""}. Run /review next.`);
}

main().catch((error) => {
  console.error(`[produce] ERROR: ${error.message}`);
  process.exit(1);
});
