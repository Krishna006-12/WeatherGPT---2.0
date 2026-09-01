/**
 * AI Provider Adapter Interface.
 *
 * LLM providers exist strictly behind this abstraction boundary.
 * Business logic and React components must never depend directly on vendor SDKs.
 */

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

/**
 * Adapter contract that every AI provider (Gemini, Mock, etc.) must implement.
 */
export interface AIProvider {
  /** Unique identifier for this provider (e.g. 'gemini', 'mock'). */
  readonly name: string;

  /**
   * Generate a completion given a user prompt and optional system instructions.
   */
  generateCompletion(
    prompt: string,
    systemInstruction?: string,
    options?: AICompletionOptions
  ): Promise<string>;
}
