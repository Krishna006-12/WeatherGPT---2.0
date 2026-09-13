/**
 * Core type definitions for Phase 12 Voice Assistant & Speech Intelligence.
 * Supports Web Speech API, spoken briefings, and natural meteorological vocalization.
 */

import type { Coordinates, ISOTimestamp } from "./common";

/** Supported speech synthesis and recognition locales. */
export type VoiceLanguage = "en-US" | "hi-IN" | "en-IN";

/** Interactive voice assistant playback state. */
export type VoicePlaybackState = "idle" | "listening" | "processing" | "speaking" | "paused";

/** Voice briefing script ready for speech synthesis. */
export interface VoiceBriefingScript {
  text: string;
  cleanedForSpeech: string;
  language: VoiceLanguage;
  estimatedDurationSeconds: number;
  wordCount: number;
}

/** Configuration options for Text-to-Speech playback. */
export interface VoiceSettings {
  rate: number; // 0.8 to 1.4, default 1.0
  pitch: number; // 0.8 to 1.2, default 1.0
  language: VoiceLanguage;
  autoPlay: boolean;
}

/** Structured report returned by VoiceService and /api/voice. */
export interface VoiceAssistantReport {
  id: string;
  location: {
    name: string;
    coordinates?: Coordinates;
  };
  headline: string;
  spokenScript: VoiceBriefingScript;
  highlights: string[];
  suggestedVoicePrompts: string[];
  generatedAt: ISOTimestamp;
}
