/**
 * Weather service — the single entry point for weather data.
 *
 * This service accepts a WeatherProvider adapter and validates
 * its output through Zod before returning typed data to consumers.
 * Implements a lightweight in-memory cache to reduce external provider load.
 *
 * Architecture boundary:
 *   UI → API route → WeatherService → WeatherProvider → External API
 *
 * The UI and API routes never call providers directly.
 */

import type { Coordinates, Result } from "@/types/common";
import type { CurrentWeather, WeatherSnapshot } from "@/types/weather";
import { weatherSnapshotSchema } from "@/schemas/weather";
import type {
  WeatherProvider,
  CurrentWeatherQuery,
  ForecastWeatherQuery,
} from "./weather-provider";
import { MemoryCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface WeatherServiceOptions {
  cacheTtlMs?: number;
}

export class WeatherService {
  private provider: WeatherProvider;
  private cache: MemoryCache<WeatherSnapshot>;
  private cacheTtlMs: number;
  private lastKnownGoodSnapshots = new Map<string, { snapshot: WeatherSnapshot; savedAt: number }>();

  constructor(provider: WeatherProvider, options: WeatherServiceOptions = {}) {
    this.provider = provider;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cache = new MemoryCache<WeatherSnapshot>({
      defaultTtlMs: this.cacheTtlMs,
      maxEntries: 100,
    });
  }

  /**
   * Persists the last successfully validated snapshot for coordinate-based degraded fallback.
   */
  private saveLastKnownGood(coordinates: Coordinates, snapshot: WeatherSnapshot): void {
    const key = `${coordinates.latitude.toFixed(2)}_${coordinates.longitude.toFixed(2)}`;
    this.lastKnownGoodSnapshots.set(key, { snapshot, savedAt: Date.now() });
  }

  /**
   * Recovers the last known good snapshot for the given coordinates (exact or nearby spatial proximity).
   */
  getLastKnownGood(coordinates: Coordinates): { snapshot: WeatherSnapshot; savedAt: number } | undefined {
    const key = `${coordinates.latitude.toFixed(2)}_${coordinates.longitude.toFixed(2)}`;
    const exact = this.lastKnownGoodSnapshots.get(key);
    if (exact) return exact;

    // Spatial proximity search (within ~0.5 degree)
    for (const [storedKey, entry] of this.lastKnownGoodSnapshots.entries()) {
      const [latStr, lonStr] = storedKey.split("_");
      const lat = parseFloat(latStr || "0");
      const lon = parseFloat(lonStr || "0");
      if (Math.abs(lat - coordinates.latitude) <= 0.5 && Math.abs(lon - coordinates.longitude) <= 0.5) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Builds an in-memory/edge cache key indexed by spatial coordinates and a time bucket.
   * Prevents hammering rate limits and ensures automatic time-window invalidation.
   */
  private getCacheKey(
    coordinates: Coordinates,
    prefix: string = "weather",
    extra: string = "auto"
  ): string {
    const bucketDuration = this.cacheTtlMs > 0 ? this.cacheTtlMs : DEFAULT_CACHE_TTL_MS;
    const timeBucket = Math.floor(Date.now() / bucketDuration);
    const lat = coordinates.latitude.toFixed(2);
    const lon = coordinates.longitude.toFixed(2);
    return `${prefix}:${lat}_${lon}:${extra}:b${timeBucket}`;
  }

  /**
   * Fetch and validate weather data for the given coordinates and timezone.
   * Provider output is validated through Zod — external data
   * is never trusted directly.
   * If provider fails or is unreachable, serves the last known good cached forecast in degraded mode.
   */
  async getWeather(
    coordinates: Coordinates,
    timezone?: string
  ): Promise<Result<WeatherSnapshot>> {
    // Validate coordinate boundaries
    if (
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      return {
        success: false,
        error: new AppError(
          "INVALID_LOCATION",
          `Coordinates out of range: latitude (${coordinates.latitude}), longitude (${coordinates.longitude})`,
          400
        ),
      };
    }

    const tz = timezone || "auto";
    const cacheKey = this.getCacheKey(coordinates, "weather", tz);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const rawResult = await this.provider.getWeather(coordinates, timezone);

      // Provider may return WeatherSnapshot directly or wrapped in a Result ({ success: true, data: snapshot })
      let candidate: unknown = rawResult;
      if ("success" in rawResult) {
        if (!rawResult.success) {
          // Attempt degraded fallback before returning failure
          const fallback = this.getLastKnownGood(coordinates);
          if (fallback) {
            const degradedSnapshot: WeatherSnapshot = {
              ...fallback.snapshot,
              isDegraded: true,
              staleSince: new Date(fallback.savedAt).toISOString(),
              staleWarning: `Data may be stale, last updated ${new Date(fallback.savedAt).toLocaleTimeString()}`,
            };
            return { success: true, data: degradedSnapshot };
          }

          return {
            success: false,
            error:
              rawResult.error instanceof AppError
                ? rawResult.error
                : new AppError(
                    "WEATHER_PROVIDER_UNAVAILABLE",
                    rawResult.error instanceof Error ? rawResult.error.message : "Weather provider error",
                    502
                  ),
          };
        }
        candidate = rawResult.data;
      } else if (
        typeof rawResult === "object" &&
        rawResult !== null &&
        "data" in rawResult &&
        !("current" in rawResult)
      ) {
        candidate = (rawResult as { data: unknown }).data;
      }

      const parsed = weatherSnapshotSchema.safeParse(candidate);

      if (!parsed.success) {
        const fallback = this.getLastKnownGood(coordinates);
        if (fallback) {
          const degradedSnapshot: WeatherSnapshot = {
            ...fallback.snapshot,
            isDegraded: true,
            staleSince: new Date(fallback.savedAt).toISOString(),
            staleWarning: `Data may be stale, last updated ${new Date(fallback.savedAt).toLocaleTimeString()}`,
          };
          return { success: true, data: degradedSnapshot };
        }

        return {
          success: false,
          error: new AppError(
            "WEATHER_RESPONSE_INVALID",
            `Weather data validation failed: ${parsed.error.message}`,
            502
          ),
        };
      }

      const snapshot = parsed.data as WeatherSnapshot;
      this.cache.set(cacheKey, snapshot);
      this.saveLastKnownGood(coordinates, snapshot);

      return { success: true, data: snapshot };
    } catch (error) {
      // Degraded-mode fallback on thrown provider network error or timeout
      const fallback = this.getLastKnownGood(coordinates);
      if (fallback) {
        const degradedSnapshot: WeatherSnapshot = {
          ...fallback.snapshot,
          isDegraded: true,
          staleSince: new Date(fallback.savedAt).toISOString(),
          staleWarning: `Data may be stale, last updated ${new Date(fallback.savedAt).toLocaleTimeString()}`,
        };
        return { success: true, data: degradedSnapshot };
      }

      if (error instanceof AppError) {
        return { success: false, error };
      }
      return {
        success: false,
        error: new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          error instanceof Error ? error.message : "Unknown error fetching weather data",
          502
        ),
      };
    }
  }

  /**
   * Fetch current conditions for the given coordinates.
   */
  async getCurrentConditions(
    coordinates: Coordinates,
    query?: CurrentWeatherQuery
  ): Promise<Result<CurrentWeather>> {
    const weatherResult = await this.getWeather(coordinates, query?.timezone);
    if (!weatherResult.success) {
      return weatherResult;
    }
    return { success: true, data: weatherResult.data.current };
  }

  /**
   * Fetch forecast for the given coordinates and time range options.
   */
  async getForecast(
    coordinates: Coordinates,
    query?: ForecastWeatherQuery
  ): Promise<Result<WeatherSnapshot>> {
    if (this.provider.getForecast) {
      try {
        const raw = await this.provider.getForecast(coordinates, query);
        let candidate: unknown = raw;
        if ("success" in raw) {
          if (!raw.success) {
            const fallback = this.getLastKnownGood(coordinates);
            if (fallback) {
              const degradedSnapshot: WeatherSnapshot = {
                ...fallback.snapshot,
                isDegraded: true,
                staleSince: new Date(fallback.savedAt).toISOString(),
                staleWarning: `Data may be stale, last updated ${new Date(fallback.savedAt).toLocaleTimeString()}`,
              };
              return { success: true, data: degradedSnapshot };
            }

            return {
              success: false,
              error:
                raw.error instanceof AppError
                  ? raw.error
                  : new AppError("WEATHER_PROVIDER_UNAVAILABLE", raw.error.message, 502),
            };
          }
          candidate = raw.data;
        }
        const parsed = weatherSnapshotSchema.safeParse(candidate);
        if (!parsed.success) {
          const fallback = this.getLastKnownGood(coordinates);
          if (fallback) {
            const degradedSnapshot: WeatherSnapshot = {
              ...fallback.snapshot,
              isDegraded: true,
              staleSince: new Date(fallback.savedAt).toISOString(),
              staleWarning: `Data may be stale, last updated ${new Date(fallback.savedAt).toLocaleTimeString()}`,
            };
            return { success: true, data: degradedSnapshot };
          }

          return {
            success: false,
            error: new AppError(
              "WEATHER_RESPONSE_INVALID",
              `Forecast validation failed: ${parsed.error.message}`,
              502
            ),
          };
        }
        const snapshot = parsed.data as WeatherSnapshot;
        this.saveLastKnownGood(coordinates, snapshot);
        return { success: true, data: snapshot };
      } catch (err) {
        const fallback = this.getLastKnownGood(coordinates);
        if (fallback) {
          const degradedSnapshot: WeatherSnapshot = {
            ...fallback.snapshot,
            isDegraded: true,
            staleSince: new Date(fallback.savedAt).toISOString(),
            staleWarning: `Data may be stale, last updated ${new Date(fallback.savedAt).toLocaleTimeString()}`,
          };
          return { success: true, data: degradedSnapshot };
        }

        if (err instanceof AppError) return { success: false, error: err };
        return {
          success: false,
          error: new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            err instanceof Error ? err.message : "Error fetching forecast",
            502
          ),
        };
      }
    }
    return this.getWeather(coordinates, query?.timezone);
  }

  /**
   * Clear the internal weather cache (useful for testing or manual refresh).
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear the long-lived fallback cache (primarily for deterministic unit testing).
   */
  clearLastKnownGood(): void {
    this.lastKnownGoodSnapshots.clear();
  }
}
