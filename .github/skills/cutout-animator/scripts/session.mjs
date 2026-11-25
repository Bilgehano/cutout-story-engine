import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import dotenv from "dotenv";

const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const validate = new Ajv({ allErrors: true }).compile(json(new URL("../schemas/plan.schema.json", import.meta.url)));
const check = (ok, message) => { if (!ok) throw new Error(message); };
const planned = (ok, message) => check(ok, `${message} Complete /create first.`);
const frames = (seconds) => Math.round(seconds * 30);
const kinds = { character: ["characters", "characters"], environment: ["environments", "backgrounds"] };

function setup() {
  const missing = [".setup-complete", "story-bible.json"].filter((p) => !fs.existsSync(p));
  if (!fs.existsSync(".env") || !dotenv.parse(fs.readFileSync(".env")).ELEVENLABS_API_KEY?.trim()) missing.push(".env: ELEVENLABS_API_KEY");
  if (!["bin/rhubarb", "bin/rhubarb.exe"].some((p) => fs.existsSync(p))) missing.push("bin/rhubarb(.exe)");
  check(!missing.length, `Missing ${missing.join(", ")}. Run /setup first.`);
  return json("story-bible.json");
}

function unique(values, name) {
  planned(new Set(values).size === values.length, `Duplicate ${name}.`);
}

export function validatePlan(p, bible, number) {
  if (!validate(p)) planned(false, new Ajv().errorsText(validate.errors, { separator: "; " }));
  planned(p.episodeNumber === number && p.narratorVoiceId === bible.narratorVoiceId, "Episode number or storyteller voice mismatch.");
  unique([p.narratorVoiceId, ...p.characters.map((c) => c.voiceId)], "voice assignment");
  for (const [collection] of Object.values(kinds)) {
    unique(p[collection].map((a) => a.id), `${collection} id`);
    unique(p[collection].map((a) => a.component.toLowerCase()), `${collection} component`);
  }
  planned(!p.characters.some((c) => c.id === "narrator"), "Reserved narrator ID.");
  unique(p.scenes.map((s) => s.id), "scene id");
  planned(p.durationSec === p.scenes.reduce((n, s) => n + s.durationSec, 0), "Scene lengths do not sum to the episode length.");
  const cast = new Map(p.characters.map((a) => [a.id, a]));
  for (const s of p.scenes) {
    const require = (ok, why) => planned(ok, `${s.id}: ${why}.`);
    require(p.environments.find((e) => e.id === s.environmentId)?.timeOfDayVariants.includes(s.timeOfDay), "unplanned environment or lighting");
    require(s.beats.length === s.durationSec, "write one visual beat per second");
    unique(s.characters.map((c) => c.characterId), `${s.id} placement`);
    s.characters.forEach((c) => require(cast.get(c.characterId)?.poses.includes(c.pose), `unknown cast/pose ${c.characterId}/${c.pose}`));
    for (const cue of [...s.lines, ...s.sfx, ...s.events]) {
      require(frames(cue.durationSec) > 0 && frames(cue.atSec) + frames(cue.durationSec) <= frames(s.durationSec), "cue outside the scene");
    }
    let end = 0;
    for (const line of s.lines) {
      require(line.lineType === "narration" ? line.speakerId === "narrator" : cast.has(line.speakerId), "unknown speaker or wrong speech mode");
      require(frames(line.atSec) >= end, "speech slots must be chronological and non-overlapping");
      end = frames(line.atSec) + frames(line.durationSec);
    }
    for (const e of s.events) {
      if (["eyeLook","mood","jump","characterEnter"].includes(e.type)) require(s.characters.some((c) => c.characterId === e.characterId), "event target not on screen");
      const choices = { mood: ["neutral","happy","sad","angry","surprised","worried"], characterEnter: ["left","right"], doorState: ["closed","ajar","open"], eyeLook: ["center","left","right","up","down","phone"] };
      if (e.type in choices) {
        const unit = (v, min) => typeof v === "number" && v >= min && v <= 1;
        require(choices[e.type].includes(e.value) || (e.type === "doorState" && unit(e.value,0)) ||
          (e.type === "eyeLook" && unit(e.value?.x,-1) && unit(e.value?.y,-1)), `invalid ${e.type} target`);
      }
    }
  }
}

function inventory(plan, bible, kind) {
  const [collection, folder] = kinds[kind];
  return plan[collection].filter((asset) => {
    const entry = bible[collection].find((item) => item.id === asset.id);
    const file = `src/components/${folder}/${asset.component}.tsx`;
    planned(!bible[collection].some((item) => item.id !== asset.id && (item.component ?? item.id).toLowerCase() === asset.component.toLowerCase()), `${file} belongs to another asset.`);
    if (entry) {
      for (const key of ["component", "design", "voiceId"]) {
        planned(entry[key] === undefined || entry[key] === asset[key], `${kind} ${asset.id} conflicts with the registered ${key}.`);
      }
    }
    const exists = fs.existsSync(file);
    planned(entry || !exists, `Unregistered component collision: ${file}.`);
    const built = entry && exists;
    planned(asset.source !== "reuse" || built, `Cannot reuse unavailable ${kind} ${asset.id}.`);
    return !built;
  }).map((a) => a.id);
}

export function session(command) {
  const bible = setup();
  const numbers = fs.existsSync("sessions") ? fs.readdirSync("sessions", {withFileTypes:true})
    .filter((d) => d.isDirectory() && /^episode-[1-9]\d*$/.test(d.name)).map((d) => Number(d.name.slice(8))) : [];
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
  let plan;
  try { plan = JSON.parse(raw); } catch (e) { planned(false, `${file}: ${e.message}`); }
  validatePlan(plan, bible, latest);
  const hash = createHash("sha256").update(raw).digest("hex");
  const marked = (stage) => fs.existsSync(`${dir}/${stage}.lock`) && fs.readFileSync(`${dir}/${stage}.lock`, "utf8") === hash;
  const mark = (stage) => fs.writeFileSync(`${dir}/${stage}.lock`, hash);
  if (command !== "lock") planned(marked("create"), "No completed /create for this version of the active plan.");
  const missing = Object.fromEntries(Object.keys(kinds).map((kind) => [kind, inventory(plan, bible, kind)]));
  if (command === "lock") mark("create");
  else if (command === "video" || command.startsWith("finish-")) {
    const stages = command === "video" ? Object.keys(kinds) : [command.slice(7)];
    for (const kind of stages) {
      check(Object.hasOwn(kinds, kind), `Unknown stage ${kind}.`);
      check(!missing[kind].length, `Missing ${kind}: ${missing[kind].join(", ")}. Run /${kind} first.`);
      if (command === "video") check(marked(kind), `Run /${kind} for this plan first.`);
      else mark(kind);
    }
  } else check(command === "status", `Unknown session command: ${command}`);
  return { dir, plan, bible, missing };
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const {plan, bible, ...result} = session(process.argv[2] ?? "status");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
