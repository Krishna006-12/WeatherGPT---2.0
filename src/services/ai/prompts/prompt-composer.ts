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

export type PromptChannel = "chat" | "voice";

export interface BuildSystemPromptOptions {
  /** The classified high-level intent category */
  intent?: string;
  /** Delivery channel: interactive visual chat vs text-to-speech voice */
  channel?: PromptChannel;
  /** Whether verified data contains an active severe or extreme alert */
  hasActiveSevereAlert?: boolean;
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

  if (typeof intentOrOptions === "object" && intentOrOptions !== null) {
    intent = intentOrOptions.intent;
    channel = intentOrOptions.channel || "chat";
    hasActiveSevereAlert = Boolean(intentOrOptions.hasActiveSevereAlert);
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

  // 4. Channel Separation: Voice vs Chat
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
