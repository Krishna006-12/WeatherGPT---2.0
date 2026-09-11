import { describe, it, expect, vi } from "vitest";
import { AgricultureService } from "@/services/agriculture/agriculture-service";
import type { WeatherService } from "@/services/weather/weather-service";
import type { WeatherSnapshot } from "@/types/weather";
import { AppError } from "@/lib/errors";

const mockSnapshot: WeatherSnapshot = {
  location: {
    name: "Kanpur, India",
    region: "Uttar Pradesh",
    country: "India",
    coordinates: { latitude: 26.46, longitude: 80.34 },
    timezone: "Asia/Kolkata",
  },
  observedAt: "2026-09-11T12:00:00.000Z",
  current: {
    temperature: 28,
    feelsLike: 29,
    humidity: 60,
    precipitation: 0,
    windSpeed: 10,
    windDirection: 180,
    pressure: 1012,
    cloudCover: 10,
    condition: "clear",
    observedAt: "2026-09-11T12:00:00.000Z",
  },
  hourly: [],
  daily: [
    {
      date: "2026-09-11",
      temperatureHigh: 31,
      temperatureLow: 20,
      condition: "clear",
      precipitationProbability: 10,
      precipitationSum: 0,
      sunrise: "2026-09-11T06:00:00.000Z",
      sunset: "2026-09-11T18:00:00.000Z",
    },
  ],
  alerts: [],
  provenance: [
    {
      provider: "open-meteo",
      retrievedAt: "2026-09-11T12:00:00.000Z",
      dataType: "current",
    },
  ],
};

describe("AgricultureService", () => {
  it("successfully evaluates crop risk by consuming WeatherService", async () => {
    const mockWeatherService = {
      getWeather: vi.fn().mockResolvedValue({
        success: true,
        data: mockSnapshot,
      }),
    } as unknown as WeatherService;

    const service = new AgricultureService({ weatherService: mockWeatherService });
    const result = await service.assessCropRisk(
      { latitude: 26.46, longitude: 80.34 },
      "wheat",
      "Asia/Kolkata"
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crop).toBe("wheat");
      expect(result.data.cropDisplayName).toBe("Wheat");
      expect(result.data.overallRiskLevel).toBe("low");
      expect(result.data.activities.irrigation.status).toBe("favorable");
      expect(result.data.activities.spraying.status).toBe("favorable");
      expect(result.data.location.name).toBe("Kanpur, India");
    }
    expect(mockWeatherService.getWeather).toHaveBeenCalledWith(
      { latitude: 26.46, longitude: 80.34 },
      "Asia/Kolkata"
    );
  });

  it("handles WeatherService error gracefully", async () => {
    const mockWeatherService = {
      getWeather: vi.fn().mockResolvedValue({
        success: false,
        error: new AppError("WEATHER_PROVIDER_UNAVAILABLE", "Failed to connect", 502),
      }),
    } as unknown as WeatherService;

    const service = new AgricultureService({ weatherService: mockWeatherService });
    const result = await service.assessCropRisk(
      { latitude: 26.46, longitude: 80.34 },
      "potato"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to connect");
      expect((result.error as AppError).code).toBe("WEATHER_PROVIDER_UNAVAILABLE");
    }
  });

  it("handles unexpected evaluation error gracefully", async () => {
    const corruptedSnapshot = { ...mockSnapshot, current: null as unknown as WeatherSnapshot["current"] };
    const mockWeatherService = {
      getWeather: vi.fn().mockResolvedValue({
        success: true,
        data: corruptedSnapshot,
      }),
    } as unknown as WeatherService;

    const service = new AgricultureService({ weatherService: mockWeatherService });
    const result = await service.assessCropRisk(
      { latitude: 26.46, longitude: 80.34 },
      "wheat"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(AppError);
      expect((result.error as AppError).code).toBe("UNKNOWN_ERROR");
      expect((result.error as AppError).statusCode).toBe(500);
    }
  });
});
