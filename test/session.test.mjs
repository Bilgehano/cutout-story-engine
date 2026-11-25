import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { session, validatePlan } from "../.github/skills/cutout-animator/scripts/session.mjs";

const example = JSON.parse(fs.readFileSync(new URL("../examples/episode-plan.json", import.meta.url)));

test("incomplete or inconsistent creative decisions cannot lock", () => {
  for (const edit of [
    (p) => p.scenes[0].beats.pop(),
    (p) => delete p.characters[0].voiceId,
    (p) => { p.scenes[0].lines[0].speakerId = "unknown"; },
    (p) => { p.scenes[0].sfx[0].atSec = 5; },
    (p) => { p.scenes[0].lines.push(p.scenes[0].lines[0]); },
    (p) => { p.durationSec++; },
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
  assert.throws(() => session("video"), /Run \/environment/);
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
  assert.throws(() => session("video"), /Run \/character/);
});
