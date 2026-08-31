import { describe, it, expect, vi } from "vitest";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherProvider } from "@/services/weather/weather-provider";
import type { WeatherSnapshot } from "@/types/weather";

function createMockSnapshot(): WeatherSnapshot {
  return {
    location: {
      name: "Delhi",
      region: "Delhi",
      country: "India",
      coordinates: { latitude: 28.6139, longitude: 77.209 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2024-01-15T10:00:00Z",
    current: {
      temperature: 18,
      feelsLike: 16,
      humidity: 55,
      precipitation: 0,
      windSpeed: 8,
      windDirection: 180,
      pressure: 1015,
      visibility: 8000,
      uvIndex: 4,
      cloudCover: 0,
      condition: "clear",
      description: "Clear sky",
      observedAt: "2024-01-15T10:00:00Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "mock-provider",
        retrievedAt: "2024-01-15T10:00:00Z",
        timezone: "Asia/Kolkata",
      },
    ],
  };
}

function createMockProvider(
  data: WeatherSnapshot | null,
  error?: Error
): WeatherProvider {
  return {
    name: "mock-provider",
    getWeather: error
      ? vi.fn().mockRejectedValue(error)
      : vi.fn().mockResolvedValue(data),
  };
}

describe("WeatherService", () => {
  it("returns validated data from a provider", async () => {
    const mockData = createMockSnapshot();
    const provider = createMockProvider(mockData);
    const service = new WeatherService(provider);

    const result = await service.getWeather({
      latitude: 28.6139,
      longitude: 77.209,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location.name).toBe("Delhi");
      expect(result.data.current.temperature).toBe(18);
    }
  });

  it("caches responses for identical coordinates", async () => {
    const mockData = createMockSnapshot();
    const provider = createMockProvider(mockData);
    const service = new WeatherService(provider);

    const coords = { latitude: 28.6139, longitude: 77.209 };
    await service.getWeather(coords, "Asia/Kolkata");
    await service.getWeather(coords, "Asia/Kolkata");

    expect(provider.getWeather).toHaveBeenCalledTimes(1);
  });

  it("rejects out-of-range coordinates", async () => {
    const mockData = createMockSnapshot();
    const provider = createMockProvider(mockData);
    const service = new WeatherService(provider);

    const result = await service.getWeather({
      latitude: 100,
      longitude: 77.209,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Coordinates out of range");
    }
    expect(provider.getWeather).not.toHaveBeenCalled();
  });

  it("rejects invalid provider output", async () => {
    const invalidData = {
      location: { name: "Test" },
    } as unknown as WeatherSnapshot;

    const provider = createMockProvider(invalidData);
    const service = new WeatherService(provider);

    const result = await service.getWeather({
      latitude: 28.6139,
      longitude: 77.209,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("validation failed");
    }
  });

  it("handles provider errors gracefully", async () => {
    const provider = createMockProvider(
      null,
      new Error("Network timeout")
    );
    const service = new WeatherService(provider);

    const result = await service.getWeather({
      latitude: 28.6139,
      longitude: 77.209,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Network timeout");
    }
  });

  it("calls the provider with coordinates and timezone", async () => {
    const mockData = createMockSnapshot();
    const provider = createMockProvider(mockData);
    const service = new WeatherService(provider);

    const coords = { latitude: 19.076, longitude: 72.8777 };
    await service.getWeather(coords, "Asia/Kolkata");

    expect(provider.getWeather).toHaveBeenCalledWith(coords, "Asia/Kolkata");
  });
});
