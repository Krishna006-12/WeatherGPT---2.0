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

  constructor(provider: WeatherProvider, options: WeatherServiceOptions = {}) {
    this.provider = provider;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cache = new MemoryCache<WeatherSnapshot>({
      defaultTtlMs: this.cacheTtlMs,
      maxEntries: 100,
    });
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

      return { success: true, data: snapshot };
    } catch (error) {
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
          return {
            success: false,
            error: new AppError(
              "WEATHER_RESPONSE_INVALID",
              `Forecast validation failed: ${parsed.error.message}`,
              502
            ),
          };
        }
        return { success: true, data: parsed.data as WeatherSnapshot };
      } catch (err) {
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
}
