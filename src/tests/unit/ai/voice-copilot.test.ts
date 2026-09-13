import { describe, it, expect, beforeEach, vi } from "vitest";
import { IntentRouter } from "@/services/ai/intent-router";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import { ContextBuilder } from "@/services/ai/context-builder";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherProvider } from "@/services/weather/weather-provider";
import { LocationService } from "@/services/location/location-service";
import { WeatherToolRegistry } from "@/services/ai/tools/tool-registry";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import { globalImpactEngine } from "@/services/impact/impact-engine";
import type { WeatherSnapshot } from "@/types/weather";

function createMockWeatherSnapshot(name: string, lat: number, lon: number): WeatherSnapshot {
  return {
    location: {
      name,
      region: "Delhi",
      country: "India",
      coordinates: { latitude: lat, longitude: lon },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-13T06:00:00Z",
    current: {
      temperature: 31,
      feelsLike: 33,
      humidity: 55,
      precipitation: 0,
      precipitationProbability: 10,
      windSpeed: 14,
      windDirection: 180,
      pressure: 1012,
      cloudCover: 10,
      condition: "clear",
      description: "clear sky",
      observedAt: "2026-09-13T06:00:00Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-09-13T06:00:00Z",
        dataType: "current",
      },
    ],
  };
}

describe("Phase 12: Voice Assistant & Speech Intelligence Copilot Integration", () => {
  let intentRouter: IntentRouter;
  let orchestrator: AIOrchestrator;
  let mockAiProvider: MockAIProvider;
  let mockWeatherProvider: WeatherProvider;
  let weatherService: WeatherService;
  let locationService: LocationService;

  beforeEach(() => {
    intentRouter = new IntentRouter();
    mockAiProvider = new MockAIProvider();

    mockWeatherProvider = {
      name: "MockOpenMeteo",
      getWeather: vi.fn().mockResolvedValue({
        success: true,
        data: createMockWeatherSnapshot("New Delhi", 28.6139, 77.209),
      }),
    };

    weatherService = new WeatherService(mockWeatherProvider);
    locationService = new LocationService();

    vi.spyOn(locationService, "search").mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          name: "New Delhi",
          region: "Delhi",
          country: "India",
          latitude: 28.6139,
          longitude: 77.209,
          timezone: "Asia/Kolkata",
          displayName: "New Delhi, India",
        },
      ],
    });

    const toolRegistry = new WeatherToolRegistry({
      locationService,
      weatherService,
      eventRepository: globalEventRepository,
      impactEngine: globalImpactEngine,
    });

    orchestrator = new AIOrchestrator({
      aiProvider: mockAiProvider,
      intentRouter,
      contextBuilder: new ContextBuilder(),
      weatherService,
      locationService,
      toolRegistry,
    });
  });

  describe("1. IntentRouter Voice Classification", () => {
    it("classifies English voice briefing requests as isVoiceQuery = true", () => {
      const q1 = intentRouter.classify("Give me a voice briefing for Delhi");
      expect(q1.isVoiceQuery).toBe(true);
      expect(q1.extractedLocation?.toLowerCase()).toContain("delhi");

      const q2 = intentRouter.classify("Audio briefing for Delhi");
      expect(q2.isVoiceQuery).toBe(true);

      const q3 = intentRouter.classify("Read out the weather forecast for Delhi");
      expect(q3.isVoiceQuery).toBe(true);

      const q4 = intentRouter.classify("Speak the weather in Delhi");
      expect(q4.isVoiceQuery).toBe(true);
    });

    it("classifies Hindi / Hinglish voice queries as isVoiceQuery = true", () => {
      const q1 = intentRouter.classify("Delhi ka mausam bolkar bataiye");
      expect(q1.isVoiceQuery).toBe(true);

      const q2 = intentRouter.classify("Delhi mausam sunao");
      expect(q2.isVoiceQuery).toBe(true);

      const q3 = intentRouter.classify("Mausam aawaz mein batao");
      expect(q3.isVoiceQuery).toBe(true);
    });

    it("keeps standard text queries as isVoiceQuery = false", () => {
      const q1 = intentRouter.classify("What is the weather in Delhi?");
      expect(q1.isVoiceQuery).toBe(false);

      const q2 = intentRouter.classify("Will it rain tomorrow?");
      expect(q2.isVoiceQuery).toBe(false);

      const q3 = intentRouter.classify("Can I go running today in Delhi?");
      expect(q3.isVoiceQuery).toBe(false);

      const q4 = intentRouter.classify("Wheat ke liye irrigation karni chahiye?");
      expect(q4.isVoiceQuery).toBe(false);
    });
  });

  describe("2. AIOrchestrator Spoken Briefing Attachment", () => {
    it("attaches voice assistant report when user asks for a voice briefing", async () => {
      mockAiProvider.setResponse(
        JSON.stringify({
          answer: "In New Delhi, it is currently 31°C with clear skies and wind speed at 14 km/h.",
          groundingStatus: "grounded",
          uncertainty: null,
          keyPoints: ["31 degrees Celsius", "Clear conditions"],
        })
      );

      const res = await orchestrator.processQuery({
        message: "Give me a voice briefing for Delhi",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.voice).toBeDefined();
        expect(res.data.metadata?.voice).toBeDefined();
        expect(res.data.voice?.headline).toContain("New Delhi");
        expect(res.data.voice?.spokenScript).toBeDefined();
        expect(res.data.voice?.spokenScript.text).toContain("degrees Celsius");
        expect(res.data.voice?.spokenScript.wordCount).toBeGreaterThan(5);
        expect(res.data.voice?.suggestedVoicePrompts.length).toBeGreaterThan(0);
      }
    });

    it("normalizes markdown and units for natural TTS audio readout", async () => {
      mockAiProvider.setResponse(
        JSON.stringify({
          answer: "**Weather Alert**: High temperature 35°C with 60% humidity and 15 km/h winds.",
          groundingStatus: "grounded",
          uncertainty: null,
          keyPoints: ["Alert"],
        })
      );

      const res = await orchestrator.processQuery({
        message: "Audio briefing for Delhi",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        const spoken = res.data.voice?.spokenScript.cleanedForSpeech || "";
        expect(spoken).not.toContain("**");
        expect(spoken).toContain("35 degrees Celsius");
        expect(spoken).toContain("60 percent");
        expect(spoken).toContain("15 kilometers per hour");
      }
    });

    it("attaches voice report during deterministic fallback if AI provider fails", async () => {
      mockAiProvider.setFailure(new Error("Provider timeout"));

      const res = await orchestrator.processQuery({
        message: "Give me a voice briefing for Delhi",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.model).toBe("deterministic-fallback");
        expect(res.data.voice).toBeDefined();
        expect(res.data.voice?.spokenScript.cleanedForSpeech).toBeDefined();
      }
    });
  });

  describe("3. GetVoiceBriefingTool Execution", () => {
    it("executes get_voice_briefing tool with coordinates and returns report", async () => {
      const tool = new WeatherToolRegistry({
        locationService,
        weatherService,
        eventRepository: globalEventRepository,
        impactEngine: globalImpactEngine,
      }).getVoiceBriefingTool;

      const result = await tool.execute({
        coordinates: { latitude: 28.6139, longitude: 77.209 },
        locationName: "New Delhi",
        language: "en-US",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.headline).toContain("New Delhi");
        expect(result.data.spokenScript.text).toContain("degrees Celsius");
        expect(result.data.spokenScript.estimatedDurationSeconds).toBeGreaterThan(0);
      }
    });

    it("executes get_voice_briefing tool with customText", async () => {
      const tool = new WeatherToolRegistry({
        locationService,
        weatherService,
        eventRepository: globalEventRepository,
        impactEngine: globalImpactEngine,
      }).getVoiceBriefingTool;

      const result = await tool.execute({
        customText: "Expect 28°C and 15 km/h winds in Delhi.",
        locationName: "Delhi",
        language: "en-US",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.spokenScript.cleanedForSpeech).toContain("28 degrees Celsius");
        expect(result.data.spokenScript.cleanedForSpeech).toContain("15 kilometers per hour");
      }
    });

    it("rejects when neither coordinates nor customText are provided", async () => {
      const tool = new WeatherToolRegistry({
        locationService,
        weatherService,
        eventRepository: globalEventRepository,
        impactEngine: globalImpactEngine,
      }).getVoiceBriefingTool;

      const result = await tool.execute({
        locationName: "Delhi",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Either coordinates or customText");
      }
    });
  });
});

