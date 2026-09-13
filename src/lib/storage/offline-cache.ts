/**
 * Offline Cache Tier — WeatherGPT 2.0.
 *
 * Provides client-side resilience for rural areas with intermittent connectivity.
 * Caches the latest retrieved weather snapshot, risk report, and agricultural
 * assessment, timestamped and queryable when navigator.onLine is false.
 */

import type { WeatherSnapshot } from "@/types/weather";

export const STORAGE_KEY_OFFLINE_WEATHER = "weathergpt_offline_weather_cache";

export interface OfflineCacheEntry<T> {
  data: T;
  cachedAt: string;
  locationKey: string;
}

export function cacheWeatherSnapshot(
  locationKey: string,
  weather: WeatherSnapshot,
  storage: Storage | null = getStorage()
): void {
  if (!storage || !weather) return;
  try {
    const entry: OfflineCacheEntry<WeatherSnapshot> = {
      data: weather,
      cachedAt: new Date().toISOString(),
      locationKey,
    };
    storage.setItem(`${STORAGE_KEY_OFFLINE_WEATHER}_${locationKey}`, JSON.stringify(entry));
  } catch {
    // Quota fallback
  }
}

export function getCachedWeatherSnapshot(
  locationKey: string,
  storage: Storage | null = getStorage()
): OfflineCacheEntry<WeatherSnapshot> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${STORAGE_KEY_OFFLINE_WEATHER}_${locationKey}`);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineCacheEntry<WeatherSnapshot>;
  } catch {
    return null;
  }
}

export function isDeviceOnline(): boolean {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    return navigator.onLine ?? true;
  }
  return true;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}
