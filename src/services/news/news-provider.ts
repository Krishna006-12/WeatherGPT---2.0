/**
 * News and disaster feed provider adapter interface.
 *
 * Each news or official feed source implements this interface.
 * The LiveIntelligenceService consumes providers through this boundary —
 * provider-specific shapes are normalized into NewsArticle contracts.
 *
 * Flow: Feed XML/JSON → Adapter (implements NewsProvider) → NewsArticle[]
 */

import type { Coordinates, Result } from "@/types/common";
import type { NewsArticle } from "@/types/news";
import type { ContextEvent } from "@/types/context-event";

/**
 * Configuration for a news provider adapter.
 */
export interface NewsProviderConfig {
  name?: string;
  feedUrl?: string;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Query parameters for fetching articles.
 */
export interface NewsQuery {
  keywords?: string[];
  category?: string;
  limit?: number;
}

/**
 * Query parameters for fetching location-relevant context events.
 */
export interface ContextNewsQuery {
  coordinates?: Coordinates;
  radiusKm?: number;
  category?: string;
  limit?: number;
  since?: string;
}

/**
 * The adapter contract that every news/feed provider must implement.
 * Analogous to WeatherProvider, returns normalized ContextEvents or NewsArticles.
 */
export interface NewsProvider {
  /** Unique identifier for this provider. */
  readonly name: string;

  /**
   * Fetch context events matching the given query options.
   * Parameterized by coordinates, radius, category, or time window.
   */
  getContextEvents?(
    query?: ContextNewsQuery
  ): Promise<ContextEvent[] | Result<ContextEvent[]>>;

  /**
   * Fetch articles matching the given query.
   * Preserved for backward compatibility with feed adapters.
   */
  getArticles?(query?: NewsQuery): Promise<NewsArticle[]>;
}
