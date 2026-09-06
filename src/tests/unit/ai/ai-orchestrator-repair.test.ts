import { describe, it, expect, vi } from "vitest";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { GeminiProvider } from "@/services/ai/gemini-provider";
import type { AIProvider } from "@/services/ai/ai-provider";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherProvider } from "@/services/weather/weather-provider";
import type { WeatherSnapshot } from "@/types/weather";
import { AppError } from "@/lib/errors";

class FailingAIProvider implements AIProvider {
  public readonly name = "failing-gemini";
  public errorToThrow: AppError = new AppError("AI_PROVIDER_UNAVAILABLE", "Gemini API rate limit or key unavailable", 503);

  async generateCompletion(): Promise<string> {
    throw this.errorToThrow;
  }
}

function createMockSnapshot(): WeatherSnapshot {
  return {
    location: {
      name: "Kanpur",
      region: "Uttar Pradesh",
      country: "India",
      coordinates: { latitude: 26.465, longitude: 80.349 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-06T10:00:00Z",
    current: {
      temperature: 28,
      feelsLike: 30,
      humidity: 65,
      precipitation: 0,
      windSpeed: 10,
      windDirection: 90,
      pressure: 1012,
      visibility: 8000,
      uvIndex: 5,
      cloudCover: 10,
      condition: "clear",
      description: "Clear sky",
      observedAt: "2026-09-06T10:00:00Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "mock-provider",
        retrievedAt: "2026-09-06T10:00:00Z",
        timezone: "Asia/Kolkata",
      },
    ],
  };
}

const mockWeatherProvider: WeatherProvider = {
  name: "mock-provider",
  getWeather: vi.fn().mockResolvedValue(createMockSnapshot()),
};

describe("AI Orchestrator Production Repair & Greeting Handling", () => {
  it("handles greeting queries ('Hlo', 'hello') gracefully with location weather during fallback", async () => {
    const failingProvider = new FailingAIProvider();
    const weatherService = new WeatherService(mockWeatherProvider);
    const orchestrator = new AIOrchestrator({ aiProvider: failingProvider, weatherService });

    const result = await orchestrator.processQuery({
      message: "Hlo",
      location: {
        name: "Kanpur",
        city: "Kanpur",
        country: "India",
        lat: 26.465,
        lon: 80.349,
        timezone: "Asia/Kolkata",
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.model).toBe("deterministic-fallback");
    expect(result.data.metadata?.isFallback).toBe(true);
    expect(result.data.metadata?.fallbackReason).toContain("Gemini API rate limit or key unavailable");
    expect(result.data.answer).toMatch(/Hello! I am WeatherGPT Copilot/i);
    expect(result.data.answer).toMatch(/Kanpur/i);
  });

  it("handles greeting without location gracefully", async () => {
    const failingProvider = new FailingAIProvider();
    const orchestrator = new AIOrchestrator({ aiProvider: failingProvider });

    const result = await orchestrator.processQuery({
      message: "hello",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.model).toBe("deterministic-fallback");
    expect(result.data.answer).toContain("Hello! I am WeatherGPT Copilot");
  });

  it("triggers deterministic fallback when provider throws AI_RESPONSE_INVALID", async () => {
    const failingProvider = new FailingAIProvider();
    failingProvider.errorToThrow = new AppError("AI_RESPONSE_INVALID", "Empty candidate response", 422);
    const orchestrator = new AIOrchestrator({ aiProvider: failingProvider });

    const result = await orchestrator.processQuery({
      message: "What is the weather in Delhi?",
      location: { name: "Delhi", lat: 28.6139, lon: 77.209 },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.model).toBe("deterministic-fallback");
    expect(result.data.metadata?.isFallback).toBe(true);
    expect(result.data.metadata?.fallbackReason).toContain("Empty candidate response");
  });
});

describe("GeminiProvider Configuration Sanitization", () => {
  it("sanitizes quotes, spaces, and models/ prefix from configured model", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: "Sanitized test response" }) }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new GeminiProvider({
      apiKey: '  "AIzaSyFakeKeyWithQuotes"  ',
      defaultModel: " 'models/gemini-3.6-flash' ",
    });

    expect(provider.hasValidKey()).toBe(true);

    await provider.generateCompletion("Test prompt");

    expect(fetchSpy).toHaveBeenCalled();
    const requestUrl = (fetchSpy.mock.calls[0]?.[0] || "") as string;
    expect(requestUrl).toContain("/models/gemini-3.6-flash:generateContent");
    expect(requestUrl).not.toContain("models/models/");
    expect(requestUrl).toContain("key=AIzaSyFakeKeyWithQuotes");

    vi.unstubAllGlobals();
  });

  it("automatically migrates obsolete gemini-2.5-flash model override to gemini-3.6-flash", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: "Migrated test response" }) }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new GeminiProvider({
      apiKey: "test-key",
      defaultModel: "gemini-2.5-flash",
    });

    await provider.generateCompletion("Test prompt");

    expect(fetchSpy).toHaveBeenCalled();
    const requestUrl = (fetchSpy.mock.calls[0]?.[0] || "") as string;
    expect(requestUrl).toContain("/models/gemini-3.6-flash:generateContent");

    vi.unstubAllGlobals();
  });
});
