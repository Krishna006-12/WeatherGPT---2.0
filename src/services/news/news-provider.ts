/**
 * News provider adapter interface.
 *
 * Each news source implements this interface. The NewsService
 * consumes providers through this boundary — provider-specific
 * response shapes are never exposed beyond the adapter.
 *
 * Flow: News API → Adapter (implements NewsProvider) → NewsArticle[]
 */

import type { NewsArticle } from '@/types/news';

/**
 * Configuration for a news provider adapter.
 */
export interface NewsProviderConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
}

/**
 * Query parameters for fetching news articles.
 */
export interface NewsQuery {
  keywords?: string[];
  category?: string;
  limit?: number;
}

/**
 * The adapter contract that every news provider must implement.
 */
export interface NewsProvider {
  /** Unique identifier for this provider. */
  readonly name: string;

  /**
   * Fetch articles matching the given query.
   * The adapter transforms provider-specific responses
   * into normalized NewsArticle shapes.
   */
  getArticles(query: NewsQuery): Promise<NewsArticle[]>;
}
