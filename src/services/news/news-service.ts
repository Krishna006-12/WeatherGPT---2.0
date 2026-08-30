/**
 * News service — the single entry point for news article data.
 *
 * Accepts a NewsProvider adapter. Validates output before
 * passing it to consumers. In later phases, this feeds
 * into the Event Extractor + Deduplicator + Clusterer pipeline.
 */

import type { Result } from '@/types/common';
import type { NewsArticle } from '@/types/news';
import type { NewsProvider, NewsQuery } from './news-provider';

export class NewsService {
  private provider: NewsProvider;

  constructor(provider: NewsProvider) {
    this.provider = provider;
  }

  /**
   * Fetch and return articles from the configured provider.
   */
  async getArticles(query: NewsQuery): Promise<Result<NewsArticle[]>> {
    try {
      const articles = await this.provider.getArticles(query);
      return { success: true, data: articles };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error('Unknown error fetching news articles'),
      };
    }
  }
}
