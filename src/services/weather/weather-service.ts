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
import type { WeatherSnapshot } from "@/types/weather";
import { weatherSnapshotSchema } from "@/schemas/weather";
import type { WeatherProvider } from "./weather-provider";
import { MemoryCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface WeatherServiceOptions {
  cacheTtlMs?: number;
}

export class WeatherService {
  private provider: WeatherProvider;
  private cache: MemoryCache<WeatherSnapshot>;

  constructor(provider: WeatherProvider, options: WeatherServiceOptions = {}) {
    this.provider = provider;
    this.cache = new MemoryCache<WeatherSnapshot>({
      defaultTtlMs: options.cacheTtlMs || DEFAULT_CACHE_TTL_MS,
      maxEntries: 100,
    });
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
    const cacheKey = `${coordinates.latitude.toFixed(2)}_${coordinates.longitude.toFixed(2)}_${tz}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const rawData = await this.provider.getWeather(coordinates, timezone);
      const parsed = weatherSnapshotSchema.safeParse(rawData);

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
   * Clear the internal weather cache (useful for testing or manual refresh).
   */
  clearCache(): void {
    this.cache.clear();
  }
}
