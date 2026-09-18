/**
 * Location geocoding service.
 *
 * Uses Open-Meteo Geocoding API to search and resolve location names
 * to normalized geographic coordinates and timezones.
 *
 * Architecture boundary:
 *   UI / API routes → LocationService → Open-Meteo Geocoding API
 */

import {
  openMeteoGeocodingResponseSchema,
  type OpenMeteoGeocodingResult,
} from "@/schemas/open-meteo";
import { AppError } from "@/lib/errors";
import { MemoryCache } from "@/lib/cache";
import type { Result } from "@/types/common";
import { getCityCorrection } from "./city-corrections";

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
  population?: number;
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
   * Internal helper to fetch raw location candidates from Open-Meteo Geocoding API.
   */
  private async fetchRawLocations(
    name: string,
    count: number,
    signal?: AbortSignal
  ): Promise<Result<OpenMeteoGeocodingResult[], AppError>> {
    const params = new URLSearchParams({
      name,
      count: count.toString(),
      language: "en",
      format: "json",
    });

    const url = `${this.baseUrl}/v1/search?${params.toString()}`;

    try {
      const response = await fetch(url, {
        signal,
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

      return { success: true, data: parseResult.data.results || [] };
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
    }
  }

  /**
   * Search for locations matching the given query string.
   * Handles empty queries, whitespace normalization, typo correction (e.g. 'duabi' -> 'Dubai'),
   * population-weighted ranking, and caching.
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const correction = getCityCorrection(trimmed);
      const hasCorrection =
        correction !== null &&
        correction.toLowerCase() !== trimmed.toLowerCase();

      // If a spell correction or alias exists (e.g. 'duabi' -> 'Dubai'),
      // fetch both the corrected canonical name and the original input.
      const searchTargets = hasCorrection ? [correction, trimmed] : [trimmed];

      const fetchResults = await Promise.all(
        searchTargets.map((target) =>
          this.fetchRawLocations(target, safeCount, controller.signal)
        )
      );

      // Collect successful matches
      const allRawItems: OpenMeteoGeocodingResult[] = [];
      let firstError: AppError | undefined;

      for (const res of fetchResults) {
        if (res.success) {
          allRawItems.push(...res.data);
        } else if (!firstError) {
          firstError = res.error;
        }
      }

      if (allRawItems.length === 0 && firstError) {
        return { success: false, error: firstError };
      }

      // Deduplicate results by unique location ID
      const uniqueItems: OpenMeteoGeocodingResult[] = [];
      const seenIds = new Set<number>();
      for (const item of allRawItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueItems.push(item);
        }
      }

      // Rank results with population weighting so major metropolitan hubs
      // are prioritized over sparsely-populated villages.
      uniqueItems.sort((a, b) => {
        const popA = a.population ?? 0;
        const popB = b.population ?? 0;
        return popB - popA;
      });

      const qLower = trimmed.toLowerCase();
      const maxPop = uniqueItems[0]?.population ?? 0;

      // Dominant Metropolis Filter:
      // If the top match is a major global or national city (e.g. Dubai UAE, Tokyo, London, Delhi),
      // filter out obscure hamlets/villages with tiny populations (< 20,000 or < 2% of the city's population),
      // UNLESS the user's search query specifically included that region, district, or country.
      const filteredItems = uniqueItems.filter((item) => {
        const admin1 = (item.admin1 || "").toLowerCase();
        const admin2 = (item.admin2 || "").toLowerCase();
        const country = (item.country || "").toLowerCase();

        // If the user explicitly searched for a specific state/region or country, retain it
        if (admin1 && qLower.includes(admin1)) return true;
        if (admin2 && qLower.includes(admin2)) return true;
        if (country && qLower.includes(country)) return true;

        if (maxPop >= 100_000) {
          const pop = item.population ?? 0;
          const threshold = Math.min(50_000, Math.max(20_000, maxPop * 0.02));
          if (pop < threshold) {
            return false;
          }
        }
        return true;
      });

      // Deduplicate by displayName so no duplicate rows (e.g. multiple identical 'Dubai, Uttar Pradesh, India')
      // ever appear in the search dropdown.
      const normalized: NormalizedLocation[] = [];
      const seenDisplayNames = new Set<string>();

      for (const item of filteredItems) {
        const parts: string[] = [item.name];
        if (item.admin1) parts.push(item.admin1);
        if (item.country) parts.push(item.country);
        const displayName = parts.join(", ");

        if (!seenDisplayNames.has(displayName)) {
          seenDisplayNames.add(displayName);
          normalized.push({
            id: item.id,
            name: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            country: item.country || "",
            region: item.admin1,
            timezone: item.timezone || "UTC",
            displayName,
            population: item.population,
          });
        }

        if (normalized.length >= safeCount) {
          break;
        }
      }

      this.cache.set(cacheKey, normalized);
      return { success: true, data: normalized };
    } finally {
      clearTimeout(timer);
    }
  }
}
