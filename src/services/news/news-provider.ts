/**
 * News and disaster feed provider adapter interface.
 *
 * Each news or official feed source implements this interface.
 * The LiveIntelligenceService consumes providers through this boundary —
 * provider-specific shapes are normalized into NewsArticle contracts.
 *
 * Flow: Feed XML/JSON → Adapter (implements NewsProvider) → NewsArticle[]
 */

import type { NewsArticle } from "@/types/news";

/**
 * Configuration for a news provider adapter.
 */
export interface NewsProviderConfig {
  name: string;
  feedUrl: string;
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
 * The adapter contract that every news/feed provider must implement.
 */
export interface NewsProvider {
  /** Unique identifier for this provider. */
  readonly name: string;

  /**
   * Fetch articles matching the given query.
   * The adapter transforms provider-specific feed entries
   * into normalized NewsArticle shapes.
   */
  getArticles(query?: NewsQuery): Promise<NewsArticle[]>;
}
