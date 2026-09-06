/**
 * Feed Provider interface and configuration for live disaster/weather data feeds.
 *
 * Implements strict provider abstraction:
 * Each provider fetches, validates, normalizes, and returns canonical NewsArticle objects
 * with source tiering, provenance, and resilient error isolation.
 */

import type { NewsArticle, SourceTier } from "@/types/news";
import type { NewsQuery } from "./news-provider";

export interface FeedProviderConfig {
  name: string;
  feedUrl: string;
  tier?: SourceTier;
  timeout?: number;
  maxItems?: number;
}

/**
 * Enhanced feed provider contract for Phase 8.
 */
export interface FeedProvider {
  readonly name: string;
  readonly tier: SourceTier;
  readonly feedUrl: string;

  /**
   * Fetch and normalize feed data into canonical NewsArticle records.
   */
  getArticles(query?: NewsQuery): Promise<NewsArticle[]>;
}
