import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import { IntentRouter } from "@/services/ai/intent-router";
import { ContextBuilder } from "@/services/ai/context-builder";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherProvider } from "@/services/weather/weather-provider";
import { LocationService } from "@/services/location/location-service";
import { WeatherToolRegistry } from "@/services/ai/tools/tool-registry";
import { GetModelConsensusTool } from "@/services/ai/tools/get-model-consensus-tool";
import { NwpService } from "@/services/nwp/nwp-service";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import { globalImpactEngine } from "@/services/impact/impact-engine";
import type { WeatherSnapshot } from "@/types/weather";
import type { ModelConsensusReport } from "@/types/nwp";

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
      temperature: 34,
      feelsLike: 36,
      humidity: 50,
      precipitation: 0,
      precipitationProbability: 10,
      windSpeed: 15,
      windDirection: 120,
      pressure: 1010,
      cloudCover: 20,
      condition: "partly-cloudy",
      observedAt: "2026-09-13T06:00:00Z",
    },
    hourly: [],
    daily: [
      {
        date: "2026-09-14",
        temperatureHigh: 35,
        temperatureLow: 25,
        condition: "partly-cloudy",
        precipitationProbability: 15,
        precipitationSum: 0,
        windSpeed: 16,
        sunrise: "2026-09-14T00:30:00Z",
        sunset: "2026-09-14T12:30:00Z",
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

const mockConsensusReport: ModelConsensusReport = {
  location: {
    name: "New Delhi",
    region: "Delhi",
    country: "India",
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    timezone: "Asia/Kolkata",
  },
  modelsUsed: ["ecmwf", "gfs", "icon"],
  modelDetails: [
    {
      modelId: "ecmwf",
      name: "ECMWF IFS",
      organization: "European Centre for Medium-Range Weather Forecasts",
      resolutionKm: 9,
    },
    {
      modelId: "gfs",
      name: "NOAA GFS",
      organization: "National Oceanic and Atmospheric Administration",
      resolutionKm: 13,
    },
    {
      modelId: "icon",
      name: "DWD ICON",
      organization: "Deutscher Wetterdienst",
      resolutionKm: 13,
    },
  ],
  consensusDays: [
    {
      date: "2026-09-13",
      temperatureHigh: {
        metric: "High Temperature",
        unit: "°C",
        mean: 34.8,
        median: 35.0,
        min: 34.2,
        max: 35.3,
        spread: 1.1,
        standardDeviation: 0.46,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 34.8, gfs: 35.3, icon: 34.2 },
      },
      temperatureLow: {
        metric: "Low Temperature",
        unit: "°C",
        mean: 24.5,
        median: 24.5,
        min: 24.0,
        max: 25.0,
        spread: 1.0,
        standardDeviation: 0.41,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 24.5, gfs: 25.0, icon: 24.0 },
      },
      precipitationSum: {
        metric: "Precipitation Sum",
        unit: "mm",
        mean: 0.0,
        median: 0.0,
        min: 0.0,
        max: 0.0,
        spread: 0.0,
        standardDeviation: 0.0,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 0.0, gfs: 0.0, icon: 0.0 },
      },
      windSpeedMax: {
        metric: "Wind Speed Max",
        unit: "km/h",
        mean: 16.0,
        median: 16.0,
        min: 15.0,
        max: 17.0,
        spread: 2.0,
        standardDeviation: 0.82,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 16.0, gfs: 17.0, icon: 15.0 },
      },
      consensusCondition: "partly-cloudy",
      conditionAgreementPercent: 100,
      agreementScore: 94,
      confidence: "high",
      divergentModels: [],
      modelConditions: {
        ecmwf: "partly-cloudy",
        gfs: "partly-cloudy",
        icon: "partly-cloudy",
      },
    },
  ],
  overallAgreementScore: 94,
  overallConfidence: "high",
  summaryNotes: "High multi-model agreement across ECMWF, GFS, and ICON on dry synoptic patterns.",
  evaluatedAt: "2026-09-13T06:00:00.000Z",
  provenance: [
    {
      provider: "open-meteo-nwp",
      retrievedAt: "2026-09-13T06:00:00.000Z",
      dataType: "forecast",
    },
  ],
};

describe("AI Copilot — NWP Model Consensus Integration", () => {
  let mockNwpService: NwpService;
  let mockWeatherProvider: WeatherProvider;
  let weatherService: WeatherService;
  let locationService: LocationService;
  let toolRegistry: WeatherToolRegistry;
  let intentRouter: IntentRouter;
  let contextBuilder: ContextBuilder;
  let aiProvider: MockAIProvider;
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockNwpService = new NwpService();
    vi.spyOn(mockNwpService, "getConsensusReport").mockResolvedValue({
      success: true,
      data: mockConsensusReport,
    });

    mockWeatherProvider = {
      name: "MockOpenMeteo",
      getWeather: vi.fn().mockResolvedValue({
        success: true,
        data: createMockWeatherSnapshot("Delhi", 28.6139, 77.209),
      }),
    };

    weatherService = new WeatherService(mockWeatherProvider);
    const mockLocationService = {
      search: vi.fn().mockImplementation(async (query: string, _count: number = 5) => {
        const q = query.toLowerCase();
        if (q.includes("delhi")) {
          return {
            success: true,
            data: [
              {
                id: 12345,
                name: "Delhi",
                displayName: "Delhi, India",
                latitude: 28.6139,
                longitude: 77.209,
                country: "India",
                region: "Delhi",
                timezone: "Asia/Kolkata",
              },
            ],
          };
        }
        return { success: true, data: [] };
      }),
    } as unknown as LocationService;

    locationService = mockLocationService;
    toolRegistry = new WeatherToolRegistry({
      locationService,
      weatherService,
      eventRepository: globalEventRepository,
      impactEngine: globalImpactEngine,
      nwpService: mockNwpService,
    });

    intentRouter = new IntentRouter();
    contextBuilder = new ContextBuilder();
    aiProvider = new MockAIProvider();

    orchestrator = new AIOrchestrator({
      aiProvider,
      intentRouter,
      contextBuilder,
      weatherService,
      locationService,
      toolRegistry,
    });
  });

  describe("1. GetModelConsensusTool Direct Execution", () => {
    it("executes get_model_consensus tool and returns structured report", async () => {
      const tool = new GetModelConsensusTool({ nwpService: mockNwpService });
      expect(tool.name).toBe("get_model_consensus");

      const result = await tool.execute({
        coordinates: {
          latitude: 28.6139,
          longitude: 77.209,
        },
        timezone: "Asia/Kolkata",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBeDefined();
      expect(result.data.overallConfidence).toBe("high");
      expect(result.data.overallAgreementScore).toBe(94);
      expect(result.data.modelsUsed).toEqual(["ecmwf", "gfs", "icon"]);
    });
  });

  describe("2. IntentRouter Multi-Model Consensus Queries", () => {
    it("routes English confidence and consensus queries correctly", () => {
      const queries = [
        "How confident is this forecast?",
        "What is the model consensus for Delhi?",
        "Do ECMWF and GFS agree on rain?",
        "Compare ECMWF and GFS for this week",
        "Which weather models agree?",
        "Is there high forecast agreement?",
      ];

      for (const query of queries) {
        const classification = intentRouter.classify(query);
        expect(classification.isConsensusQuery).toBe(true);
        expect(classification.intents).toContain("consensus");
      }
    });

    it("routes Hindi and Hinglish model consensus queries correctly", () => {
      const hindiQueries = [
        "Forecast kitna accurate hai?",
        "Kya models me consensus hai?",
        "Kitna sure hai forecast?",
        "ECMWF aur GFS me kya farak hai?",
        "Forecast confidence kya hai?",
      ];

      for (const query of hindiQueries) {
        const classification = intentRouter.classify(query);
        expect(classification.isConsensusQuery).toBe(true);
      }
    });

    it("does NOT trigger consensus for general weather, risk, or agriculture queries", () => {
      const nonConsensusQueries = [
        "What is the temperature in Delhi today?",
        "Will it rain tomorrow?",
        "Is there any flood risk right now?",
        "Give me Kharif crop advisory for wheat",
        "Can I go for an outdoor run?",
      ];

      for (const query of nonConsensusQueries) {
        const classification = intentRouter.classify(query);
        expect(classification.isConsensusQuery).toBe(false);
      }
    });
  });

  describe("3. Orchestrator End-to-End Execution with Grounded Context", () => {
    it("triggers get_model_consensus tool, injects context, and returns modelConsensus payload", async () => {
      aiProvider.setOptions({
        customResponse:
          "Based on multi-model NWP analysis from ECMWF IFS, NOAA GFS, and DWD ICON, forecast confidence is HIGH with a 94% agreement score. All three models predict maximum temperatures near 35°C with a tight 1.1°C spread and zero precipitation.",
      });

      const response = await orchestrator.processQuery({
        message: "How confident is the forecast for Delhi?",
      });

      expect(response.success).toBe(true);
      if (!response.success) return;

      expect(response.data.answer).toContain("94% agreement score");
      expect(response.data.modelConsensus).toBeDefined();
      expect(response.data.modelConsensus?.overallConfidence).toBe("high");
      expect(response.data.modelConsensus?.overallAgreementScore).toBe(94);
      expect(response.data.metadata?.modelConsensus).toBeDefined();
    });

    it("uses deterministic fallback with consensus details when AI provider fails", async () => {
      // Force AI provider failure
      aiProvider.setOptions({ simulateError: "unavailable" });

      const response = await orchestrator.processQuery({
        message: "How reliable is the weather forecast for Delhi?",
      });

      expect(response.success).toBe(true);
      if (!response.success) return;

      // Response generated via deterministic fallback
      expect(response.data.answer).toContain("NWP Model Consensus");
      expect(response.data.answer).toContain("HIGH");
      expect(response.data.answer).toContain("94%");
      expect(response.data.modelConsensus).toBeDefined();
      expect(response.data.modelConsensus?.overallConfidence).toBe("high");
    });
  });
});
