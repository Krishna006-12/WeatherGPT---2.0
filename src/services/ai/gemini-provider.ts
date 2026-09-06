/**
 * Google Gemini AI Provider Adapter.
 *
 * Implements server-side REST integration with Google Gemini Generative Language API.
 * Never exposes API keys to client-side code.
 */

import type { AIProvider, AICompletionOptions } from "./ai-provider";
import { AppError } from "@/lib/errors";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 15000;
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiProviderConfig {
  apiKey?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini";
  private apiKey?: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config: GeminiProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    this.defaultModel = config.defaultModel || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  /**
   * Check if the provider has an active API key configured.
   */
  hasValidKey(): boolean {
    const key = this.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    return typeof key === "string" && key.trim().length > 0;
  }

  /**
   * Execute completion generation with Gemini.
   */
  async generateCompletion(
    prompt: string,
    systemInstruction?: string,
    options: AICompletionOptions = {}
  ): Promise<string> {
    const key = this.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    if (!key || key.trim().length === 0) {
      throw new AppError(
        "AI_PROVIDER_UNAVAILABLE",
        "Gemini API key is not configured. Please set GEMINI_API_KEY in environment.",
        503
      );
    }

    const model = options.model || process.env.GEMINI_MODEL || this.defaultModel;
    const timeout = options.timeoutMs || this.timeoutMs;
    const endpoint = `${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 1024,
        responseMimeType: options.jsonMode !== false ? "application/json" : "text/plain",
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        if (response.status === 429) {
          throw new AppError("AI_RATE_LIMITED", "Gemini API rate limit exceeded", 429);
        }

        const errorText = await response.text().catch(() => "Unknown error");
        throw new AppError(
          "AI_PROVIDER_UNAVAILABLE",
          `Gemini API returned status ${response.status}: ${errorText.slice(0, 200)}`,
          502
        );
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];

      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new AppError(
          "AI_RESPONSE_INVALID",
          "Gemini response did not contain valid text candidates",
          422
        );
      }

      return candidate.content.parts[0].text;
    } catch (err: unknown) {
      clearTimeout(timer);

      if (err instanceof AppError) {
        throw err;
      }

      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError(
          "AI_PROVIDER_UNAVAILABLE",
          `Gemini API request timed out after ${timeout}ms`,
          504
        );
      }

      throw new AppError(
        "AI_PROVIDER_UNAVAILABLE",
        err instanceof Error ? err.message : "Network error contacting Gemini API",
        502
      );
    }
  }
}
