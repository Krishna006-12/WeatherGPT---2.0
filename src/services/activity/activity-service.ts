/**
 * Activity Decision Intelligence Service — WeatherGPT 2.0.
 *
 * Orchestrates activity suitability evaluations by consuming the existing WeatherService
 * and executing pure deterministic suitability calculations.
 *
 * Architecture boundary:
 *   UI / API Route / Copilot Tool → ActivityService → WeatherService → WeatherSnapshot → ActivitySuitabilityEngine
 */

import type { Coordinates, Result } from "@/types/common";
import type { ActivityType, ActivitySuitabilityReport } from "@/types/activity";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { evaluateActivitySuitability } from "./activity-engine";
import { MemoryCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ActivityServiceConfig {
  weatherService?: WeatherService;
  cacheTtlMs?: number;
}

export class ActivityService {
  private weatherService: WeatherService;
  private cache: MemoryCache<ActivitySuitabilityReport>;

  constructor(config: ActivityServiceConfig = {}) {
    this.weatherService =
      config.weatherService || new WeatherService(new OpenMeteoProvider());
    this.cache = new MemoryCache<ActivitySuitabilityReport>({
      defaultTtlMs: config.cacheTtlMs || DEFAULT_CACHE_TTL_MS,
      maxEntries: 100,
    });
  }

  /**
   * Assess activity suitability for given coordinates, optional target activity, and optional target date.
   */
  async assessActivitySuitability(
    coordinates: Coordinates,
    options: {
      activity?: ActivityType;
      targetDate?: string;
      timezone?: string;
    } = {}
  ): Promise<Result<ActivitySuitabilityReport>> {
    // 1. Validate coordinate boundaries
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

    // 2. Check in-memory cache
    const cacheKey = `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}:${options.targetDate ?? "today"}:${options.activity ?? "all"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    // 3. Fetch authoritative weather snapshot from verified WeatherService
    const weatherResult = await this.weatherService.getWeather(
      coordinates,
      options.timezone
    );

    if (!weatherResult.success) {
      return {
        success: false,
        error:
          weatherResult.error instanceof AppError
            ? weatherResult.error
            : new AppError(
                "WEATHER_PROVIDER_UNAVAILABLE",
                weatherResult.error.message,
                502
              ),
      };
    }

    // 4. Deterministic evaluation via ActivitySuitabilityEngine
    try {
      const report = evaluateActivitySuitability(weatherResult.data, {
        activity: options.activity,
        targetDate: options.targetDate,
      });

      this.cache.set(cacheKey, report);
      return { success: true, data: report };
    } catch (err) {
      return {
        success: false,
        error: new AppError(
          "ACTIVITY_ENGINE_ERROR",
          err instanceof Error ? err.message : "Failed to compute activity suitability",
          500
        ),
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const globalActivityService = new ActivityService();
