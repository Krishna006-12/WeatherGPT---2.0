import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIOrchestrator } from "@/services/ai/ai-orchestrator";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import { LocationService } from "@/services/location/location-service";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherProvider } from "@/services/weather/weather-provider";
import type { WeatherSnapshot } from "@/types/weather";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import type { WeatherEvent } from "@/types/events";

function createMockWeather(name: string, lat: number, lon: number, country: string = "Global"): WeatherSnapshot {
  return {
    location: {
      name,
      region: "Region",
      country,
      coordinates: { latitude: lat, longitude: lon },
      timezone: "UTC",
    },
    observedAt: "2026-09-06T12:00:00Z",
    current: {
      temperature: 24,
      feelsLike: 25,
      humidity: 60,
      precipitation: 0,
      windSpeed: 12,
      windDirection: 180,
      pressure: 1013,
      visibility: 10000,
      uvIndex: 4,
      cloudCover: 20,
      condition: "clear",
      description: "Clear sky",
      observedAt: "2026-09-06T12:00:00Z",
    },
    hourly: [],
    daily: [
      {
        date: "2026-09-06",
        temperatureHigh: 28,
        temperatureLow: 18,
        condition: "clear",
        precipitationProbability: 10,
        precipitationSum: 0,
        sunrise: "2026-09-06T06:00:00Z",
        sunset: "2026-09-06T18:00:00Z",
      },
    ],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-09-06T12:00:00Z",
      },
    ],
  };
}

describe("Deterministic Query Location Resolution", () => {
  let mockProvider: MockAIProvider;
  let orchestrator: AIOrchestrator;
  let mockLocationService: LocationService;
  let mockWeatherProvider: WeatherProvider;
  let weatherService: WeatherService;

  const KANPUR_DASHBOARD_LOCATION = {
    name: "Kanpur",
    city: "Kanpur",
    region: "Uttar Pradesh",
    country: "India",
    lat: 26.4499,
    lon: 80.3319,
    timezone: "Asia/Kolkata",
  };

  const sampleNepalFlood: WeatherEvent = {
    id: "evt_nepal_test",
    slug: "nepal-flood-test",
    title: "Severe Flooding in Bagmati Province, Nepal",
    category: "flood",
    hazard: "flood",
    severity: "high",
    status: "active",
    description: "Heavy monsoon inundation along Bagmati river basin in Nepal.",
    location: {
      name: "Kathmandu",
      country: "Nepal",
      region: "Bagmati",
      city: "Kathmandu",
      coordinates: { latitude: 27.7172, longitude: 85.324 },
    },
    locations: [{ name: "Kathmandu", country: "Nepal", region: "Bagmati", city: "Kathmandu" }],
    affectedRegions: [{ name: "Bagmati", country: "Nepal" }],
    firstSeenAt: "2026-09-01T10:00:00Z",
    lastUpdatedAt: "2026-09-01T12:00:00Z",
    confidence: 0.9,
    sourceArticleIds: ["art_nepal"],
    sources: [
      {
        name: "Nepal DHM",
        publishedAt: "2026-09-01T10:00:00Z",
        category: "official",
        tier: 1,
      },
    ],
    impacts: [],
    provenance: [
      {
        provider: "Nepal DHM",
        retrievedAt: "2026-09-01T10:00:00Z",
        dataType: "observation",
      },
    ],
  };

  beforeEach(async () => {
    mockProvider = new MockAIProvider();
    mockLocationService = new LocationService();

    // Deterministic geocoding mock: returns actual coordinates for real places, empty for unknown/fictional places
    vi.spyOn(mockLocationService, "search").mockImplementation(async (query: string) => {
      const q = query.trim().toLowerCase();
      if (q === "nepal") {
        return {
          success: true,
          data: [
            {
              id: 1,
              name: "Nepal",
              latitude: 28.0,
              longitude: 84.0,
              country: "Nepal",
              timezone: "Asia/Kathmandu",
              displayName: "Nepal",
            },
          ],
        };
      }
      if (q === "london") {
        return {
          success: true,
          data: [
            {
              id: 2,
              name: "London",
              latitude: 51.5074,
              longitude: -0.1278,
              country: "United Kingdom",
              timezone: "Europe/London",
              displayName: "London, United Kingdom",
            },
          ],
        };
      }
      if (q === "new delhi" || q === "delhi") {
        return {
          success: true,
          data: [
            {
              id: 3,
              name: "New Delhi",
              latitude: 28.6139,
              longitude: 77.209,
              country: "India",
              timezone: "Asia/Kolkata",
              displayName: "New Delhi, India",
            },
          ],
        };
      }
      if (q === "kanpur") {
        return {
          success: true,
          data: [
            {
              id: 4,
              name: "Kanpur",
              latitude: 26.4499,
              longitude: 80.3319,
              country: "India",
              timezone: "Asia/Kolkata",
              displayName: "Kanpur, India",
            },
          ],
        };
      }
      if (q === "india") {
        return {
          success: true,
          data: [
            {
              id: 5,
              name: "India",
              latitude: 20.5937,
              longitude: 78.9629,
              country: "India",
              timezone: "Asia/Kolkata",
              displayName: "India",
            },
          ],
        };
      }
      // Unknown / fictional locations (e.g. Atlantis, Narnia, Nowhere) return empty results
      return { success: true, data: [] };
    });

    mockWeatherProvider = {
      name: "mock-weather-provider",
      getWeather: vi.fn().mockImplementation(async (coords: { latitude: number; longitude: number }) => {
        if (Math.abs(coords.latitude - 28.0) < 0.1 && Math.abs(coords.longitude - 84.0) < 0.1) {
          return createMockWeather("Nepal", 28.0, 84.0, "Nepal");
        }
        if (Math.abs(coords.latitude - 51.5074) < 0.1) {
          return createMockWeather("London", 51.5074, -0.1278, "United Kingdom");
        }
        if (Math.abs(coords.latitude - 28.6139) < 0.1) {
          return createMockWeather("New Delhi", 28.6139, 77.209, "India");
        }
        return createMockWeather("Kanpur", 26.4499, 80.3319, "India");
      }),
    };

    weatherService = new WeatherService(mockWeatherProvider);

    orchestrator = new AIOrchestrator({
      aiProvider: mockProvider,
      locationService: mockLocationService,
      weatherService,
    });

    await globalEventRepository.clear();
    await globalEventRepository.save(sampleNepalFlood);
  });

  // Test Case A: Selected location Kanpur, query: "What is the weather right now?"
  it("Scenario A: Selected location Kanpur with query 'What is the weather right now?' resolves Kanpur", async () => {
    const res = await orchestrator.processQuery({
      message: "What is the weather right now?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("weather");
    expect(res.data.metadata?.locationName).toBe("Kanpur");
    expect(res.data.metadata?.selectedLocationName).toBe("Kanpur");
    expect(res.data.metadata?.queryLocationName).toBeUndefined();
    expect(res.data.citations.some((c) => c.title.includes("Kanpur"))).toBe(true);
    expect(mockWeatherProvider.getWeather).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 26.4499, longitude: 80.3319 }),
      expect.anything()
    );
  });

  // Test Case B: Selected location Kanpur, query: "What is the weather in Nepal?"
  it("Scenario B: Selected location Kanpur with query 'What is the weather in Nepal?' resolves Nepal", async () => {
    const res = await orchestrator.processQuery({
      message: "What is the weather in Nepal?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("weather");
    expect(res.data.groundingStatus).toBe("grounded");
    expect(res.data.metadata?.locationName).toBe("Nepal");
    expect(res.data.metadata?.selectedLocationName).toBe("Kanpur");
    expect(res.data.metadata?.queryLocationName).toBe("Nepal");
    expect(res.data.citations.some((c) => c.title.includes("Nepal"))).toBe(true);
    expect(mockWeatherProvider.getWeather).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 28.0, longitude: 84.0 }),
      "Asia/Kathmandu"
    );
  });

  // Test Case C: Selected location Kanpur, query: "Weather in London"
  it("Scenario C: Selected location Kanpur with query 'Weather in London' resolves London", async () => {
    const res = await orchestrator.processQuery({
      message: "Weather in London",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("weather");
    expect(res.data.metadata?.locationName).toBe("London");
    expect(res.data.metadata?.selectedLocationName).toBe("Kanpur");
    expect(res.data.metadata?.queryLocationName).toBe("London");
    expect(res.data.citations.some((c) => c.title.includes("London"))).toBe(true);
  });

  // Test Case D: Selected location Kanpur, query: "Will it rain today?"
  it("Scenario D: Selected location Kanpur with query 'Will it rain today?' uses selected location Kanpur", async () => {
    const res = await orchestrator.processQuery({
      message: "Will it rain today?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("forecast");
    expect(res.data.metadata?.locationName).toBe("Kanpur");
    expect(res.data.metadata?.selectedLocationName).toBe("Kanpur");
    expect(res.data.metadata?.queryLocationName).toBeUndefined();
  });

  // Test Case E: Selected location Kanpur, query: "What's the weather in New Delhi?"
  it("Scenario E: Selected location Kanpur with query 'What\\'s the weather in New Delhi?' resolves New Delhi", async () => {
    const res = await orchestrator.processQuery({
      message: "What's the weather in New Delhi?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("weather");
    expect(res.data.metadata?.locationName).toBe("New Delhi");
    expect(res.data.metadata?.selectedLocationName).toBe("Kanpur");
    expect(res.data.metadata?.queryLocationName).toBe("New Delhi");
    expect(res.data.citations.some((c) => c.title.includes("New Delhi"))).toBe(true);
  });

  // Test Case F: Unknown location: "What is the weather in Atlantis?"
  it("Scenario F: Unknown location 'What is the weather in Atlantis?' returns insufficient evidence without fabricated weather", async () => {
    const res = await orchestrator.processQuery({
      message: "What is the weather in Atlantis?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    // Clean insufficient evidence response
    expect(res.data.groundingStatus).toBe("insufficient_evidence");
    expect(res.data.metadata?.locationName).toBe("Atlantis");
    expect(res.data.metadata?.queryLocationName).toBe("Atlantis");
    // Absolutely no weather citations fabricated
    expect(res.data.citations.length).toBe(0);
    // WeatherService must NOT have been called for Atlantis
    expect(mockWeatherProvider.getWeather).not.toHaveBeenCalled();
  });

  // Test Case G: Case-insensitive: "weather in nepal"
  it("Scenario G: Case-insensitive 'weather in nepal' resolves Nepal", async () => {
    const res = await orchestrator.processQuery({
      message: "weather in nepal",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("weather");
    expect(res.data.metadata?.locationName).toBe("Nepal");
    expect(mockWeatherProvider.getWeather).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 28.0, longitude: 84.0 }),
      expect.anything()
    );
  });

  // Test Case H: Natural phrasing: "How's the weather over in Nepal today?"
  it("Scenario H: Natural phrasing 'How\\'s the weather over in Nepal today?' resolves Nepal", async () => {
    const res = await orchestrator.processQuery({
      message: "How's the weather over in Nepal today?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("weather");
    expect(res.data.metadata?.locationName).toBe("Nepal");
    expect(mockWeatherProvider.getWeather).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 28.0, longitude: 84.0 }),
      expect.anything()
    );
  });

  // Test Case I: Existing greeting: "Hlo"
  it("Scenario I: Existing greeting 'Hlo' retains successful greeting behavior", async () => {
    const res = await orchestrator.processQuery({
      message: "Hlo",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.answer).toBeDefined();
    expect(res.data.metadata?.selectedLocationName).toBe("Kanpur");
  });

  // Test Case J: Existing weather query: "What is the weather in Kanpur right now?"
  it("Scenario J: Existing weather query 'What is the weather in Kanpur right now?' resolves Kanpur", async () => {
    const res = await orchestrator.processQuery({
      message: "What is the weather in Kanpur right now?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("weather");
    expect(res.data.metadata?.locationName).toBe("Kanpur");
    expect(res.data.metadata?.queryLocationName).toBe("Kanpur");
    expect(mockWeatherProvider.getWeather).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 26.4499, longitude: 80.3319 }),
      expect.anything()
    );
  });

  // Multi-location impact test: "Does the Nepal flood affect India?"
  it("Scenario K: Multi-location impact query 'Does the Nepal flood affect India?' resolves India as impact target", async () => {
    const res = await orchestrator.processQuery({
      message: "Does the Nepal flood affect India?",
      location: KANPUR_DASHBOARD_LOCATION,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.intent).toBe("impact");
    expect(res.data.metadata?.locationName).toBe("India");
    expect(res.data.metadata?.queryLocationName).toBe("India");
    expect(res.data.groundingStatus).toBe("insufficient_evidence");
  });
});
