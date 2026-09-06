/**
 * Feed Registry for Live Intelligence.
 *
 * Central registry managing all live feed providers (GDACS, USGS, meteorological feeds, RSS).
 * Provides concurrent execution with Promise.allSettled and strict provider failure isolation:
 * a failure or timeout in one provider never breaks the rest of the ingestion pipeline.
 */

import type { NewsArticle } from "@/types/news";
import type { NewsProvider, NewsQuery } from "./news-provider";
import { GdacsProvider } from "./gdacs-provider";
import { UsgsProvider } from "./usgs-provider";

export interface FeedFetchSummary {
  articles: NewsArticle[];
  successfulProviders: string[];
  failedProviders: Array<{ name: string; error: string }>;
  durationMs: number;
}

export class FeedRegistry {
  private providers: Map<string, NewsProvider> = new Map();

  constructor(defaultProviders?: NewsProvider[]) {
    if (defaultProviders && defaultProviders.length > 0) {
      for (const p of defaultProviders) {
        this.providers.set(p.name, p);
      }
    } else {
      // Default production feed provider suite
      this.registerProvider(new GdacsProvider());
      this.registerProvider(new UsgsProvider());
    }
  }

  registerProvider(provider: NewsProvider): void {
    this.providers.set(provider.name, provider);
  }

  unregisterProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  getProvider(name: string): NewsProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Fetch articles from all registered providers concurrently with complete failure isolation.
   */
  async fetchAllFeeds(query?: NewsQuery): Promise<FeedFetchSummary> {
    const startTime = Date.now();
    const providerList = Array.from(this.providers.values());
    const articles: NewsArticle[] = [];
    const successfulProviders: string[] = [];
    const failedProviders: Array<{ name: string; error: string }> = [];

    const results = await Promise.allSettled(
      providerList.map(async (provider) => {
        const fetched = await provider.getArticles(query);
        return { providerName: provider.name, articles: fetched };
      })
    );

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const provider = providerList[i];
      const providerName = provider?.name || `Provider_${i}`;

      if (res && res.status === "fulfilled") {
        successfulProviders.push(providerName);
        articles.push(...res.value.articles);
      } else if (res && res.status === "rejected") {
        const errorMsg =
          res.reason instanceof Error ? res.reason.message : String(res.reason);
        console.warn(
          `[FeedRegistry] Provider '${providerName}' failed gracefully: ${errorMsg}`
        );
        failedProviders.push({ name: providerName, error: errorMsg });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      articles,
      successfulProviders,
      failedProviders,
      durationMs,
    };
  }
}

// Global default feed registry instance
export const globalFeedRegistry = new FeedRegistry();
