export function speechRequest(line, voiceId, modelId, languageCode) {
  return {
    voiceId,
    body: {
      model_id: modelId, language_code: languageCode,
      text: `${line.tags.map(tag => `[${tag}]`).join(" ")} ${line.text}`,
      voice_settings: line.voiceSettings,
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
