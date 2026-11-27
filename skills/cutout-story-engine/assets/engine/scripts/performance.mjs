export function speechRequest(lines, index, voiceId, modelId, languageCode) {
  const line = lines[index];
  // Neighbouring spoken turns are continuity hints, never part of the rendered line.
  const adjacent = (other) => other?.lineType === line.lineType &&
    (line.lineType === "dialogue" || other.speakerId === line.speakerId);
  const before = lines[index - 1];
  const after = lines[index + 1];
  return {
    voiceId,
    body: {
      model_id: modelId, language_code: languageCode,
      text: `${line.tags.map(tag => `[${tag}]`).join(" ")} ${line.text}`,
      voice_settings: line.voiceSettings,
      ...(adjacent(before) ? {previous_text: before.text} : {}),
      ...(adjacent(after) ? {next_text: after.text} : {}),
    },
  };
}

// Use the original-text alignment, not normalized_text (which can spell out numbers).
export function captionCues(alignment, spokenText) {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment ?? {};
  if (!Array.isArray(characters) || characters.length !== starts?.length || characters.length !== ends?.length) {
    throw new Error("Missing character timestamps from ElevenLabs.");
  }
  const text = characters.join("");
  const offset = text.indexOf(spokenText, text.match(/^(?:\s*\[[^\]]+\]\s*)*/)[0].length);
  if (offset < 0) throw new Error("ElevenLabs alignment does not match the clean spoken text.");
  const times = characters.flatMap((c, i) => Array(c.length).fill(i));
  const cues = [];
  for (const match of spokenText.matchAll(/\S+/gu)) {
    const word = match[0].replace(/\.{3,}|\u2026/g, "");
    if (!word) continue;
    const start = starts[times[offset + match.index]];
    const end = ends[times[offset + match.index + match[0].length - 1]];
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || start < 0) throw new Error("Invalid speech alignment.");
    const prev = cues.at(-1);
    if (prev && start - prev.end < 0.24 && prev.text.length + word.length < 29 &&
        prev.text.split(" ").length < 4 && !/[.!?,;:]$/.test(prev.text)) {
      prev.text += ` ${word}`;
      prev.end = end;
    } else cues.push({text:word, start, end});
  }
  return cues;
}

const FPS = 30;
/** Silence kept after a take that overflowed its slot, and the slack above which a slot is tightened. */
export const FIT_PAD = 0.12;
export const FIT_SLACK = 0.35;
const round = (seconds) => Math.round(seconds * FPS) / FPS;

/**
 * Fits a scene to its recorded speech. Every cue that starts at or after the end of a resized slot
 * moves by the same amount, so reactions, sound effects and camera moves keep their spacing.
 */
export function fitScene(scene, spoken, changes = []) {
  const fitted = structuredClone(scene);
  const cues = () => [...fitted.lines, ...(fitted.sfx ?? []), ...(fitted.events ?? [])];
  fitted.lines.forEach((line, index) => {
    // A take that fits is left alone; one that overflows gets a short breath after it, and a slot
    // with more than FIT_SLACK of silence after the take keeps only that breath.
    const take = Math.ceil(spoken[index] * FPS) / FPS;
    let delta = 0;
    if (take > line.durationSec + 1e-9) delta = take + FIT_PAD - line.durationSec;
    else if (line.durationSec - take > FIT_SLACK) delta = -(line.durationSec - take - FIT_PAD);
    delta = round(delta);
    if (!delta) return;
    const end = line.atSec + line.durationSec;
    for (const cue of cues()) if (cue !== line && cue.atSec >= end - 1e-6) cue.atSec = round(Math.max(0, cue.atSec + delta));
    line.durationSec = round(line.durationSec + delta);
    fitted.durationSec = round(Math.max(1, fitted.durationSec + delta));
    changes.push({ scene: scene.id, line: index + 1, text: line.text, seconds: delta });
  });
  // A cue that ran past the old end (for example a camera move) still has to fit inside the scene.
  for (const cue of cues()) fitted.durationSec = Math.max(fitted.durationSec, round(cue.atSec + (cue.durationSec ?? 0)));
  return fitted;
}
