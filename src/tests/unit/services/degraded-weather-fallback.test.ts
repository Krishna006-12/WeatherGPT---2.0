import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeatherService } from "@/services/weather/weather-service";
import type { WeatherProvider } from "@/services/weather/weather-provider";
import type { Coordinates } from "@/types/common";
import type { WeatherSnapshot } from "@/types/weather";
import { AppError } from "@/lib/errors";

function createMockSnapshot(lat: number, lon: number): WeatherSnapshot {
  return {
    location: {
      name: "New Delhi",
      region: "Delhi",
      country: "India",
      coordinates: { latitude: lat, longitude: lon },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-17T06:00:00Z",
    current: {
      temperature: 31,
      feelsLike: 33,
      humidity: 55,
      precipitation: 0,
      precipitationProbability: 10,
      windSpeed: 12,
      windDirection: 270,
      pressure: 1010,
      cloudCover: 15,
      condition: "clear",
      observedAt: "2026-09-17T06:00:00Z",
    },
    hourly: [],
    daily: [
      {
        date: "2026-09-17T00:00:00Z",
        temperatureHigh: 34,
        temperatureLow: 24,
        condition: "clear",
        precipitationProbability: 10,
        precipitationSum: 0,
        sunrise: "2026-09-17T00:30:00Z",
        sunset: "2026-09-17T12:30:00Z",
      },
    ],
    alerts: [],
    provenance: [
      {
        provider: "open-meteo",
        retrievedAt: "2026-09-17T06:00:00Z",
      },
    ],
  };
}

describe("Degraded-Mode Fallback & Resilience — WeatherService", () => {
  const coords: Coordinates = { latitude: 28.6139, longitude: 77.209 };
  let mockProvider: WeatherProvider;
  let service: WeatherService;

  beforeEach(() => {
    mockProvider = {
      name: "mock-open-meteo",
      getWeather: vi.fn(),
      getForecast: vi.fn(),
    };
    service = new WeatherService(mockProvider, { cacheTtlMs: 100 });
  });

  it("successfully populates lastKnownGood cache on live fetch", async () => {
    const liveSnapshot = createMockSnapshot(28.61, 77.21);
    vi.mocked(mockProvider.getWeather).mockResolvedValueOnce({
      success: true,
      data: liveSnapshot,
    });

    const res = await service.getWeather(coords);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.isDegraded).toBeFalsy();

    const stored = service.getLastKnownGood(coords);
    expect(stored).toBeDefined();
    expect(stored?.snapshot.location.name).toBe("New Delhi");
  });

  it("recovers and serves stale normalized forecast with degraded indicator when provider throws network error", async () => {
    // 1. Prime the cache with a live snapshot
    const liveSnapshot = createMockSnapshot(28.61, 77.21);
    vi.mocked(mockProvider.getWeather).mockResolvedValueOnce({
      success: true,
      data: liveSnapshot,
    });
    await service.getWeather(coords);

    // 2. Clear short-term time bucket cache to force provider call
    service.clearCache();

    // 3. Simulate provider outage (e.g. upstream network disconnect or 503)
    vi.mocked(mockProvider.getWeather).mockRejectedValueOnce(
      new Error("Network timeout: Open-Meteo API unreachable (ETIMEDOUT)")
    );

    // 4. Request weather during simulated outage
    const res = await service.getWeather(coords);

    // 5. Must NOT fail; must return the last-known-good forecast in degraded mode
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.isDegraded).toBe(true);
    expect(res.data.staleSince).toBeDefined();
    expect(res.data.staleWarning).toContain("Data may be stale, last updated");
    expect(res.data.location.name).toBe("New Delhi");
    expect(res.data.current.temperature).toBe(31);
  });

  it("recovers and serves stale forecast when provider returns structured 502 failure", async () => {
    const liveSnapshot = createMockSnapshot(28.61, 77.21);
    vi.mocked(mockProvider.getWeather).mockResolvedValueOnce({
      success: true,
      data: liveSnapshot,
    });
    await service.getWeather(coords);

    service.clearCache();

    // Provider returns non-throwing error result
    vi.mocked(mockProvider.getWeather).mockResolvedValueOnce({
      success: false,
      error: new Error("Upstream gateway 502 Bad Gateway"),
    });

    const res = await service.getWeather(coords);

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.isDegraded).toBe(true);
    expect(res.data.staleWarning).toBeDefined();
    expect(res.data.current.temperature).toBe(31);
  });

  it("gracefully returns error when provider fails and no cached snapshot exists", async () => {
    service.clearLastKnownGood();

    vi.mocked(mockProvider.getWeather).mockRejectedValueOnce(
      new Error("DNS resolution failed: api.open-meteo.com")
    );

    const res = await service.getWeather(coords);

    expect(res.success).toBe(false);
    if (res.success) return;

    expect((res.error as AppError).code).toBe("WEATHER_PROVIDER_UNAVAILABLE");
  });

  it("getForecast recovers and serves degraded snapshot during forecast provider outage", async () => {
    const liveSnapshot = createMockSnapshot(28.61, 77.21);
    vi.mocked(mockProvider.getForecast!).mockResolvedValueOnce({
      success: true,
      data: liveSnapshot,
    });
    await service.getForecast(coords);

    service.clearCache();

    vi.mocked(mockProvider.getForecast!).mockRejectedValueOnce(
      new Error("Rate limit exceeded 429")
    );

    const res = await service.getForecast(coords);

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.isDegraded).toBe(true);
    expect(res.data.staleWarning).toContain("Data may be stale");
  });
});
