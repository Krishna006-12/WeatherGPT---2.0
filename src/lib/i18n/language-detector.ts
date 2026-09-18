import type { SupportedLanguage } from "./translations";

/**
 * Common Hinglish (Romanized Hindi) vocabulary frequently used in weather,
 * forecast, farming, and conversational queries.
 */
const HINGLISH_WORDS = [
  "mausam", "mosam", "kaisa", "kaisi", "kaise", "kya", "kyu", "kyun",
  "hai", "hain", "ho", "hoga", "hogi", "hoge",
  "kaun", "kon", "kab", "kahan", "kaha", "kidhar",
  "aaj", "kal", "parso", "subah", "dopahar", "shaam", "raat",
  "baarish", "barish", "barsaat", "barsat", "pani",
  "garmi", "thand", "sardi", "dhoop", "hawa", "aandhi", "toofan",
  "batao", "bataiye", "bata", "karein", "karna", "karu", "karoon", "chahiye",
  "mein", "me", "ka", "ki", "ke", "ko", "se",
  "nahi", "nhi", "bohot", "bahut", "jyada", "khet", "kheti", "fasal", "sinchai",
  "taapman", "tapman",
];

const HINGLISH_REGEX = new RegExp(`\\b(${HINGLISH_WORDS.join("|")})\\b`, "i");

/**
 * Lightweight per-message language detection.
 *
 * Precedence:
 * 1. Devanagari script ([\u0900-\u097F]) -> "hi" (Hindi)
 * 2. Gurmukhi script ([\u0A00-\u0A7F]) -> "pa" (Punjabi)
 * 3. Romanized Hinglish vocabulary -> "hi-en" (Hinglish)
 * 4. Fallback to active UI language
 *
 * @param text The user's input query string.
 * @param fallbackLanguage The active UI language from user settings (default: "en").
 * @returns The resolved SupportedLanguage for this specific turn.
 */
export function detectInputLanguage(
  text: string | null | undefined,
  fallbackLanguage: SupportedLanguage = "en"
): SupportedLanguage {
  if (!text || typeof text !== "string") {
    return fallbackLanguage;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return fallbackLanguage;
  }

  // 1. Devanagari script detection
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return "hi";
  }

  // 2. Gurmukhi script detection
  if (/[\u0A00-\u0A7F]/.test(trimmed)) {
    return "pa";
  }

  // 3. Hinglish vocabulary detection (case-insensitive word boundary match)
  if (HINGLISH_REGEX.test(trimmed)) {
    return "hi-en";
  }

  return fallbackLanguage;
}
