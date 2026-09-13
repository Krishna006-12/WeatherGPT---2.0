/**
 * Zod validation schemas for Phase 12 Voice Assistant & Speech Intelligence.
 */

import { z } from "zod";
import { coordinatesSchema } from "./weather";

export const voiceLanguageSchema = z.enum(["en-US", "hi-IN", "en-IN"]);

export const voicePlaybackStateSchema = z.enum([
  "idle",
  "listening",
  "processing",
  "speaking",
  "paused",
]);

export const voiceBriefingScriptSchema = z.object({
  text: z.string().min(1),
  cleanedForSpeech: z.string().min(1),
  language: voiceLanguageSchema,
  estimatedDurationSeconds: z.number().nonnegative(),
  wordCount: z.number().int().nonnegative(),
});

export const voiceSettingsSchema = z.object({
  rate: z.number().min(0.5).max(2.0).default(1.0),
  pitch: z.number().min(0.5).max(1.5).default(1.0),
  language: voiceLanguageSchema.default("en-US"),
  autoPlay: z.boolean().default(false),
});

export const voiceAssistantReportSchema = z.object({
  id: z.string().min(1),
  location: z.object({
    name: z.string().min(1),
    coordinates: coordinatesSchema.optional(),
  }),
  headline: z.string().min(1),
  spokenScript: voiceBriefingScriptSchema,
  highlights: z.array(z.string()),
  suggestedVoicePrompts: z.array(z.string()),
  generatedAt: z.string().min(1),
});

export const voiceApiRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().optional(),
  language: voiceLanguageSchema.optional(),
  textToSpeak: z.string().optional(),
});
