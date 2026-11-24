#!/usr/bin/env node
/**
 * produce.mjs - Episode production pipeline.
 *
 *   draft_script.json -> ElevenLabs TTS / ambience / SFX (cached by SHA-256)
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
const SEGMENT_PAD_SEC = 0.25;
const DEFAULT_LEAD_IN_SEC = 0.4;
const DEFAULT_SFX_SEC = 2;
const API = "https://api.elevenlabs.io/v1";
const IS_WINDOWS = process.platform === "win32";

const LINE_TYPES = new Set(["dialogue", "thought", "narration"]);
const POSES = new Set(["standing", "sitting_desk"]);
const TIMES_OF_DAY = new Set(["day", "sunset", "night"]);
const EVENT_DEFAULT_FRAMES = {
  phoneVibrate: 45,
  doorState: 1,
  lightFlicker: 60,
  characterEnter: 24,
  eyeLook: 1,
  mood: 1,
  jump: 12,
};
const CHARACTER_EVENTS = new Set(["characterEnter", "eyeLook", "mood", "jump"]);

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

const readJson = (file, hint) => {
  if (!fs.existsSync(file)) {
    fail(`Missing ${file}. ${hint}`);
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return fail(`Invalid JSON in ${file}: ${error.message}`);
  }
};

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
        Accept: "audio/mpeg",
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

async function synthesizeSpeech({ text, voiceId, modelId, languageCode }) {
  const hash = sha256({ kind: "tts", modelId, voiceId, languageCode, text });
  const result = await cachedAudio("audio", hash, async () => {
    const endpoint = `/text-to-speech/${voiceId}`;
    try {
      return await elevenPost(
        endpoint,
        { text, model_id: modelId, language_code: languageCode },
        "Text-to-speech",
      );
    } catch (error) {
      // Some models reject language enforcement; retry once without it.
      if ([400, 422].includes(error.status) && /language/i.test(error.message)) {
        warn(`Model ${modelId} rejected language_code; retrying without it.`);
        return elevenPost(endpoint, { text, model_id: modelId }, "Text-to-speech");
      }
      throw error;
    }
  });
  if (result.cached) {
    stats.ttsCached++;
  } else {
    stats.ttsNew++;
    stats.chars += text.length;
  }
  return { ...result, hash };
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

const ACTION_NARRATION_HINTS =
  /\b(phone|door|footsteps?|knock|buzz(?:es|ing)?|vibrat\w*|rings?|ringing)\b.*\b(opens?|closes?|vibrat\w*|buzz\w*|rings?|ringing|knocks?|slams?|creaks?)\b|\b(opens?|closes?|slams?)\s+the\s+door\b/i;

function validateDraft(draft, bible) {
  if (!Number.isInteger(draft.episodeNumber) || draft.episodeNumber < 1) {
    fail('draft_script.json: "episodeNumber" must be a positive integer.');
  }
  if (typeof draft.languageCode !== "string" || !draft.languageCode) {
    fail('draft_script.json: "languageCode" is required.');
  }
  if (!Array.isArray(draft.scenes) || draft.scenes.length === 0) {
    fail('draft_script.json: "scenes" must be a non-empty array.');
  }
  const characterIds = new Set((bible.characters ?? []).map((c) => c.id));
  const environmentIds = new Set((bible.environments ?? []).map((e) => e.id));

  draft.scenes.forEach((scene, si) => {
    const where = `scenes[${si}]`;
    if (!environmentIds.has(scene.environmentId)) {
      fail(`${where}: environmentId "${scene.environmentId}" is not in story-bible.json. Run /environment.`);
    }
    if (scene.timeOfDay !== undefined && !TIMES_OF_DAY.has(scene.timeOfDay)) {
      fail(`${where}: timeOfDay must be day, sunset or night.`);
    }
    if (!Array.isArray(scene.characters) || scene.characters.length === 0) {
      fail(`${where}: "characters" must list at least one on-screen character.`);
    }
    scene.characters.forEach((c) => {
      if (!characterIds.has(c.characterId)) {
        fail(`${where}: character "${c.characterId}" is not in story-bible.json. Run /character.`);
      }
      if (!POSES.has(c.pose ?? "standing")) {
        fail(`${where}: pose of "${c.characterId}" must be standing or sitting_desk.`);
      }
    });
    const onScreen = new Set(scene.characters.map((c) => c.characterId));
    const lines = scene.lines ?? [];
    lines.forEach((line, li) => {
      const lw = `${where}.lines[${li}]`;
      if (!LINE_TYPES.has(line.lineType)) {
        fail(`${lw}: lineType must be dialogue, thought or narration.`);
      }
      if (typeof line.text !== "string" || !line.text.trim()) {
        fail(`${lw}: "text" is required.`);
      }
      if (line.lineType === "narration") {
        if (line.speakerId !== "narrator") {
          fail(`${lw}: narration must use speakerId "narrator".`);
        }
      } else {
        if (!characterIds.has(line.speakerId)) {
          fail(`${lw}: speakerId "${line.speakerId}" is not a registered character.`);
        }
        if (!onScreen.has(line.speakerId)) {
          warn(`${lw}: "${line.speakerId}" is not in scene.characters (off-screen voice).`);
        }
      }
      if (ACTION_NARRATION_HINTS.test(line.text)) {
        warn(`${lw}: text may describe a physical action. Use sfx/events instead (Show, Don't Tell).`);
      }
    });
    (scene.sfx ?? []).forEach((cue, i) => {
      if (typeof cue.prompt !== "string" || typeof cue.atSec !== "number" || cue.atSec < 0) {
        fail(`${where}.sfx[${i}]: "prompt" (string) and "atSec" (number >= 0) are required.`);
      }
    });
    (scene.events ?? []).forEach((event, i) => {
      const ew = `${where}.events[${i}]`;
      if (!(event.type in EVENT_DEFAULT_FRAMES)) {
        fail(`${ew}: unknown event type "${event.type}".`);
      }
      if (typeof event.atSec !== "number" || event.atSec < 0) {
        fail(`${ew}: "atSec" (number >= 0) is required.`);
      }
      if (CHARACTER_EVENTS.has(event.type) && !onScreen.has(event.characterId)) {
        fail(`${ew}: "${event.type}" needs a characterId that is listed in scene.characters.`);
      }
    });
  });
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

async function produceScene(scene, sceneIndex, draft, bible, ctx) {
  const leadInFrames = Math.round((scene.leadInSec ?? DEFAULT_LEAD_IN_SEC) * FPS);
  let cursor = leadInFrames;
  const segments = [];

  for (const [index, line] of (scene.lines ?? []).entries()) {
    cursor += Math.round((line.pauseBeforeSec ?? 0) * FPS);
    const voiceId = resolveVoice(line.speakerId, bible);
    const tts = await synthesizeSpeech({
      text: line.text,
      voiceId,
      modelId: ctx.modelId,
      languageCode: draft.languageCode,
    });
    const audioDurationSec = probeDuration(tts.file);
    const durationInFrames = Math.ceil((audioDurationSec + SEGMENT_PAD_SEC) * FPS);
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
      audioFile: tts.publicPath,
      startFrame: cursor,
      durationInFrames,
      audioDurationSec,
      mouthCues,
    });
    cursor += durationInFrames;
  }

  let ambienceFile = null;
  if (scene.ambience) {
    ambienceFile = (await generateAmbience(scene.ambience)).publicPath;
  }

  let end = Math.max(cursor, Math.ceil((scene.holdSec ?? 0) * FPS));

  const sfx = [];
  for (const cue of scene.sfx ?? []) {
    const requested = Math.min(30, Math.max(0.5, cue.durationSec ?? DEFAULT_SFX_SEC));
    const generated = await generateSfx(cue.prompt, requested);
    const startFrame = Math.round(cue.atSec * FPS);
    const durationInFrames = Math.ceil(probeDuration(generated.file) * FPS);
    sfx.push({ file: generated.publicPath, startFrame, durationInFrames });
    end = Math.max(end, startFrame + durationInFrames);
  }

  const events = (scene.events ?? []).map((event) => {
    const frame = Math.round(event.atSec * FPS);
    const durationInFrames = event.durationSec
      ? Math.max(1, Math.round(event.durationSec * FPS))
      : EVENT_DEFAULT_FRAMES[event.type];
    end = Math.max(end, frame + Math.max(durationInFrames, 15));
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
    timeOfDay: scene.timeOfDay ?? "day",
    ambienceFile,
    characters: scene.characters.map((c) => ({
      characterId: c.characterId,
      pose: c.pose ?? "standing",
      x: c.x ?? 0.5,
      ...(c.flip ? { flip: true } : {}),
      ...(c.gestureIntensity ? { gestureIntensity: c.gestureIntensity } : {}),
    })),
    durationInFrames: end,
    segments,
    sfx: sfx.map((cue) => ({
      ...cue,
      durationInFrames: Math.min(cue.durationInFrames, Math.max(1, end - cue.startFrame)),
    })),
    events,
  };
}

async function main() {
  const skipRender = process.argv.includes("--no-render");

  if (!process.env.ELEVENLABS_API_KEY) {
    fail("ELEVENLABS_API_KEY is missing from .env. Run /setup first.");
  }
  const bible = readJson("story-bible.json", "Run /setup first.");
  const draft = readJson("src/data/draft_script.json", "Create the draft script with /video first.");
  draft.languageCode = draft.languageCode || bible.defaultLanguage;
  validateDraft(draft, bible);

  for (const dir of ["audio", "sfx", "ambience", "lipsync"]) {
    fs.mkdirSync(path.join("public", dir), { recursive: true });
  }
  fs.mkdirSync("out", { recursive: true });

  const modelId = bible.planTier === "free" ? "eleven_flash_v2_5" : "eleven_multilingual_v2";
  log(`Plan tier: ${bible.planTier} | TTS model: ${modelId} | language: ${draft.languageCode}`);

  let rhubarbPath = null;
  const ctx = {
    modelId,
    rhubarb: () => (rhubarbPath ??= resolveRhubarb()),
  };

  const scenes = [];
  let startFrame = 0;
  for (const [index, scene] of draft.scenes.entries()) {
    const produced = await produceScene(scene, index, draft, bible, ctx);
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
    ["remotion", "render", "src/index.ts", "Episode", output, "--props=src/data/episode.json"],
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
