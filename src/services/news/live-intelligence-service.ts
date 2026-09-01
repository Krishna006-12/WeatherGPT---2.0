/**
 * Live Intelligence Service.
 * Orchestrates the data foundation pipeline for live weather and hazard events:
 * Ingestion → Validation → Normalization → Deduplication → Clustering → Persistence.
 *
 * Architecture boundary:
 *   UI / API routes → LiveIntelligenceService → Storage Repositories & Feed Providers
 */

import type { NewsArticle } from "@/types/news";
import type { WeatherEvent } from "@/types/events";
import type { Result } from "@/types/common";
import type {
  EventRepository,
  ArticleRepository,
  EventFilter,
  ArticleFilter,
} from "@/services/storage/repository-interfaces";
import {
  globalEventRepository,
  globalArticleRepository,
} from "@/services/storage/in-memory-repositories";
import type { NewsProvider } from "./news-provider";
import { RssFeedProvider } from "./rss-feed-provider";
import { deduplicateArticles } from "@/lib/deduplicator";
import { clusterArticlesIntoEvents } from "@/lib/clusterer";
import { newsArticleSchema } from "@/schemas/news";
import { AppError } from "@/lib/errors";

export interface SyncResult {
  articlesIngested: number;
  articlesDeduplicated: number;
  eventsCreatedOrUpdated: number;
  timestamp: string;
}

export interface LiveIntelligenceServiceConfig {
  eventRepository?: EventRepository;
  articleRepository?: ArticleRepository;
  providers?: NewsProvider[];
}

export class LiveIntelligenceService {
  private eventRepo: EventRepository;
  private articleRepo: ArticleRepository;
  private providers: NewsProvider[];

  constructor(config: LiveIntelligenceServiceConfig = {}) {
    this.eventRepo = config.eventRepository || globalEventRepository;
    this.articleRepo = config.articleRepository || globalArticleRepository;
    this.providers = config.providers || [
      new RssFeedProvider({
        name: "GDACS Disaster Alerts",
        feedUrl: "https://www.gdacs.org/xml/rss.xml",
      }),
    ];
  }

  /**
   * Ingest, validate, deduplicate, and cluster an array of NewsArticles.
   */
  async ingestArticles(articles: NewsArticle[]): Promise<Result<SyncResult>> {
    try {
      const validArticles: NewsArticle[] = [];

      for (const art of articles) {
        const parsed = newsArticleSchema.safeParse(art);
        if (parsed.success) {
          validArticles.push(parsed.data as NewsArticle);
        }
      }

      // Fetch existing articles to deduplicate against
      const existingArticles = await this.articleRepo.findAll({ limit: 500 });
      const combined = [...existingArticles, ...validArticles];
      const deduplicatedAll = deduplicateArticles(combined);

      // Save new articles
      await this.articleRepo.saveMany(deduplicatedAll);

      // Run deterministic clustering across all current articles
      const events = clusterArticlesIntoEvents(deduplicatedAll);
      await this.eventRepo.saveMany(events);

      return {
        success: true,
        data: {
          articlesIngested: validArticles.length,
          articlesDeduplicated: deduplicatedAll.length,
          eventsCreatedOrUpdated: events.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof AppError
            ? error
            : new AppError(
                "UNKNOWN_ERROR",
                error instanceof Error ? error.message : "Error during article ingestion",
                500
              ),
      };
    }
  }

  /**
   * Fetch from all configured news/disaster feed providers and sync the pipeline.
   */
  async syncFeeds(): Promise<Result<SyncResult>> {
    try {
      const allFetched: NewsArticle[] = [];

      for (const provider of this.providers) {
        try {
          const articles = await provider.getArticles();
          allFetched.push(...articles);
        } catch (err) {
          console.warn(`[LiveIntelligence] Provider ${provider.name} failed:`, err);
        }
      }

      return this.ingestArticles(allFetched);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof AppError
            ? error
            : new AppError(
                "FEED_SYNC_FAILED",
                error instanceof Error ? error.message : "Failed to sync feeds",
                502
              ),
      };
    }
  }

  /**
   * Get filtered weather events.
   */
  async getEvents(filter?: EventFilter): Promise<Result<WeatherEvent[]>> {
    try {
      const events = await this.eventRepo.findAll(filter);
      return { success: true, data: events };
    } catch (error) {
      return {
        success: false,
        error: new AppError(
          "UNKNOWN_ERROR",
          error instanceof Error ? error.message : "Failed to retrieve events",
          500
        ),
      };
    }
  }

  /**
   * Get single weather event by ID with its linked source articles.
   */
  async getEventById(
    id: string
  ): Promise<Result<{ event: WeatherEvent; articles: NewsArticle[] }>> {
    try {
      const event = await this.eventRepo.findById(id);
      if (!event) {
        return {
          success: false,
          error: new AppError("EVENT_NOT_FOUND", `Event ${id} not found`, 404),
        };
      }

      const articles = await this.articleRepo.findByIds(event.sourceArticleIds);
      return { success: true, data: { event, articles } };
    } catch (error) {
      return {
        success: false,
        error: new AppError(
          "UNKNOWN_ERROR",
          error instanceof Error ? error.message : "Failed to retrieve event",
          500
        ),
      };
    }
  }

  /**
   * Get stored articles.
   */
  async getArticles(filter?: ArticleFilter): Promise<Result<NewsArticle[]>> {
    try {
      const articles = await this.articleRepo.findAll(filter);
      return { success: true, data: articles };
    } catch (error) {
      return {
        success: false,
        error: new AppError(
          "UNKNOWN_ERROR",
          error instanceof Error ? error.message : "Failed to retrieve articles",
          500
        ),
      };
    }
  }
}

// Global service singleton
export const globalLiveIntelligenceService = new LiveIntelligenceService();
