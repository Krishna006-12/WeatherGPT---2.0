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
import { FeedRegistry } from "./feed-registry";
import { RssFeedProvider } from "./rss-feed-provider";
import { LiveIntelligenceSyncService } from "./live-intelligence-sync-service";
import { globalFreshnessEngine } from "./freshness-engine";
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
  syncService?: LiveIntelligenceSyncService;
}

export class LiveIntelligenceService {
  private eventRepo: EventRepository;
  private articleRepo: ArticleRepository;
  private providers: NewsProvider[];
  private syncService: LiveIntelligenceSyncService;

  constructor(config: LiveIntelligenceServiceConfig = {}) {
    this.eventRepo = config.eventRepository || globalEventRepository;
    this.articleRepo = config.articleRepository || globalArticleRepository;
    this.providers = config.providers || [
      new RssFeedProvider({
        name: "GDACS Disaster Alerts",
        feedUrl: "https://www.gdacs.org/xml/rss.xml",
      }),
    ];
    this.syncService =
      config.syncService ||
      new LiveIntelligenceSyncService({
        eventRepository: this.eventRepo,
        articleRepository: this.articleRepo,
        feedRegistry: new FeedRegistry(this.providers),
      });
  }

  /**
   * Ingest, validate, deduplicate, and cluster an array of NewsArticles.
   */
  async ingestArticles(articles: NewsArticle[]): Promise<Result<SyncResult>> {
    return this.syncService.ingestArticles(articles);
  }

  /**
   * Fetch from all configured news/disaster feed providers and sync the pipeline.
   */
  async syncFeeds(): Promise<Result<SyncResult>> {
    const res = await this.syncService.syncAll();
    if (!res.success) {
      return res;
    }
    return {
      success: true,
      data: {
        articlesIngested: res.data.articlesIngested,
        articlesDeduplicated: res.data.articlesDeduplicated,
        eventsCreatedOrUpdated: res.data.eventsCreatedOrUpdated,
        timestamp: res.data.timestamp,
      },
    };
  }

  /**
   * Get filtered weather events with dynamic real-time freshness.
   */
  async getEvents(filter?: EventFilter): Promise<Result<WeatherEvent[]>> {
    try {
      const events = await this.eventRepo.findAll(filter);
      for (const ev of events) {
        if (ev.lastUpdatedAt) {
          ev.freshness = globalFreshnessEngine.calculateFreshness(ev.lastUpdatedAt);
        }
      }
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

      if (event.lastUpdatedAt) {
        event.freshness = globalFreshnessEngine.calculateFreshness(event.lastUpdatedAt);
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
