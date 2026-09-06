import { describe, it, expect, vi } from "vitest";
import { TemporalResolver } from "@/services/ai/temporal-resolver";
import { SearchLocationTool } from "@/services/ai/tools/search-location-tool";
import { GetWeatherTool } from "@/services/ai/tools/get-weather-tool";
import { GetForecastTool } from "@/services/ai/tools/get-forecast-tool";
import { GetLiveEventsTool } from "@/services/ai/tools/get-live-events-tool";
import { GetEventImpactTool } from "@/services/ai/tools/get-event-impact-tool";
import { GetWeatherRiskTool } from "@/services/ai/tools/get-weather-risk-tool";
import type { WeatherSnapshot } from "@/types/weather";
import type { WeatherEvent, EventLocation } from "@/types/events";
import type { LocationService } from "@/services/location/location-service";
import type { WeatherService } from "@/services/weather/weather-service";
import type { EventRepository } from "@/services/storage/repository-interfaces";
import type { ImpactEngine } from "@/services/impact/impact-engine";

function createMockWeatherSnapshot(): WeatherSnapshot {
  return {
    location: {
      name: "Kanpur",
      region: "Uttar Pradesh",
      country: "India",
      timezone: "Asia/Kolkata",
      coordinates: { latitude: 26.4499, longitude: 80.3319 },
    },
    observedAt: "2026-09-06T12:00:00Z",
    current: {
      temperature: 28,
      feelsLike: 30,
      humidity: 75,
      precipitation: 0.5,
      windSpeed: 15,
      windDirection: 120,
      pressure: 1008,
      visibility: 8000,
      uvIndex: 5,
      cloudCover: 60,
      condition: "partly-cloudy",
      description: "Partly cloudy",
      observedAt: "2026-09-06T12:00:00Z",
    },
    hourly: [
      {
        time: "2026-09-06T12:00:00Z",
        temperature: 28,
        humidity: 75,
        precipitationProbability: 30,
        precipitation: 0.5,
        windSpeed: 10,
        condition: "partly-cloudy",
      },
      {
        time: "2026-09-07T09:00:00Z",
        temperature: 26,
        humidity: 85,
        precipitationProbability: 75,
        precipitation: 4.2,
        windSpeed: 15,
        condition: "rain",
      },
    ],
    daily: [
      {
        date: "2026-09-06",
        temperatureHigh: 32,
        temperatureLow: 24,
        condition: "partly-cloudy",
        precipitationProbability: 35,
        precipitationSum: 1.5,
        sunrise: "2026-09-06T05:45:00Z",
        sunset: "2026-09-06T18:20:00Z",
      },
      {
        date: "2026-09-07",
        temperatureHigh: 29,
        temperatureLow: 22,
        condition: "rain",
        precipitationProbability: 80,
        precipitationSum: 18.5,
        sunrise: "2026-09-07T05:46:00Z",
        sunset: "2026-09-07T18:19:00Z",
      },
    ],
    alerts: [],
    provenance: [{ provider: "Open-Meteo", retrievedAt: "2026-09-06T12:00:00Z" }],
  };
}

describe("TemporalResolver", () => {
  const resolver = new TemporalResolver();
  const refDate = new Date("2026-09-06T14:30:00Z"); // 20:00 IST

  it("resolves current / now", () => {
    const res = resolver.resolve("weather right now", "Asia/Kolkata", refDate);
    expect(res.target).toBe("current");
    expect(res.targetDate).toBe("2026-09-06");
    expect(res.isFuture).toBe(false);
  });

  it("resolves today", () => {
    const res = resolver.resolve("will it rain today?", "Asia/Kolkata", refDate);
    expect(res.target).toBe("today");
    expect(res.targetDate).toBe("2026-09-06");
    expect(res.isFuture).toBe(false);
  });

  it("resolves tonight", () => {
    const res = resolver.resolve("weather tonight", "Asia/Kolkata", refDate);
    expect(res.target).toBe("tonight");
    expect(res.targetDate).toBe("2026-09-06");
    expect(res.hourStart).toBe(18);
    expect(res.hourEnd).toBe(23);
  });

  it("resolves tomorrow and sub-windows with timezone calculation", () => {
    const tomorrow = resolver.resolve("weather tomorrow", "Asia/Kolkata", refDate);
    expect(tomorrow.target).toBe("tomorrow");
    expect(tomorrow.targetDate).toBe("2026-09-07");
    expect(tomorrow.isFuture).toBe(true);

    const morning = resolver.resolve("rain tomorrow morning", "Asia/Kolkata", refDate);
    expect(morning.target).toBe("tomorrow_morning");
    expect(morning.targetDate).toBe("2026-09-07");
    expect(morning.hourStart).toBe(6);
    expect(morning.hourEnd).toBe(12);

    const afternoon = resolver.resolve("temperature tomorrow afternoon in Delhi", "Asia/Kolkata", refDate);
    expect(afternoon.target).toBe("tomorrow_afternoon");
    expect(afternoon.targetDate).toBe("2026-09-07");
    expect(afternoon.hourStart).toBe(12);
    expect(afternoon.hourEnd).toBe(18);

    const evening = resolver.resolve("tomorrow evening forecast", "Asia/Kolkata", refDate);
    expect(evening.target).toBe("tomorrow_evening");
    expect(evening.targetDate).toBe("2026-09-07");
    expect(evening.hourStart).toBe(18);
  });

  it("resolves next 24 hours and next 48 hours", () => {
    const res24 = resolver.resolve("forecast for next 24 hours", "Asia/Kolkata", refDate);
    expect(res24.target).toBe("next_24_hours");
    expect(res24.endDate).toBe("2026-09-07");

    const res48 = resolver.resolve("next 48 hours in Kanpur", "Asia/Kolkata", refDate);
    expect(res48.target).toBe("next_48_hours");
    expect(res48.endDate).toBe("2026-09-08");
  });

  it("resolves this week and next week", () => {
    const thisWeek = resolver.resolve("weather this week", "Asia/Kolkata", refDate);
    expect(thisWeek.target).toBe("this_week");

    const nextWeek = resolver.resolve("rain next week", "Asia/Kolkata", refDate);
    expect(nextWeek.target).toBe("next_week");
    expect(nextWeek.targetDate).toBe("2026-09-13");
  });

  it("handles midnight boundaries and differing timezones correctly", () => {
    // 2026-09-06T23:30:00Z is 2026-09-07T05:00 in Asia/Kolkata (+5:30), but 2026-09-06 in UTC
    const boundaryDate = new Date("2026-09-06T23:30:00Z");
    const kolkataRes = resolver.resolve("today", "Asia/Kolkata", boundaryDate);
    expect(kolkataRes.targetDate).toBe("2026-09-07");

    const londonRes = resolver.resolve("today", "Europe/London", boundaryDate);
    expect(londonRes.targetDate).toBe("2026-09-07"); // 00:30 BST

    const nyRes = resolver.resolve("today", "America/New_York", boundaryDate);
    expect(nyRes.targetDate).toBe("2026-09-06"); // 19:30 EDT
  });
});

describe("Internal Weather Tools", () => {
  it("SearchLocationTool: validates inputs and calls location service", async () => {
    const mockLocationService = {
      search: vi.fn().mockResolvedValue({
        success: true,
        data: [{ name: "Nepal", latitude: 28.16, longitude: 84.25, country: "Nepal", timezone: "Asia/Kathmandu" }],
      }),
    };

    const tool = new SearchLocationTool(mockLocationService as unknown as LocationService);
    const res = await tool.execute({ query: "Nepal", count: 1 });
    expect(res.success).toBe(true);
    expect(mockLocationService.search).toHaveBeenCalledWith("Nepal", 1);
  });

  it("GetWeatherTool: validates coordinates and fetches observations", async () => {
    const mockSnapshot = createMockWeatherSnapshot();
    const mockWeatherService = {
      getWeather: vi.fn().mockResolvedValue({ success: true, data: mockSnapshot }),
    };

    const tool = new GetWeatherTool(mockWeatherService as unknown as WeatherService);
    const res = await tool.execute({ coordinates: { latitude: 26.4499, longitude: 80.3319 }, timezone: "Asia/Kolkata" });
    expect(res.success).toBe(true);
    expect(mockWeatherService.getWeather).toHaveBeenCalled();
  });

  it("GetForecastTool: normalizes target date and computes aggregate metrics", async () => {
    const mockSnapshot = createMockWeatherSnapshot();
    const mockWeatherService = {
      getWeather: vi.fn().mockResolvedValue({ success: true, data: mockSnapshot }),
    };

    const tool = new GetForecastTool(mockWeatherService as unknown as WeatherService);
    const res = await tool.execute({
      coordinates: { latitude: 26.4499, longitude: 80.3319 },
      targetDate: "2026-09-07",
      temporalTarget: "tomorrow",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.targetDate).toBe("2026-09-07");
      expect(res.data.temperatureRange?.high).toBe(29);
      expect(res.data.temperatureRange?.low).toBe(22);
      expect(res.data.maxPrecipitationProbability).toBe(80);
      expect(res.data.expectedCondition).toBe("rain");
    }
  });

  it("GetLiveEventsTool: filters events by keyword and location", async () => {
    const sampleEvent: WeatherEvent = {
      id: "evt_1",
      slug: "nepal-flood",
      title: "Nepal Inundation Flood",
      category: "flood",
      hazard: "flood",
      severity: "high",
      status: "active",
      description: "Monsoon river overflow in Bagmati",
      location: { name: "Kathmandu", country: "Nepal", coordinates: { latitude: 27.7, longitude: 85.3 } },
      locations: [],
      affectedRegions: [{ name: "Bagmati", country: "Nepal" }],
      firstSeenAt: "2026-09-01T00:00:00Z",
      lastUpdatedAt: "2026-09-01T00:00:00Z",
      confidence: 0.9,
      sourceArticleIds: [],
      sources: [],
      impacts: [],
      provenance: [{ provider: "test", retrievedAt: "2026-09-01T00:00:00Z" }],
    };

    const mockRepo = {
      findAll: vi.fn().mockResolvedValue([sampleEvent]),
    };

    const tool = new GetLiveEventsTool(mockRepo as unknown as EventRepository);
    const res = await tool.execute({ keyword: "flood", locationName: "Nepal" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.length).toBe(1);
      expect(res.data[0]?.id).toBe("evt_1");
    }
  });

  it("GetEventImpactTool: calls ImpactEngine deterministically", async () => {
    const sampleEvent = { id: "evt_1" } as unknown as WeatherEvent;
    const sampleLocation = { name: "Kanpur", country: "India" } as unknown as EventLocation;
    const mockAssessment = {
      id: "imp_1",
      relevanceStatus: "unlikely",
      impactLevel: "none",
      confidence: 0.85,
      reasons: ["Safe distance"],
      evidence: [],
    };

    const mockEngine = {
      assessImpact: vi.fn().mockReturnValue(mockAssessment),
    };

    const tool = new GetEventImpactTool(mockEngine as unknown as ImpactEngine);
    const res = await tool.execute({ event: sampleEvent, targetLocation: sampleLocation });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.relevanceStatus).toBe("unlikely");
    }
  });

  it("GetWeatherRiskTool: evaluates outdoor work and rain hazards deterministically", async () => {
    const mockSnapshot = createMockWeatherSnapshot();
    const tool = new GetWeatherRiskTool();

    // High rain day: 2026-09-07 has 18.5mm rain and 80% prob
    const resRain = await tool.execute({
      weather: mockSnapshot,
      targetDate: "2026-09-07",
      activityType: "outdoor_work",
    });

    expect(resRain.success).toBe(true);
    if (resRain.success) {
      expect(resRain.data.riskLevel).toBe("high");
      expect(resRain.data.activitySuitability.status).toBe("unfavorable");
      expect(resRain.data.activitySuitability.advisory).toContain("not recommended");
    }

    // Favorable day: 2026-09-06 has 1.5mm and 35% prob
    const resClear = await tool.execute({
      weather: mockSnapshot,
      targetDate: "2026-09-06",
      activityType: "outdoor_work",
    });

    expect(resClear.success).toBe(true);
    if (resClear.success) {
      expect(resClear.data.riskLevel).toBe("low");
      expect(resClear.data.activitySuitability.status).toBe("favorable");
    }
  });
});
