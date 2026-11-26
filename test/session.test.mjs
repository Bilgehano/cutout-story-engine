import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { speechRequest, captionCues } from "../.github/skills/cutout-animator/scripts/performance.mjs";
import { session, validatePlan } from "../.github/skills/cutout-animator/scripts/session.mjs";

const example = JSON.parse(fs.readFileSync(new URL("../examples/episode-plan.json", import.meta.url)));

test("perform the tagged line but caption only its words, with a gap for the pause", () => {
  const line = {...example.scenes[0].lines[0], text:"Wait ... Mama.", tags:["sorrowful","sighs"]};
  const {body} = speechRequest([line], 0, "voice", example.modelId, "de");
  assert.equal(body.text, "[sorrowful] [sighs] Wait ... Mama.");
  assert.deepEqual(body.voice_settings, line.voiceSettings);
  const chars = [...body.text];
  const starts = chars.map((_,i) => i * 0.05 + (i >= body.text.indexOf("Mama") ? 1 : 0));
  const cues = captionCues({characters:chars, character_start_times_seconds:starts, character_end_times_seconds:starts.map(n=>n+0.05)}, line.text);
  assert.deepEqual(cues.map(c=>c.text), ["Wait","Mama."]);
  assert.ok(cues[1].start - cues[0].end > 1);
});

test("send nearby turns as context, not as words to speak or private thoughts to overhear", () => {
  const line = { ...example.scenes[0].lines[0], lineType:"dialogue" };
  const lines = [
    {...line, speakerId:"Mother", text:"Alles okay?"},
    {...line, text:"Ja, klar."},
    {...line, speakerId:"Mother", text:"Sicher?"},
    {...line, lineType:"thought", text:"Sie darf es nicht wissen."},
  ];
  const request = i => speechRequest(lines, i, "voice", example.modelId, "de").body;
  assert.equal(request(1).previous_text, lines[0].text);
  assert.equal(request(1).next_text, lines[2].text);
  assert.equal(request(1).text, "[whispering] Ja, klar.");
  assert.equal(request(0).previous_text, undefined);
  assert.equal(request(2).next_text, undefined);
  assert.equal(request(3).previous_text, undefined);
});

test("incomplete or inconsistent creative decisions cannot lock", () => {
  for (const edit of [
    (p) => p.scenes[0].beats.pop(),
    (p) => delete p.characters[0].voiceId,
    (p) => { p.scenes[0].lines[0].speakerId = "unknown"; },
    (p) => { p.scenes[0].sfx[0].atSec = 5; },
    (p) => { p.scenes[0].lines.push(p.scenes[0].lines[0]); },
    (p) => { p.durationSec++; },
    (p) => delete p.openingHook,
    (p) => delete p.scenes[0].transition,
    (p) => { p.scenes[0].lines[0].text = "[sighs] Hello"; },
    (p) => { p.modelId = "eleven_v3"; p.scenes[0].lines[0].voiceSettings.stability = 0.8; },
  ]) {
    const plan = structuredClone(example);
    edit(plan);
    assert.throws(() => validatePlan(plan, example, 1), /Complete \/create first/);
  }
});

test("a sequel keeps its own plan, reuses built assets and renders only after both stages", (t) => {
  const root = process.cwd();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cutout-session-test-"));
  t.after(() => { process.chdir(root); fs.rmSync(temp, {recursive:true, force:true}); });
  process.chdir(temp);
  const save = (file, value) => {
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
  };
  assert.throws(() => session("new"), /setup/);
  for (const file of [".setup-complete", "bin/rhubarb"]) save(file, "fixture");
  save(".env", "ELEVENLABS_API_KEY=offline-test");
  const bible = { narratorVoiceId:example.narratorVoiceId, characters:[], environments:[], episodes:[] };
  save("story-bible.json", bible);
  assert.throws(() => session("new"), /MCP verification/);
  save(".setup-complete", "elevenlabs-mcp:verified 2026-01-01T00:00:00Z");
  const one = session("new").dir;
  assert.throws(() => session("status"), /Complete \/create/);
  save(`${one}/plan.json`, example);
  assert.deepEqual(session("lock").missing, {character:["Mara"], environment:["Hall"]});
  for (const [collection, folder] of [["characters","characters"],["environments","backgrounds"]]) {
    bible[collection] = [...example[collection]];
    save(`src/components/${folder}/${bible[collection][0].component}.tsx`, "// fixture");
  }
  save("story-bible.json", bible);
  session("finish-character");
  session("finish-environment");
  session("video");

  const two = session("new").dir;
  assert.throws(() => session("video"), /Complete \/create/);
  const sequel = structuredClone(example);
  sequel.episodeNumber = 2;
  sequel.characters[0].source = sequel.environments[0].source = "reuse";
  const yard = {...sequel.environments[0], id:"Yard", component:"Yard", source:"build"};
  sequel.environments.push(yard);
  sequel.scenes.push({...structuredClone(sequel.scenes[0]), id:"outside", environmentId:"Yard"});
  sequel.durationSec *= 2;
  // A silent fixture exercises real production scheduling without paid APIs or binaries.
  for (const scene of sequel.scenes) Object.assign(scene, {lines:[], sfx:[], ambience:null});
  save(`${two}/plan.json`, sequel);
  assert.deepEqual(session("lock").missing, {character:[], environment:["Yard"]});
  session("finish-character");
  assert.throws(() => session("video"), /Missing environment: Yard/);
  bible.environments.push(yard);
  save("src/components/backgrounds/Yard.tsx", "// fixture");
  save("story-bible.json", bible);
  assert.throws(() => session("video"), /environment QA is incomplete/);
  session("finish-environment");

  const skill = ".github/skills/cutout-animator";
  fs.cpSync(path.join(root, skill), skill, {recursive:true});
  fs.symlinkSync(path.join(root, "node_modules"), "node_modules", "junction");
  fs.mkdirSync("src/data", {recursive:true});
  execFileSync(process.execPath, [`${skill}/scripts/produce.mjs`, "--no-render"]);
  const episode = JSON.parse(fs.readFileSync(`${two}/episode.json`));
  assert.equal(episode.totalDurationInFrames, 300);
  assert.equal(episode.scenes[1].startFrame, 150);
  assert.equal(episode.scenes[1].events[2].frame, 90);
  assert.deepEqual(JSON.parse(fs.readFileSync(`${one}/plan.json`)), example);

  sequel.title = "Revised sequel";
  save(`${two}/plan.json`, sequel);
  assert.throws(() => session("video"), /Complete \/create/);
  session("lock");
  assert.throws(() => session("video"), /character QA is incomplete/);
});
