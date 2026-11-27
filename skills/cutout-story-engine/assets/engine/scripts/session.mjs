import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv";
import dotenv from "dotenv";

const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const validate = new Ajv({ allErrors: true }).compile(json(new URL("./plan.schema.json", import.meta.url)));
const check = (ok, message) => { if (!ok) throw new Error(message); };
const planned = (ok, message) => check(ok, `${message} Complete /create first.`);
const frames = (seconds) => Math.round(seconds * 30);
const kinds = { character: ["characters", "characters"], environment: ["environments", "backgrounds"] };
export const DEFAULT_VOICE = { stability: 0.5, similarity_boost: 0.8 };
/** How far a single line may move from its speaker's baseline. Eleven v3 only has stability steps of 0.5. */
const DRIFT = { stability: 0.25, similarity_boost: 0.15 };
const ASSET_KEYS = {
  characters: ["id","component","name","role","design","voiceId","voiceSettings","poses","outfits","conditions","gestureIntensity"],
  environments: ["id","component","name","design","timeOfDayVariants","props"],
};
const LOCKED = ["component", "design", "voiceId", "voiceSettings"];
const pick = (value, keys) => Object.fromEntries(keys.filter((k) => value[k] !== undefined).map((k) => [k, value[k]]));
const saveBible = (bible) => fs.writeFileSync("story-bible.json", `${JSON.stringify(bible, null, 2)}\n`);
const assetFile = (folder, component) => `src/components/${folder}/${component}.tsx`;
/** Line endings are normalised so a Windows checkout does not count as a change. */
const fingerprint = (file) => createHash("sha256").update(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).digest("hex");

/** Returning assets only need {id, source: "reuse"} in a plan; the rest comes from the story bible. */
export function expand(plan, bible) {
  const full = structuredClone(plan);
  for (const [collection] of Object.values(kinds)) {
    if (!Array.isArray(full?.[collection])) continue;
    full[collection] = full[collection].map((asset) => {
      const entry = asset?.source === "reuse" && bible[collection]?.find((item) => item.id === asset.id);
      return entry ? { ...pick(entry, ASSET_KEYS[collection]), ...asset } : asset;
    });
  }
  return full;
}

function setup() {
  const missing = [".setup-complete", "story-bible.json"].filter((p) => !fs.existsSync(p));
  if (!fs.existsSync(".env") || !dotenv.parse(fs.readFileSync(".env")).ELEVENLABS_API_KEY?.trim()) missing.push(".env: ELEVENLABS_API_KEY");
  if (!["bin/rhubarb", "bin/rhubarb.exe"].some((p) => fs.existsSync(p))) missing.push("bin/rhubarb(.exe)");
  check(!missing.length, `Missing ${missing.join(", ")}. Run /setup first.`);
  // The host owns the live OAuth connection; /create rechecks it on every invocation.
  const receipt = fs.readFileSync(".setup-complete", "utf8");
  check(receipt.startsWith("elevenlabs-mcp:verified "), "Missing ElevenLabs MCP verification. Run /setup first.");
  return json("story-bible.json");
}

function unique(values, name) {
  planned(new Set(values).size === values.length, `Duplicate ${name}.`);
}

export function validatePlan(raw, bible, number) {
  const p = expand(raw, bible);
  planned(!bible.voiceModel || raw.modelId === bible.voiceModel, `This series is locked to ${bible.voiceModel}.`);
  if (!validate(p)) planned(false, new Ajv().errorsText(validate.errors, { separator: "; " }));
  planned(p.episodeNumber === number && p.narratorVoiceId === bible.narratorVoiceId, "Episode number or storyteller voice mismatch.");
  unique([p.narratorVoiceId, ...p.characters.map((c) => c.voiceId)], "voice assignment");
  for (const [collection] of Object.values(kinds)) {
    unique(p[collection].map((a) => a.id), `${collection} id`);
    unique(p[collection].map((a) => a.component.toLowerCase()), `${collection} component`);
    // Registries discover components by file name and are looked up by id, so the two must match.
    p[collection].forEach((a) => planned(a.component === a.id, `${a.id}: component must equal its id (${a.component}).`));
  }
  planned(!p.characters.some((c) => c.id === "narrator"), "Reserved narrator ID.");
  unique(p.scenes.map((s) => s.id), "scene id");
  planned(frames(p.durationSec) === p.scenes.reduce((n, s) => n + frames(s.durationSec), 0), "Scene lengths do not sum to the episode length.");
  const cast = new Map(p.characters.map((a) => [a.id, a]));
  for (const s of p.scenes) {
    const require = (ok, why) => planned(ok, `${s.id}: ${why}.`);
    require(p.environments.find((e) => e.id === s.environmentId)?.timeOfDayVariants.includes(s.timeOfDay), "unplanned environment or lighting");
    unique(s.characters.map((c) => c.characterId), `${s.id} placement`);
    s.characters.forEach((c) => {
      const asset = cast.get(c.characterId);
      require(asset?.poses.includes(c.pose), `unknown cast/pose ${c.characterId}/${c.pose}`);
      require(!c.outfit || asset.outfits?.includes(c.outfit), `undeclared outfit ${c.characterId}/${c.outfit}`);
      (c.conditions ?? []).forEach((x) => require(asset.conditions?.includes(x), `undeclared condition ${c.characterId}/${x}`));
    });
    for (const cue of [...s.lines, ...s.sfx, ...s.events]) {
      require(frames(cue.durationSec) > 0 && frames(cue.atSec) + frames(cue.durationSec) <= frames(s.durationSec), "cue outside the scene");
    }
    let end = 0;
    for (const line of s.lines) {
      require(!/[\[\]]/.test(line.text), "put performance tags in tags, not spoken text");
      const speaker = line.speakerId === "narrator" ? bible.narratorVoiceSettings : cast.get(line.speakerId)?.voiceSettings;
      const base = speaker ?? DEFAULT_VOICE;
      line.voiceSettings = { ...base, ...line.voiceSettings };
      for (const [key, limit] of Object.entries(DRIFT)) {
        const allowed = p.modelId === "eleven_v3" && key === "stability" ? 0.5 : limit;
        require(Math.abs(line.voiceSettings[key] - base[key]) <= allowed + 1e-9, `${line.speakerId} ${key} drifts more than ${allowed} from the baseline ${base[key]}`);
      }
      require(p.modelId !== "eleven_v3" || [0, 0.5, 1].includes(line.voiceSettings.stability), "v3 stability must be 0, 0.5 or 1");
      require(line.lineType === "narration" ? line.speakerId === "narrator" : cast.has(line.speakerId), "unknown speaker or wrong speech mode");
      require(frames(line.atSec) >= end, "speech slots must be chronological and non-overlapping");
      end = frames(line.atSec) + frames(line.durationSec);
    }
    for (const e of s.events) {
      if (["eyeLook","mood","jump","characterEnter","eyes","standUp","fall","walk"].includes(e.type)) require(s.characters.some((c) => c.characterId === e.characterId), "event target not on screen");
      const within = (v, min, max) => typeof v === "number" && v >= min && v <= max;
      if (e.type === "walk") require(within(e.value, 0, 1), "walk needs a target x between 0 and 1");
      if (e.type === "camera") require(within(e.value?.x, 0, 1080) && within(e.value?.y, 0, 1920) && within(e.value?.zoom, 1, 6), "camera needs {x, y, zoom}");
      if (e.type === "endCard") require(typeof e.value === "string" && e.value.trim(), "endCard needs its text");
      if (e.type === "title") require(typeof e.value === "string" && e.value.trim() && e.value.length <= 60, "title needs its text (max 60 characters)");
      const choices = { mood: ["neutral","happy","sad","angry","surprised","worried"], characterEnter: ["left","right"], doorState: ["closed","ajar","open"], eyes: ["open","closed"], eyeLook: ["center","left","right","up","down","phone"] };
      if (e.type in choices) {
        const unit = (v, min) => typeof v === "number" && v >= min && v <= 1;
        require(choices[e.type].includes(e.value) || (e.type === "doorState" && unit(e.value,0)) ||
          (e.type === "eyeLook" && unit(e.value?.x,-1) && unit(e.value?.y,-1)), `invalid ${e.type} target`);
      }
    }
  }
  return p;
}

function inventory(plan, bible, kind) {
  const [collection, folder] = kinds[kind];
  return plan[collection].filter((asset) => {
    const entry = bible[collection].find((item) => item.id === asset.id);
    const file = assetFile(folder, asset.component);
    planned(!bible[collection].some((item) => item.id !== asset.id && (item.component ?? item.id).toLowerCase() === asset.component.toLowerCase()), `${file} belongs to another asset.`);
    const exists = fs.existsSync(file);
    planned(asset.source !== "reuse" || (entry && exists), `Cannot reuse unavailable ${kind} ${asset.id}.`);
    if (!entry || entry.needsUpdate) return true;
    for (const key of LOCKED) {
      planned(entry[key] === undefined || asset[key] === undefined || isDeepStrictEqual(entry[key], asset[key]), `${kind} ${asset.id} conflicts with the registered ${key}.`);
    }
    if (kind === "character") {
      for (const key of ["poses", "outfits", "conditions"]) {
        const extra = (asset[key] ?? []).filter((v) => !(entry[key] ?? (key === "poses" ? asset[key] : [])).includes(v));
        check(!extra.length, `${asset.id} has no artwork for ${key}: ${extra.join(", ")}. To extend it on purpose: npm run session -- unlock ${asset.id}`);
      }
    }
    check(!exists || !entry.fingerprint || entry.fingerprint === fingerprint(file),
      `Locked artwork changed: ${file}. Restore the approved file, or accept a deliberate change with: npm run session -- unlock ${asset.id}`);
    return !exists;
  }).map((a) => a.id);
}

/** Registers finished assets in the story bible and fingerprints their artwork. */
function approve(plan, bible, kind) {
  const [collection, folder] = kinds[kind];
  for (const asset of plan[collection]) {
    const file = assetFile(folder, asset.component);
    check(fs.existsSync(file), `Missing ${kind}: ${asset.id}. Run /${kind} first.`);
    const index = bible[collection].findIndex((item) => item.id === asset.id);
    const old = bible[collection][index];
    const fresh = pick(asset, ASSET_KEYS[collection]);
    const entry = !old || old.needsUpdate ? { ...old, ...fresh } : { ...fresh, ...old };
    if (kind === "character") entry.voiceSettings ??= { ...DEFAULT_VOICE };
    if (!old || old.needsUpdate || !old.fingerprint) entry.fingerprint = fingerprint(file);
    delete entry.needsUpdate;
    if (old) bible[collection][index] = entry;
    else bible[collection].push(entry);
  }
  saveBible(bible);
}

function unlock(bible, id) {
  const found = Object.values(kinds).flatMap(([collection]) => bible[collection]).filter((item) => item.id === id);
  check(found.length, `Unknown asset ${id}.`);
  found.forEach((item) => { item.needsUpdate = true; delete item.fingerprint; });
  saveBible(bible);
  return { unlocked: id };
}

/** Small continuity digest, so planning does not have to read old plans or components. */
function summary(bible, numbers) {
  const recent = numbers.sort((a, b) => a - b).slice(-3).flatMap((n) => {
    const file = `sessions/episode-${n}/plan.json`;
    if (!fs.existsSync(file)) return [];
    const { title, summary: story, ending } = json(file);
    const approved = bible.episodes.some((e) => e.episodeNumber === n);
    return [{ episodeNumber: n, approved, title, summary: story, ending }];
  });
  return {
    narratorVoiceId: bible.narratorVoiceId,
    characters: bible.characters.map((c) => pick(c, ["id","name","role","poses","outfits","conditions"])),
    environments: bible.environments.map((e) => pick(e, ["id","name","timeOfDayVariants","props"])),
    recent,
  };
}

export function session(command, arg) {
  const bible = setup();
  if (command === "unlock") return unlock(bible, arg);
  const numbers = fs.existsSync("sessions") ? fs.readdirSync("sessions", {withFileTypes:true})
    .filter((d) => d.isDirectory() && /^episode-[1-9]\d*$/.test(d.name)).map((d) => Number(d.name.slice(8))) : [];
  if (command === "summary") return summary(bible, numbers);
  const latest = Math.max(0, ...numbers);
  if (command === "new") {
    const number = Math.max(latest, ...bible.episodes.map((e) => e.episodeNumber)) + 1;
    const dir = `sessions/episode-${number}`;
    fs.mkdirSync("sessions", {recursive:true});
    fs.mkdirSync(dir);
    return { dir, episodeNumber: number };
  }
  const dir = `sessions/episode-${latest}`;
  const file = `${dir}/plan.json`;
  planned(latest && fs.existsSync(file), `Missing active episode plan (${file}).`);
  const raw = fs.readFileSync(file, "utf8");
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { planned(false, `${file}: ${e.message}`); }
  const plan = validatePlan(parsed, bible, latest);
  const hash = createHash("sha256").update(raw).digest("hex");
  const marked = (stage) => fs.existsSync(`${dir}/${stage}.lock`) && fs.readFileSync(`${dir}/${stage}.lock`, "utf8") === hash;
  const mark = (stage) => fs.writeFileSync(`${dir}/${stage}.lock`, hash);
  if (command !== "lock") planned(marked("create"), "No completed /create for this version of the active plan.");
  const scan = () => Object.fromEntries(Object.keys(kinds).map((kind) => [kind, inventory(plan, bible, kind)]));
  let missing = scan();
  if (command === "lock") {
    // Pin the voice model once so later episodes cannot silently change how the cast sounds.
    bible.voiceModel ??= plan.modelId;
    bible.narratorVoiceSettings ??= { ...DEFAULT_VOICE };
    saveBible(bible);
    mark("create");
  } else if (command?.startsWith("finish-")) {
    const kind = command.slice(7);
    check(Object.hasOwn(kinds, kind), `Unknown stage ${kind}.`);
    approve(plan, bible, kind);
    missing = scan();
    mark(kind);
  } else if (command === "video") {
    for (const kind of Object.keys(kinds)) {
      check(!missing[kind].length, `Missing ${kind}: ${missing[kind].join(", ")}. Resume /video to build assets.`);
      check(marked(kind), `Resume /video: ${kind} QA is incomplete for this plan.`);
    }
  } else check(command === "status", `Unknown session command: ${command}`);
  return { dir, plan, bible, missing };
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const {plan, bible, ...result} = session(process.argv[2] ?? "status", process.argv[3]);
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
