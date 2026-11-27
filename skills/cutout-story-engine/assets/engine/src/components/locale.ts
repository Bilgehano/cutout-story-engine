/**
 * On-screen words the engine draws by itself (sound-effect lettering and chat reactions), per episode
 * language. Keys are ISO 639-1 codes; anything unlisted falls back to English. Add a language by adding
 * one entry; spoken lines never come from here.
 */
export type OnScreenWords = { knock: string; reactions: [string, string, string, string, string, string] };

const WORDS: Record<string, OnScreenWords> = {
  en: { knock: "KNOCK", reactions: ["😂😂😂", "HAHAHA", "sticker 😭", "so awkward", "🤣🤣", "LOL"] },
  de: { knock: "KLOPF", reactions: ["😂😂😂", "HAHAHA", "Sticker 😭", "wie peinlich", "🤣🤣", "LOL"] },
  tr: { knock: "TAK", reactions: ["😂😂😂", "HAHAHA", "çıkartma 😭", "çok rezil", "🤣🤣", "LOL"] },
  es: { knock: "TOC", reactions: ["😂😂😂", "JAJAJA", "sticker 😭", "qué vergüenza", "🤣🤣", "LOL"] },
  fr: { knock: "TOC", reactions: ["😂😂😂", "MDRRR", "sticker 😭", "la honte", "🤣🤣", "LOL"] },
  it: { knock: "TOC", reactions: ["😂😂😂", "AHAHAH", "sticker 😭", "che figuraccia", "🤣🤣", "LOL"] },
  pt: { knock: "TOC", reactions: ["😂😂😂", "KKKKKK", "figurinha 😭", "que vergonha", "🤣🤣", "LOL"] },
  nl: { knock: "KLOP", reactions: ["😂😂😂", "HAHAHA", "sticker 😭", "zo gênant", "🤣🤣", "LOL"] },
  pl: { knock: "PUK", reactions: ["😂😂😂", "HAHAHA", "naklejka 😭", "ale wstyd", "🤣🤣", "LOL"] },
};

export const onScreenWords = (languageCode?: string): OnScreenWords =>
  WORDS[(languageCode ?? "en").slice(0, 2).toLowerCase()] ?? WORDS.en;
