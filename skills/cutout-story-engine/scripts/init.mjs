#!/usr/bin/env node
/**
 * Installs or upgrades the Cutout Story Engine in a project folder.
 *
 *   node <skill>/scripts/init.mjs [--target <dir>] [--upgrade | --sync] [--dry-run]
 *
 * Without a flag it only adds engine files that are missing, so it is safe to run in an
 * existing project. With --upgrade it also replaces engine files that differ from this skill's
 * copy, after copying the old file to .engine-backup/<timestamp>/.
 *
 * --sync is the automatic update run before every workflow: it does nothing when the project
 * already has this exact engine (same fingerprint in .cutout-engine.json), and otherwise acts
 * like --upgrade. So pulling a newer skill is all it takes to update every project.
 *
 * It never reads or writes the user's own data: .env, story-bible.json, sessions/, generated
 * characters and environments, refs/, bin/, audio caches and out/ are not part of the engine.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE_DIR = path.join(SKILL_DIR, "assets", "engine");
const VERSION = fs.readFileSync(path.join(SKILL_DIR, "VERSION"), "utf8").trim();
const MARKER = ".cutout-engine.json";

/** Stored without a leading dot so they cannot affect the skill repository or be dropped by installers. */
const RENAMED = { gitignore: ".gitignore", "env.example": ".env.example" };
/** Folders the project needs; created empty with a .gitkeep so the project's .gitignore rules apply. */
const KEEP_DIRS = ["bin", "refs", "public/audio", "public/sfx", "public/ambience", "public/lipsync", "src/data"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const sync = flag("--sync");
const upgrade = sync || flag("--upgrade");
const dryRun = flag("--dry-run");
const target = path.resolve(option("--target") ?? process.cwd());

const fail = (message) => {
  console.error(`[init] ERROR: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(ENGINE_DIR)) fail(`Engine files not found at ${ENGINE_DIR}. Reinstall the skill.`);
const inside = (child, parent) => {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};
if (inside(target, SKILL_DIR)) fail("Run this from your project folder, not from inside the skill.");

/** Every engine file as a project-relative path, skipping anything a developer may have installed locally. */
const engineFiles = (dir = ENGINE_DIR, prefix = "") =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? engineFiles(path.join(dir, entry.name), rel) : [rel];
  });

const projectPath = (rel) => RENAMED[rel] ?? rel;

const files = engineFiles().sort();
/** Fingerprint of this skill's engine, so --sync can tell in one step whether a project is current. */
const fingerprint = (() => {
  const hash = crypto.createHash("sha256");
  for (const rel of files) hash.update(`${rel}\0`).update(fs.readFileSync(path.join(ENGINE_DIR, rel)).toString("utf8").replace(/\r\n/g, "\n")).update("\0");
  return hash.digest("hex").slice(0, 16);
})();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(target, ".engine-backup", stamp);
const report = { created: [], updated: [], kept: [], unchanged: 0 };

const write = (dest, data) => {
  if (dryRun) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
};

const previous = fs.existsSync(path.join(target, MARKER))
  ? JSON.parse(fs.readFileSync(path.join(target, MARKER), "utf8"))
  : null;

if (sync && previous?.fingerprint === fingerprint) {
  console.log(`[init] Engine is up to date (${VERSION}, ${fingerprint}).`);
  process.exit(0);
}

for (const rel of files) {
  const source = fs.readFileSync(path.join(ENGINE_DIR, rel));
  const name = projectPath(rel);
  const dest = path.join(target, name);
  if (!fs.existsSync(dest)) {
    write(dest, source);
    report.created.push(name);
  } else if (fs.readFileSync(dest).equals(source)) {
    report.unchanged += 1;
  } else if (upgrade) {
    if (!dryRun) {
      fs.mkdirSync(path.dirname(path.join(backupDir, name)), { recursive: true });
      fs.copyFileSync(dest, path.join(backupDir, name));
    }
    write(dest, source);
    report.updated.push(name);
  } else {
    report.kept.push(name);
  }
}

for (const dir of KEEP_DIRS) {
  const keep = path.join(target, dir, ".gitkeep");
  if (!fs.existsSync(keep)) {
    write(keep, "");
    if (!report.created.includes(`${dir}/.gitkeep`)) report.created.push(`${dir}/.gitkeep`);
  }
}

if (!dryRun) {
  fs.writeFileSync(
    path.join(target, MARKER),
    `${JSON.stringify({ engine: "cutout-story-engine", version: VERSION, fingerprint, updatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

const list = (items) => items.map((item) => `  - ${item}`).join("\n");
console.log(`[init] Cutout Story Engine ${VERSION} -> ${target}${dryRun ? " (dry run, nothing written)" : ""}`);
if (previous) console.log(`[init] Previously installed: ${previous.version}${previous.fingerprint ? ` (${previous.fingerprint})` : ""}, now ${fingerprint}.`);
console.log(`[init] Created ${report.created.length}, updated ${report.updated.length}, unchanged ${report.unchanged}, kept ${report.kept.length}.`);
if (report.updated.length) console.log(`[init] Replaced (old copies in .engine-backup/${stamp}/):\n${list(report.updated)}`);
if (report.kept.length) {
  console.log(`[init] These engine files differ from version ${VERSION} and were left as they are:\n${list(report.kept)}`);
  console.log("[init] Run again with --upgrade to replace them (old copies are backed up).");
}
const changed = [...report.created, ...report.updated];
if (!previous) console.log("[init] Next: npm install, then continue the setup workflow.");
else if (changed.some((name) => name.startsWith("package"))) console.log("[init] Dependencies changed: run npm install.");
