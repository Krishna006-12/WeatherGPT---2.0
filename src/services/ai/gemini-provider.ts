/**
 * Google Gemini AI Provider Adapter.
 *
 * Implements server-side REST integration with Google Gemini Generative Language API.
 * Never exposes API keys to client-side code.
 */

import type { AIProvider, AICompletionOptions } from "./ai-provider";
import { AppError } from "@/lib/errors";

const DEFAULT_MODEL = "gemini-3.6-flash";
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
    const rawDefault = (config.defaultModel || process.env.GEMINI_MODEL || DEFAULT_MODEL)
      .trim()
      .replace(/^["']|["']$/g, "");
    const cleanDefault = rawDefault.startsWith("models/") ? rawDefault.replace(/^models\//, "") : rawDefault;
    this.defaultModel =
      cleanDefault === "gemini-2.5-flash" || cleanDefault === "gemini-2.0-flash" || cleanDefault.startsWith("gemini-1.5")
        ? DEFAULT_MODEL
        : cleanDefault || DEFAULT_MODEL;
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  /**
   * Check if the provider has an active API key configured.
   */
  hasValidKey(): boolean {
    const rawKey = this.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    const key = rawKey?.trim().replace(/^["']|["']$/g, "");
    return typeof key === "string" && key.length > 0;
  }

  /**
   * Execute completion generation with Gemini.
   */
  async generateCompletion(
    prompt: string,
    systemInstruction?: string,
    options: AICompletionOptions = {}
  ): Promise<string> {
    const rawKey = this.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    const key = rawKey?.trim().replace(/^["']|["']$/g, "");

    if (!key || key.length === 0) {
      throw new AppError(
        "AI_PROVIDER_UNAVAILABLE",
        "Gemini API key is not configured. Please set GEMINI_API_KEY in environment.",
        503
      );
    }

    const rawModel = (options.model || process.env.GEMINI_MODEL || this.defaultModel || DEFAULT_MODEL)
      .trim()
      .replace(/^["']|["']$/g, "");
    const cleanModel = rawModel.startsWith("models/") ? rawModel.replace(/^models\//, "") : rawModel;
    const model =
      cleanModel === "gemini-2.5-flash" || cleanModel === "gemini-2.0-flash" || cleanModel.startsWith("gemini-1.5")
        ? DEFAULT_MODEL
        : cleanModel || DEFAULT_MODEL;
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
        console.error(`[GeminiProvider] API request to ${model} failed (status ${response.status}):`, errorText);
        throw new AppError(
          "AI_PROVIDER_UNAVAILABLE",
          `Gemini API returned status ${response.status}: ${errorText.slice(0, 200)}`,
          502
        );
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];

      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        const finishReason = candidate?.finishReason || "NO_CANDIDATES";
        console.warn(`[GeminiProvider] Candidate missing text. Finish reason: ${finishReason}`);
        throw new AppError(
          "AI_RESPONSE_INVALID",
          `Gemini response did not contain valid text candidates (finishReason: ${finishReason})`,
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
