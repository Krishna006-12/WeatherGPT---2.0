/**
 * AI provider adapter interface.
 *
 * LLM providers exist behind this abstraction boundary.
 * AI calls must never be placed directly inside React components.
 *
 * This is the contract only — no implementation in Phase 1.
 */

/**
 * Configuration for an AI provider adapter.
 */
export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * A message in a conversation with the AI.
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * The adapter contract that every AI provider must implement.
 */
export interface AIProvider {
  /** Unique identifier for this provider (e.g., 'openai', 'google'). */
  readonly name: string;

  /**
   * Generate a completion given a conversation history.
   * The caller is responsible for building grounded context
   * before calling this method.
   */
  generateCompletion(messages: AIMessage[]): Promise<string>;

  /**
   * Generate a streaming completion.
   * Returns an async iterable of text chunks.
   */
  generateStream(
    messages: AIMessage[]
  ): AsyncIterable<string>;
}
