import { describe, it, expect, beforeEach } from "vitest";
import {
  cacheWeatherSnapshot,
  getCachedWeatherSnapshot,
  STORAGE_KEY_OFFLINE_WEATHER,
} from "@/lib/storage/offline-cache";
import type { WeatherSnapshot } from "@/types/weather";

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("Offline Cache Tier", () => {
  let mockStorage: MockStorage;

  const mockWeather: WeatherSnapshot = {
    location: {
      name: "Kanpur",
      region: "Uttar Pradesh",
      country: "India",
      coordinates: { latitude: 26.465, longitude: 80.349 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-13T12:00:00.000Z",
    current: {
      temperature: 28,
      feelsLike: 29,
      humidity: 60,
      precipitation: 0,
      windSpeed: 10,
      windDirection: 180,
      pressure: 1012,
      uvIndex: 5,
      cloudCover: 10,
      condition: "clear",
      observedAt: "2026-09-13T12:00:00.000Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "open-meteo",
        retrievedAt: "2026-09-13T12:00:00.000Z",
        dataType: "current",
      },
    ],
  };

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it("caches and retrieves offline snapshot by location key", () => {
    expect(getCachedWeatherSnapshot("kanpur_key", mockStorage)).toBeNull();

    cacheWeatherSnapshot("kanpur_key", mockWeather, mockStorage);
    const cached = getCachedWeatherSnapshot("kanpur_key", mockStorage);

    expect(cached).not.toBeNull();
    expect(cached?.locationKey).toBe("kanpur_key");
    expect(cached?.data.current.temperature).toBe(28);
    expect(cached?.cachedAt).toBeDefined();
  });

  it("handles corrupted storage gracefully", () => {
    mockStorage.setItem(`${STORAGE_KEY_OFFLINE_WEATHER}_corrupt_key`, "invalid{json");
    expect(getCachedWeatherSnapshot("corrupt_key", mockStorage)).toBeNull();
  });
});
