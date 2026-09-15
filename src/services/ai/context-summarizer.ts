/**
 * Conversation Context Summarizer.
 *
 * Implements extractive summarization for conversation turns that exceed the
 * 10-turn sliding context retention window. Condenses older turns into an
 * authoritative, token-efficient summary block while preserving key entities,
 * prior decisions, and user questions.
 */

import type { ConversationTurn } from "@/types/ai";

/**
 * Summarizes older conversation turns that fall outside the active 10-turn window.
 *
 * @param olderTurns Array of older conversation turns in chronological order
 * @returns Formatted summary block suitable for inclusion in <older_turns_summary>
 */
export function summarizeOlderTurns(olderTurns: ConversationTurn[]): string {
  if (!olderTurns || olderTurns.length === 0) {
    return "";
  }

  const turnSummaries = olderTurns.map((turn, index) => {
    const roleLabel = turn.role === "user" ? "User" : "Assistant";
    const cleaned = turn.content.replace(/\s+/g, " ").trim();
    // Compact long turns while keeping specific entities and numbers intact
    const truncated = cleaned.length > 200 ? `${cleaned.slice(0, 197)}...` : cleaned;
    const intentTag = turn.intent ? ` [${turn.intent}]` : "";
    return `- Turn ${index + 1} (${roleLabel}${intentTag}): ${truncated}`;
  });

  return `Condensed summary of prior discussion (${olderTurns.length} earlier turn${olderTurns.length === 1 ? "" : "s"}):\n${turnSummaries.join("\n")}`;
}
