/**
 * Conditional System Prompt Composer.
 *
 * Assembles the active system prompt dynamically based on the query's intent,
 * delivery channel, and presence of severe weather alerts.
 * Eliminates prompt token bloat while enforcing dev-mode token observability
 * and strict token ceiling limits.
 */

import { CORE_SYSTEM_PROMPT } from "./core-prompt";
import { AGRICULTURE_PROMPT_BLOCK } from "./agriculture-prompt";
import { RISK_PROMPT_BLOCK } from "./risk-prompt";
import { ACTIVITY_PROMPT_BLOCK } from "./activity-prompt";
import { VOICE_TONE_ADDENDUM } from "./voice-addendum";
import { CHAT_FORMATTING_RULES } from "./chat-formatting";
import type { SupportedLanguage } from "@/lib/i18n/translations";
import type { PersonaId } from "@/types/persona";
import { getPersonaProfile } from "@/config/personas";

export type PromptChannel = "chat" | "voice";

export interface BuildSystemPromptOptions {
  /** The classified high-level intent category */
  intent?: string;
  /** Delivery channel: interactive visual chat vs text-to-speech voice */
  channel?: PromptChannel;
  /** Whether verified data contains an active severe or extreme alert */
  hasActiveSevereAlert?: boolean;
  /** Target response language */
  language?: SupportedLanguage;
  /** Active persona profile */
  persona?: PersonaId;
}

/**
 * Hard ceiling for the composed system prompt (in estimated tokens).
 * Ensures WeatherGPT 2.0 stays well within context limits and low-latency budgets.
 */
export const MAX_SYSTEM_PROMPT_TOKENS = 4000;

/**
 * Estimates token count for an arbitrary prompt string.
 * Standard heuristic: ~3.8 characters per token in English prose and prompt instructions.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Composes the dynamic system prompt with conditional domain blocks and channel overrides.
 *
 * Supports both function signatures:
 * - `buildSystemPrompt(options: BuildSystemPromptOptions)`
 * - `buildSystemPrompt(intent?: string, channel?: PromptChannel)`
 */
export function buildSystemPrompt(
  intentOrOptions?: string | BuildSystemPromptOptions,
  channelParam?: PromptChannel
): string {
  let intent: string | undefined;
  let channel: PromptChannel = "chat";
  let hasActiveSevereAlert = false;
  let language: SupportedLanguage | undefined;
  let persona: PersonaId | undefined;

  if (typeof intentOrOptions === "object" && intentOrOptions !== null) {
    intent = intentOrOptions.intent;
    channel = intentOrOptions.channel || "chat";
    hasActiveSevereAlert = Boolean(intentOrOptions.hasActiveSevereAlert);
    language = intentOrOptions.language;
    persona = intentOrOptions.persona;
  } else {
    intent = intentOrOptions;
    channel = channelParam || "chat";
  }

  const sections: string[] = [CORE_SYSTEM_PROMPT];

  // 1. Agriculture Domain Block (ONLY when intent === 'agriculture')
  if (intent === "agriculture") {
    sections.push(AGRICULTURE_PROMPT_BLOCK);
  }

  // 2. Risk Center Domain Block (ONLY when intent === 'risk' or 'weather_event' or severe alert is active)
  if (intent === "risk" || intent === "weather_event" || hasActiveSevereAlert) {
    sections.push(RISK_PROMPT_BLOCK);
  }

  // 3. Activity Suitability Domain Block (ONLY when intent === 'activity' or 'activity_planning')
  if (intent === "activity" || intent === "activity_planning") {
    sections.push(ACTIVITY_PROMPT_BLOCK);
  }

  // 4. Role-Based Persona Addendum (Configuration-driven)
  const personaProfile = getPersonaProfile(persona);
  sections.push(personaProfile.instructionAddendum);

  // 5. Explicit Language Directive (Enforces target response language)
  if (language === "hi") {
    sections.push(
      `// ============================================================
// MANDATORY LANGUAGE DIRECTIVE: HINDI (हिन्दी)
// ============================================================
- You MUST formulate your entire response in clear, natural, and fluent Hindi (Devanagari script: हिन्दी).
- Do NOT respond in English.
- Grounded numbers, temperatures (°C), and metrics remain strictly unchanged, but all descriptive explanations, advisories, and summaries must be presented in Hindi.`
    );
  } else if (language === "pa") {
    sections.push(
      `// ============================================================
// MANDATORY LANGUAGE DIRECTIVE: PUNJABI (ਪੰਜਾਬੀ)
// ============================================================
- You MUST formulate your entire response in clear, natural Punjabi (Gurmukhi script: ਪੰਜਾਬੀ).
- Do NOT respond in English.
- Grounded numbers and metrics remain strictly accurate, but all explanations and advisories must be in Punjabi.`
    );
  } else if (language === "hi-en") {
    sections.push(
      `// ============================================================
// MANDATORY LANGUAGE DIRECTIVE: HINGLISH (Conversational Romanized Hindi-English)
// ============================================================
- You MUST formulate your entire response in natural, genuine conversational Hinglish (the modern Romanized colloquial mix of Hindi and English as texted and spoken in daily life in India).
- Use Roman script (English alphabet). Do NOT use Devanagari script.
- Blend English weather and activity terminology with colloquial Hindi naturally (e.g., "Aaj mausam mostly clear rahega with slight breeze. Afternoon me temperature around 32°C touch kar sakta hai, so hydration ka dhyan rakhein.").
- Keep all numerical measurements, units (°C, km/h, mm, hPa), coordinates, and verified data source names strictly accurate.`
    );
  } else {
    sections.push(
      `// ============================================================
// MANDATORY LANGUAGE DIRECTIVE: ENGLISH
// ============================================================
- You MUST formulate your entire response in clear, natural English.`
    );
  }

  // 6. Channel Separation: Voice vs Chat
  if (channel === "voice") {
    sections.push(VOICE_TONE_ADDENDUM);
  } else {
    sections.push(CHAT_FORMATTING_RULES);
  }

  const assembledPrompt = sections.join("\n\n");
  const estimatedTokens = estimateTokenCount(assembledPrompt);

  // Observable logging in development and test environments
  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[PromptComposer] Assembled system prompt: ${estimatedTokens} estimated tokens (intent=${intent || "general"}, channel=${channel}, severeAlert=${hasActiveSevereAlert})`
    );
  }

  // Fail loudly in dev/test if the prompt exceeds the hard token ceiling
  if (estimatedTokens > MAX_SYSTEM_PROMPT_TOKENS) {
    const errorMsg = `[PromptComposer] Hard token ceiling exceeded! System prompt is ~${estimatedTokens} tokens, exceeding maximum allowed ceiling of ${MAX_SYSTEM_PROMPT_TOKENS} tokens.`;
    if (process.env.NODE_ENV !== "production") {
      throw new Error(errorMsg);
    } else {
      console.error(errorMsg);
    }
  }

  return assembledPrompt;
}
