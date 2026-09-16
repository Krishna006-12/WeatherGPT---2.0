/**
 * Context News Service — WeatherGPT 2.0.
 *
 * Single orchestrator for location-relevant weather news and context events.
 * Sits between consumer endpoints (API routes, AI Orchestrator) and NewsProvider adapters.
 *
 * Flow:
 *   Consumer → ContextNewsService → NewsProvider (GDACS) → Boundary Validation →
 *   Deterministic Deduplication → Distance & Relevance Scoring → In-Memory Cache
 */

import type { Result } from "@/types/common";
import type { ContextEvent } from "@/types/context-event";
import { contextEventSchema } from "@/schemas/context-event";
import type { NewsProvider, ContextNewsQuery } from "./news-provider";
import {
  deduplicateContextEvents,
  scoreAndFilterContextEvents,
} from "./context-event-scorer";
import { MemoryCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export interface ContextNewsServiceOptions {
  cacheTtlMs?: number;
}

export class ContextNewsService {
  private provider: NewsProvider;
  private cache: MemoryCache<ContextEvent[]>;
  private cacheTtlMs: number;

  constructor(
    provider: NewsProvider,
    options: ContextNewsServiceOptions = {}
  ) {
    this.provider = provider;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cache = new MemoryCache<ContextEvent[]>({
      defaultTtlMs: this.cacheTtlMs,
      maxEntries: 100,
    });
  }

  private getCacheKey(query?: ContextNewsQuery): string {
    const bucket = Math.floor(
      Date.now() / (this.cacheTtlMs > 0 ? this.cacheTtlMs : DEFAULT_CACHE_TTL_MS)
    );
    const coords = query?.coordinates
      ? `${query.coordinates.latitude.toFixed(2)}_${query.coordinates.longitude.toFixed(2)}`
      : "global";
    const radius = query?.radiusKm ?? 500;
    const cat = query?.category || "all";
    return `news:${coords}:r${radius}:c${cat}:b${bucket}`;
  }

  /**
   * Fetch, validate, deduplicate, and score context events for a location.
   */
  async getContextEvents(
    query?: ContextNewsQuery
  ): Promise<Result<ContextEvent[]>> {
    // Validate coordinates if supplied
    if (query?.coordinates) {
      const { latitude, longitude } = query.coordinates;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return {
          success: false,
          error: new AppError(
            "INVALID_LOCATION",
            `Coordinates out of range: latitude (${latitude}), longitude (${longitude})`,
            400
          ),
        };
      }
    }

    const cacheKey = this.getCacheKey(query);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    if (!this.provider.getContextEvents) {
      return {
        success: false,
        error: new AppError(
          "NEWS_PROVIDER_UNAVAILABLE",
          `Provider '${this.provider.name}' does not implement getContextEvents`,
          501
        ),
      };
    }

    try {
      const rawEventsResult = await this.provider.getContextEvents(query);

      let candidateList: unknown = rawEventsResult;
      if (
        typeof rawEventsResult === "object" &&
        rawEventsResult !== null &&
        "success" in rawEventsResult
      ) {
        const res = rawEventsResult as Result<ContextEvent[]>;
        if (!res.success) {
          return res;
        }
        candidateList = res.data;
      }

      if (!Array.isArray(candidateList)) {
        return {
          success: false,
          error: new AppError(
            "NEWS_RESPONSE_INVALID",
            "News provider did not return an array of context events",
            502
          ),
        };
      }

      // Strict Zod array boundary validation
      const validatedEvents: ContextEvent[] = [];
      for (const item of candidateList) {
        const parsed = contextEventSchema.safeParse(item);
        if (!parsed.success) {
          return {
            success: false,
            error: new AppError(
              "NEWS_RESPONSE_INVALID",
              `Context event schema validation failed: ${parsed.error.message}`,
              502
            ),
          };
        }
        validatedEvents.push(parsed.data);
      }

      // Step 1: Deterministic headline deduplication
      const deduped = deduplicateContextEvents(validatedEvents);

      // Step 2: Distance filtering & multi-factor relevance scoring
      const scored = scoreAndFilterContextEvents(
        deduped,
        query?.coordinates,
        { maxRadiusKm: query?.radiusKm }
      );

      const finalEvents = query?.limit ? scored.slice(0, query.limit) : scored;
      this.cache.set(cacheKey, finalEvents);

      return { success: true, data: finalEvents };
    } catch (error) {
      if (error instanceof AppError) {
        return { success: false, error };
      }
      return {
        success: false,
        error: new AppError(
          "NEWS_PROVIDER_UNAVAILABLE",
          error instanceof Error ? error.message : "Unknown error fetching news events",
          502
        ),
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
