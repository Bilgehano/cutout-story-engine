#!/usr/bin/env node
/**
 * Audio-first episode production pipeline.
 *
 *   draft_script.json -> ElevenLabs mp3 -> 16 kHz mono WAV (FFmpeg) -> Rhubarb visemes
 *   -> exact duration (ffprobe) -> src/data/episode.json -> npx remotion render
 *
 * Usage:
 *   node .github/skills/cutout-animator/scripts/produce.mjs [--no-render] [--force] [--draft <path>]
 *
 *   --no-render  Build episode.json but skip the Remotion render.
 *   --force      Regenerate audio / lip-sync even if cached files exist.
 *   --draft      Use a different draft script path.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
dotenv.config({ path: path.join(ROOT, ".env") });

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const TAIL_SEC = 0.25;
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const SUPPORTED_LANGUAGES = ["en", "de", "tr", "es", "fr", "it", "pt", "pl", "nl", "ru", "ja", "ko", "zh", "ar", "hi", "sv"];
const VALID_SLOTS = ["left", "center", "right"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const log = (msg) => console.log(`[produce] ${msg}`);
const fail = (msg) => {
  console.error(`[produce] ERROR: ${msg}`);
  process.exit(1);
};

const readJson = (file, required = true) => {
  if (!fs.existsSync(file)) {
    if (required) fail(`Missing file: ${path.relative(ROOT, file)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return fail(`Invalid JSON in ${path.relative(ROOT, file)}: ${err.message}`);
  }
};

const isWindows = process.platform === "win32";

const run = (cmd, cmdArgs, opts = {}) =>
  execFileSync(cmd, cmdArgs, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

const assertTool = (cmd, versionArgs) => {
  try {
    run(cmd, versionArgs);
  } catch {
    fail(`"${cmd}" was not found on PATH. Install FFmpeg (includes ffprobe) and try again.`);
  }
};

const resolveRhubarb = () => {
  const fromEnv = process.env.RHUBARB_PATH ? path.resolve(ROOT, process.env.RHUBARB_PATH) : null;
  const bundled = path.join(ROOT, "bin", isWindows ? "rhubarb.exe" : "rhubarb");
  const candidate = fromEnv ?? bundled;
  if (!fs.existsSync(candidate)) {
    fail(
      `Rhubarb binary not found at ${path.relative(ROOT, candidate)}. Download it from ` +
        "https://github.com/DanielSWolf/rhubarb-lip-sync/releases and extract it (with its res/ folder) into bin/."
    );
  }
  return candidate;
};

const hash = (...parts) => createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 8);

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

// ---------------------------------------------------------------------------
// Voice resolution
// ---------------------------------------------------------------------------
const resolveVoiceId = (line, languageCode, bible) => {
  if (line.voiceId) return line.voiceId;
  const character = bible?.characters?.find((c) => c.id === line.characterId);
  const fromCharacter = character?.voices?.[languageCode]?.voiceId ?? character?.voices?.[languageCode] ?? character?.voiceId;
  if (typeof fromCharacter === "string" && fromCharacter) return fromCharacter;
  const profile = bible?.voiceProfiles?.[languageCode];
  const fromGender = character?.gender ? profile?.voices?.[character.gender] : undefined;
  if (fromGender) return fromGender;
  const fromProfile = profile?.defaultVoiceId;
  if (fromProfile) return fromProfile;
  if (process.env.ELEVENLABS_DEFAULT_VOICE_ID) return process.env.ELEVENLABS_DEFAULT_VOICE_ID;
  return fail(
    `No ElevenLabs voiceId for character "${line.characterId}" in language "${languageCode}". ` +
      "Set it on the line, on the character in story-bible.json, in voiceProfiles, or via ELEVENLABS_DEFAULT_VOICE_ID."
  );
};

// ---------------------------------------------------------------------------
// ElevenLabs
// ---------------------------------------------------------------------------
const synthesize = async ({ text, voiceId, languageCode, outFile }) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey.startsWith("your_")) fail("ELEVENLABS_API_KEY is missing. Copy .env.example to .env and set it.");

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const request = (withLanguage) =>
    fetch(url, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        ...(withLanguage ? { language_code: languageCode } : {}),
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
      }),
    });

  let res = await request(true);
  if (res.status === 400 || res.status === 422) {
    const body = await res.text();
    if (/language/i.test(body)) {
      log(`Model "${MODEL_ID}" rejected language_code; retrying without it (language is inferred from the text).`);
      res = await request(false);
    } else {
      fail(`ElevenLabs request failed (${res.status}): ${body}`);
    }
  }
  if (!res.ok) fail(`ElevenLabs request failed (${res.status}): ${await res.text()}`);
  fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
};

// ---------------------------------------------------------------------------
// FFmpeg / Rhubarb / ffprobe
// ---------------------------------------------------------------------------
const toWav = (mp3, wav) => run("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3, "-ar", "16000", "-ac", "1", wav]);

const runRhubarb = (rhubarb, wav, jsonOut, languageCode) => {
  // PocketSphinx only understands English; use the phonetic recognizer for every other language.
  const recognizer = languageCode === "en" ? "pocketSphinx" : "phonetic";
  run(rhubarb, ["-f", "json", "-r", recognizer, "--extendedShapes", "GHX", "-o", jsonOut, wav], {
    cwd: path.dirname(rhubarb),
  });
};

const probeDuration = (file) => {
  const out = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]);
  const sec = parseFloat(out.trim());
  if (!Number.isFinite(sec) || sec <= 0) fail(`ffprobe returned an invalid duration for ${file}`);
  return sec;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const main = async () => {
  const draftPath = path.resolve(ROOT, option("--draft") ?? "src/data/draft_script.json");
  const draft = readJson(draftPath);
  const bible = readJson(path.join(ROOT, "story-bible.json"), false);
  const force = flag("--force");

  const episodeNumber = draft.episodeNumber;
  if (!Number.isInteger(episodeNumber) || episodeNumber < 0) fail("draft.episodeNumber must be a non-negative integer.");
  const languageCode = draft.languageCode || bible?.defaultLanguage;
  if (!languageCode) fail("No languageCode in the draft and no defaultLanguage in story-bible.json.");
  if (!SUPPORTED_LANGUAGES.includes(languageCode)) {
    log(`Warning: language "${languageCode}" is not in the known list (${SUPPORTED_LANGUAGES.join(", ")}). Continuing anyway.`);
  }
  if (!Array.isArray(draft.scenes) || draft.scenes.length === 0) fail("draft.scenes must be a non-empty array.");

  assertTool("ffmpeg", ["-version"]);
  assertTool("ffprobe", ["-version"]);
  const rhubarb = resolveRhubarb();

  const audioDir = path.join(ROOT, "public", "audio");
  const lipsyncDir = path.join(ROOT, "public", "lipsync");
  ensureDir(audioDir);
  ensureDir(lipsyncDir);

  log(`Episode ${episodeNumber} | language: ${languageCode} | ${draft.scenes.length} scene(s)`);

  const scenes = [];
  for (let si = 0; si < draft.scenes.length; si++) {
    const scene = draft.scenes[si];
    const sceneId = scene.id || `scene_${si + 1}`;
    if (!scene.environmentId) fail(`${sceneId}: environmentId is required.`);
    if (!Array.isArray(scene.characters) || scene.characters.length === 0) fail(`${sceneId}: characters must be a non-empty array.`);
    const sceneCharacters = scene.characters.map((c, ci) => {
      if (!c.characterId) fail(`${sceneId}: characters[${ci}].characterId is required.`);
      const slot = c.slot || (scene.characters.length === 1 ? "center" : ci === 0 ? "left" : "right");
      if (!VALID_SLOTS.includes(slot)) fail(`${sceneId}: invalid slot "${slot}" (use ${VALID_SLOTS.join(", ")}).`);
      return {
        characterId: c.characterId,
        slot,
        pose: c.pose || "standing",
        ...(c.outfit ? { outfit: c.outfit } : {}),
        ...(c.flip !== undefined ? { flip: c.flip } : {}),
        ...(c.colors ? { colors: c.colors } : {}),
      };
    });

    const lines = [];
    let cursor = 0;
    const draftLines = scene.lines || [];
    for (let li = 0; li < draftLines.length; li++) {
      const dl = draftLines[li];
      if (!dl.text || !dl.text.trim()) fail(`${sceneId}: lines[${li}].text is empty.`);
      if (!sceneCharacters.some((c) => c.characterId === dl.characterId)) {
        fail(`${sceneId}: line ${li} is spoken by "${dl.characterId}", who is not listed in the scene characters.`);
      }
      const voiceId = resolveVoiceId(dl, languageCode, bible);
      const key = hash(dl.text, voiceId, languageCode, MODEL_ID);
      const base = `ep${episodeNumber}_s${si + 1}_l${li + 1}_${key}`;
      const mp3 = path.join(audioDir, `${base}.mp3`);
      const wav = path.join(audioDir, `${base}.wav`);
      const cues = path.join(lipsyncDir, `${base}.json`);

      if (force || !fs.existsSync(mp3)) {
        log(`${sceneId} line ${li + 1}: ElevenLabs (${languageCode}, voice ${voiceId.slice(0, 6)}...)`);
        await synthesize({ text: dl.text, voiceId, languageCode, outFile: mp3 });
      } else {
        log(`${sceneId} line ${li + 1}: cached audio`);
      }
      if (force || !fs.existsSync(wav)) toWav(mp3, wav);
      if (force || !fs.existsSync(cues)) {
        log(`${sceneId} line ${li + 1}: Rhubarb lip sync`);
        runRhubarb(rhubarb, wav, cues, languageCode);
      }

      const mouthCues = readJson(cues).mouthCues;
      if (!Array.isArray(mouthCues) || mouthCues.length === 0) fail(`Rhubarb produced no mouthCues for ${base}.`);

      const durationSec = probeDuration(wav);
      const durationInFrames = Math.ceil((durationSec + TAIL_SEC) * FPS);
      lines.push({
        characterId: dl.characterId,
        text: dl.text,
        audioFile: `audio/${base}.mp3`,
        lipsyncFile: `lipsync/${base}.json`,
        startFrame: cursor,
        durationInFrames,
        speechFrames: Math.ceil(durationSec * FPS),
        mouthCues,
      });
      cursor += durationInFrames;
    }

    let durationInFrames = cursor;
    if (lines.length === 0) {
      if (!(scene.holdSec > 0)) fail(`${sceneId}: a scene without lines needs holdSec > 0.`);
      durationInFrames = Math.ceil(scene.holdSec * FPS);
    }

    const events = (scene.events || []).map((ev, ei) => {
      let atFrame;
      if (typeof ev.atLine === "number") {
        const target = lines[ev.atLine];
        if (!target) fail(`${sceneId}: events[${ei}].atLine=${ev.atLine} does not exist.`);
        atFrame = target.startFrame + Math.round((ev.offsetSec ?? 0) * FPS);
      } else if (typeof ev.atSec === "number") {
        atFrame = Math.round(ev.atSec * FPS);
      } else {
        return fail(`${sceneId}: events[${ei}] needs "atSec" or "atLine".`);
      }
      const { atSec, atLine, offsetSec, ...rest } = ev;
      return { ...rest, atFrame: Math.max(0, Math.min(atFrame, durationInFrames - 1)) };
    });

    scenes.push({
      id: sceneId,
      environmentId: scene.environmentId,
      timeOfDay: scene.timeOfDay || "day",
      doorState: scene.doorState || "closed",
      camera: {
        zoomFrom: scene.camera?.zoomFrom ?? 1,
        zoomTo: scene.camera?.zoomTo ?? 1.08,
        focusX: scene.camera?.focusX ?? 50,
        focusY: scene.camera?.focusY ?? 40,
      },
      characters: sceneCharacters,
      events,
      lines,
      durationInFrames,
    });
  }

  const totalFrames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
  const episode = {
    episodeNumber,
    title: draft.title,
    languageCode,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    totalFrames,
    scenes,
  };
  const episodePath = path.join(ROOT, "src", "data", "episode.json");
  fs.writeFileSync(episodePath, JSON.stringify(episode, null, 2) + "\n");
  log(`Wrote src/data/episode.json (${totalFrames} frames = ${(totalFrames / FPS).toFixed(1)}s)`);

  if (flag("--no-render")) {
    log("Skipping render (--no-render).");
    return;
  }

  ensureDir(path.join(ROOT, "out"));
  const outFile = `out/episode_${episodeNumber}.mp4`;
  log(`Rendering ${outFile} ...`);
  const render = spawnSync("npx", ["remotion", "render", "Episode", outFile], {
    cwd: ROOT,
    stdio: "inherit",
    shell: isWindows,
  });
  if (render.status !== 0) fail("remotion render failed.");
  log(`Done: ${outFile}. Next: run /review`);
};

main().catch((err) => fail(err instanceof Error ? err.stack || err.message : String(err)));
