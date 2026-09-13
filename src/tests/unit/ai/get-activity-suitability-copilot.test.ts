import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import { IntentRouter } from "@/services/ai/intent-router";
import { ContextBuilder } from "@/services/ai/context-builder";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherProvider } from "@/services/weather/weather-provider";
import { LocationService } from "@/services/location/location-service";
import { WeatherToolRegistry } from "@/services/ai/tools/tool-registry";
import { GetActivitySuitabilityTool } from "@/services/ai/tools/get-activity-suitability-tool";
import { ActivityService } from "@/services/activity/activity-service";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import { globalImpactEngine } from "@/services/impact/impact-engine";
import type { WeatherSnapshot } from "@/types/weather";
import type { ActivitySuitabilityReport } from "@/types/activity";

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
      temperature: 24,
      feelsLike: 24,
      humidity: 50,
      precipitation: 0,
      precipitationProbability: 0,
      windSpeed: 10,
      windDirection: 120,
      pressure: 1012,
      cloudCover: 10,
      condition: "clear",
      observedAt: "2026-09-13T06:00:00Z",
    },
    hourly: Array.from({ length: 24 }, (_, i) => ({
      time: `2026-09-13T${String(i).padStart(2, "0")}:00:00Z`,
      temperature: 22 + Math.sin(i / 4) * 6,
      feelsLike: 22 + Math.sin(i / 4) * 6,
      precipitation: 0,
      precipitationProbability: 5,
      windSpeed: 10,
      condition: "clear",
    })),
    daily: [
      {
        date: "2026-09-13",
        temperatureHigh: 28,
        temperatureLow: 18,
        condition: "clear",
        precipitationProbability: 5,
        precipitationSum: 0,
        windSpeed: 12,
        sunrise: "2026-09-13T00:30:00Z",
        sunset: "2026-09-13T12:30:00Z",
      },
    ],
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

const mockActivityReport: ActivitySuitabilityReport = {
  location: {
    name: "Delhi",
    region: "Delhi",
    country: "India",
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    timezone: "Asia/Kolkata",
  },
  generatedAt: "2026-09-13T06:00:00Z",
  targetDate: "2026-09-13",
  requestedActivity: "running_cycling",
  activities: {
    running_cycling: {
      activity: "running_cycling",
      activityName: "Running, Jogging & Cycling",
      targetDate: "2026-09-13",
      overallScore: 92,
      overallSafetyLevel: "optimal",
      bestWindow: {
        startHour: "06:00",
        endHour: "09:00",
        averageScore: 95,
        safetyLevel: "optimal",
        summary: "Peak favorability between 06:00 and 09:00 (Score: 95/100).",
      },
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal day for Running, Jogging & Cycling. Clear conditions and comfortable temperature.",
      evidenceSummary: "Evaluated 24 hourly periods. Overall score 92/100 (optimal).",
      hourlyWindows: [],
    },
    commute: {
      activity: "commute",
      activityName: "Daily Commute & Local Travel",
      targetDate: "2026-09-13",
      overallScore: 90,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal conditions for commute.",
      evidenceSummary: "Clear roads.",
      hourlyWindows: [],
    },
    travel_road: {
      activity: "travel_road",
      activityName: "Highway & Road Travel",
      targetDate: "2026-09-13",
      overallScore: 90,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal highway conditions.",
      evidenceSummary: "Good visibility.",
      hourlyWindows: [],
    },
    outdoor_work: {
      activity: "outdoor_work",
      activityName: "Outdoor Construction & Field Work",
      targetDate: "2026-09-13",
      overallScore: 88,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal work conditions.",
      evidenceSummary: "Safe thermal index.",
      hourlyWindows: [],
    },
    school_sports: {
      activity: "school_sports",
      activityName: "School Outdoor Sports & Play",
      targetDate: "2026-09-13",
      overallScore: 90,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Safe outdoor play for children.",
      evidenceSummary: "No lightning risk.",
      hourlyWindows: [],
    },
    outdoor_events: {
      activity: "outdoor_events",
      activityName: "Outdoor Gatherings & Events",
      targetDate: "2026-09-13",
      overallScore: 90,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal weather for events.",
      evidenceSummary: "No rain expected.",
      hourlyWindows: [],
    },
  },
  provenance: {
    provider: "open-meteo",
    retrievedAt: "2026-09-13T06:00:00Z",
    dataType: "forecast",
  },
};

describe("Activity Decision Intelligence & Copilot Integration", () => {
  let orchestrator: AIOrchestrator;
  let mockAIProvider: MockAIProvider;
  let intentRouter: IntentRouter;
  let contextBuilder: ContextBuilder;
  let weatherService: WeatherService;
  let activityService: ActivityService;
  let toolRegistry: WeatherToolRegistry;

  beforeEach(() => {
    vi.restoreAllMocks();

    const mockWeatherProvider: WeatherProvider = {
      name: "MockOpenMeteo",
      getWeather: vi.fn().mockImplementation(async (coords) => {
        return createMockWeatherSnapshot("Delhi", coords.latitude, coords.longitude);
      }),
    };

    weatherService = new WeatherService(mockWeatherProvider);
    mockAIProvider = new MockAIProvider();
    intentRouter = new IntentRouter();
    contextBuilder = new ContextBuilder();

    activityService = new ActivityService({ weatherService });
    vi.spyOn(activityService, "assessActivitySuitability").mockResolvedValue({
      success: true,
      data: mockActivityReport,
    });

    const locationService = new LocationService();
    vi.spyOn(locationService, "search").mockImplementation(async (query) => {
      const isDelhi = query.toLowerCase().includes("delhi");
      return {
        success: true,
        data: [
          {
            id: 1,
            name: isDelhi ? "Delhi" : "Agra",
            displayName: isDelhi ? "Delhi, India" : "Agra, India",
            latitude: 28.6139,
            longitude: 77.209,
            country: "India",
            region: "Delhi",
            timezone: "Asia/Kolkata",
          },
        ],
      };
    });

    toolRegistry = new WeatherToolRegistry({
      locationService,
      weatherService,
      eventRepository: globalEventRepository,
      impactEngine: globalImpactEngine,
      activityService,
    });

    orchestrator = new AIOrchestrator({
      aiProvider: mockAIProvider,
      intentRouter,
      contextBuilder,
      weatherService,
      locationService,
      toolRegistry,
    });
  });

  describe("IntentRouter Classification for Activities", () => {
    it("1. classifies running/cycling queries with isActivityQuery=true", () => {
      const res = intentRouter.classify("Can I go running this evening in Delhi?");
      expect(res.isActivityQuery).toBe(true);
      expect(res.intents).toContain("activity");
      expect(res.activityCategory).toBe("running_cycling");
    });

    it("2. classifies highway road travel queries with isActivityQuery=true and activityCategory=travel_road", () => {
      const res = intentRouter.classify("Is road travel safe to Agra today?");
      expect(res.isActivityQuery).toBe(true);
      expect(res.intents).toContain("activity");
      expect(res.activityCategory).toBe("travel_road");
    });

    it("3. classifies outdoor construction queries with activityCategory=outdoor_work", () => {
      const res = intentRouter.classify("Is tomorrow good for outdoor construction in Noida?");
      expect(res.isActivityQuery).toBe(true);
      expect(res.activityCategory).toBe("outdoor_work");
    });

    it("4. classifies school playground sports queries with activityCategory=school_sports", () => {
      const res = intentRouter.classify("Is it safe for kids to play school sports outside this afternoon?");
      expect(res.isActivityQuery).toBe(true);
      expect(res.activityCategory).toBe("school_sports");
    });

    it("5. classifies Hindi / Hinglish running queries accurately", () => {
      const res = intentRouter.classify("Kya aaj shaam ko running safe hai?");
      expect(res.isActivityQuery).toBe(true);
      expect(res.activityCategory).toBe("running_cycling");
    });

    it("6. keeps isActivityQuery=false for general science or standard weather queries", () => {
      const res1 = intentRouter.classify("What causes cyclones?");
      expect(res1.isActivityQuery).toBe(false);

      const res2 = intentRouter.classify("What is the temperature in Delhi?");
      expect(res2.isActivityQuery).toBe(false);
    });
  });

  describe("End-to-End Copilot Execution", () => {
    it("7. executes get_activity_suitability tool and attaches activity report to AIResponse", async () => {
      mockAIProvider.setResponse(
        JSON.stringify({
          answer: "Conditions are optimal for running today in Delhi, especially between 06:00 and 09:00 with calm winds and 22°C.",
          groundingStatus: "grounded",
          keyPoints: ["Optimal safety level", "Score 92/100", "Best window 06:00 - 09:00"],
        })
      );

      const res = await orchestrator.processQuery({
        message: "Can I go running this evening in Delhi?",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.activitySuitability).toBeDefined();
        expect(res.data.activitySuitability?.activities.running_cycling.overallScore).toBe(92);
        expect(res.data.activitySuitability?.activities.running_cycling.bestWindow?.startHour).toBe("06:00");
        expect(res.data.citations.some((c) => c.title.includes("Activity Decision Intelligence"))).toBe(true);
      }
    });

    it("8. falls back deterministically when AI provider fails and preserves activitySuitability", async () => {
      mockAIProvider.setFailure(new Error("AI_PROVIDER_UNAVAILABLE"));

      const res = await orchestrator.processQuery({
        message: "Can I go running in Delhi today?",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.metadata?.isFallback).toBe(true);
        expect(res.data.answer).toContain("Activity Weather Suitability");
        expect(res.data.answer).toContain("OPTIMAL");
        expect(res.data.activitySuitability).toBeDefined();
      }
    });
  });
});
