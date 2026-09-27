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

  it("cascades from 503 high-demand model to gemini-3.1-flash-lite successfully", async () => {
    const fetchSpy = vi.fn()
      // First attempt on gemini-3.6-flash returns 503 High Demand
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: { code: 503, message: "This model is currently experiencing high demand." } }),
      })
      // Second attempt on gemini-3.1-flash-lite succeeds with 200
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: "Cascade success from flash-lite" }) }] } }],
        }),
      });
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new GeminiProvider({ apiKey: "test-key", defaultModel: "gemini-3.6-flash" });
    const result = await provider.generateCompletion("Test prompt");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]![0]).toContain("gemini-3.6-flash");
    expect(fetchSpy.mock.calls[1]![0]).toContain("gemini-3.1-flash-lite");
    expect(result).toBe(JSON.stringify({ answer: "Cascade success from flash-lite" }));

    vi.unstubAllGlobals();
  });

  it("handles hyper-specific historical rainfall queries with accurate observation limits in fallback", async () => {
    const orchestrator = new AIOrchestrator({
      aiProvider: new FailingAIProvider(),
      weatherService: new (await import("@/services/weather/weather-service")).WeatherService({
        name: "mock",
        getWeather: async () => ({
          location: { name: "Kanpur", region: "Uttar Pradesh", country: "India", coordinates: { latitude: 26.4499, longitude: 80.3319 } },
          observedAt: new Date().toISOString(),
          current: {
            temperature: 25.4,
            feelsLike: 26,
            humidity: 80,
            precipitation: 0,
            windSpeed: 5,
            windDirection: 90,
            pressure: 1012,
            visibility: 10000,
            uvIndex: 4,
            cloudCover: 20,
            condition: "clear",
            description: "Clear sky",
            observedAt: new Date().toISOString(),
          },
          hourly: [],
          daily: [{ date: "2026-09-26", temperatureHigh: 30, temperatureLow: 22, condition: "clear", precipitationProbability: 10, precipitationSum: 0, sunrise: "06:00", sunset: "18:00" }],
          alerts: [],
          provenance: [{ provider: "Open-Meteo", retrievedAt: new Date().toISOString() }],
        }),
      } as any),
    });

    const result = await orchestrator.processQuery({
      message: "What was the exact rainfall in Kanpur at 3:17 PM yesterday?",
      persona: "farmer",
      location: { name: "Kanpur, Uttar Pradesh, India", lat: 26.4499, lon: 80.3319 },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.metadata?.isFallback).toBe(true);
    // Answer must explain standard observational station limits (hourly vs minute)
    expect(result.data.answer).toContain("hourly accumulations rather than continuous minute-by-minute records");
    // Must NOT have irrelevant generic agronomic advisory tacked on
    expect(result.data.answer).not.toContain("Agronomic Advisory: Favorable conditions for routine field operations");
  });
});

