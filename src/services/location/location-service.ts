/**
 * Location geocoding service.
 *
 * Uses Open-Meteo Geocoding API to search and resolve location names
 * to normalized geographic coordinates and timezones.
 *
 * Architecture boundary:
 *   UI / API routes → LocationService → Open-Meteo Geocoding API
 */

import { openMeteoGeocodingResponseSchema } from "@/schemas/open-meteo";
import { AppError } from "@/lib/errors";
import { MemoryCache } from "@/lib/cache";
import type { Result } from "@/types/common";

const DEFAULT_GEOCODING_URL = "https://geocoding-api.open-meteo.com";
const DEFAULT_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface NormalizedLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region?: string;
  timezone: string;
  displayName: string;
}

export interface LocationServiceConfig {
  baseUrl?: string;
  timeout?: number;
  cacheTtlMs?: number;
}

export class LocationService {
  private baseUrl: string;
  private timeout: number;
  private cache: MemoryCache<NormalizedLocation[]>;

  constructor(config: LocationServiceConfig = {}) {
    this.baseUrl =
      config.baseUrl ||
      process.env.OPEN_METEO_GEOCODING_URL ||
      DEFAULT_GEOCODING_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
    this.cache = new MemoryCache<NormalizedLocation[]>({
      defaultTtlMs: config.cacheTtlMs || CACHE_TTL_MS,
      maxEntries: 200,
    });
  }

  /**
   * Search for locations matching the given query string.
   * Handles empty queries, whitespace, normalization, and caching.
   */
  async search(query: string, count: number = 5): Promise<Result<NormalizedLocation[]>> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return { success: true, data: [] };
    }

    const cacheKey = `${trimmed.toLowerCase()}_${count}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const safeCount = Math.min(Math.max(1, count), 10);
    const params = new URLSearchParams({
      name: trimmed,
      count: safeCount.toString(),
      language: "en",
      format: "json",
    });

    const url = `${this.baseUrl}/v1/search?${params.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            error: new AppError(
              "RATE_LIMITED",
              "Geocoding service rate limit exceeded. Please try again.",
              429
            ),
          };
        }
        return {
          success: false,
          error: new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            `Geocoding service returned status ${response.status}`,
            502
          ),
        };
      }

      const json: unknown = await response.json();
      const parseResult = openMeteoGeocodingResponseSchema.safeParse(json);

      if (!parseResult.success) {
        return {
          success: false,
          error: new AppError(
            "WEATHER_RESPONSE_INVALID",
            `Geocoding response validation failed: ${parseResult.error.message}`,
            502
          ),
        };
      }

      const rawResults = parseResult.data.results || [];
      const normalized: NormalizedLocation[] = rawResults.map((item) => {
        const parts: string[] = [item.name];
        if (item.admin1) parts.push(item.admin1);
        if (item.country) parts.push(item.country);

        return {
          id: item.id,
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          country: item.country || "",
          region: item.admin1,
          timezone: item.timezone || "UTC",
          displayName: parts.join(", "),
        };
      });

      this.cache.set(cacheKey, normalized);
      return { success: true, data: normalized };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          success: false,
          error: new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            `Geocoding request timed out after ${this.timeout}ms`,
            504
          ),
        };
      }

      return {
        success: false,
        error:
          err instanceof AppError
            ? err
            : new AppError(
                "WEATHER_PROVIDER_UNAVAILABLE",
                `Geocoding failed: ${err instanceof Error ? err.message : "Unknown error"}`,
                502
              ),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
