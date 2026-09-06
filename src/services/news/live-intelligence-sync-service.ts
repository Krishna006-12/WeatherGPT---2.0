/**
 * Live Intelligence Sync Service.
 *
 * Dedicated service boundary orchestrating the complete disaster intelligence pipeline:
 * 1. Fetch from registered feeds (GDACS, USGS, meteorological feeds) with provider failure isolation
 * 2. Validate at boundary with Zod
 * 3. Deterministically deduplicate incoming articles
 * 4. Cluster related articles into canonical WeatherEvents
 * 5. Compute deterministic severity, freshness, confidence, and lifecycle
 * 6. Persist to storage repositories
 *
 * Designed to cleanly support background workers and serverless bounded invocations.
 */

import type { NewsArticle } from "@/types/news";
import type { Result } from "@/types/common";
import type {
  EventRepository,
  ArticleRepository,
} from "@/services/storage/repository-interfaces";
import {
  globalEventRepository,
  globalArticleRepository,
} from "@/services/storage/in-memory-repositories";
import { FeedRegistry, globalFeedRegistry } from "./feed-registry";
import { deduplicateArticles } from "@/lib/deduplicator";
import { clusterArticlesIntoEvents } from "@/lib/clusterer";
import { newsArticleSchema } from "@/schemas/news";
import { AppError } from "@/lib/errors";

export interface SyncPipelineMetrics {
  articlesIngested: number;
  articlesDeduplicated: number;
  eventsCreatedOrUpdated: number;
  timestamp: string;
  durationMs: number;
  providersSucceeded: string[];
  providersFailed: string[];
}

export interface LiveIntelligenceSyncServiceConfig {
  eventRepository?: EventRepository;
  articleRepository?: ArticleRepository;
  feedRegistry?: FeedRegistry;
}

export class LiveIntelligenceSyncService {
  private eventRepo: EventRepository;
  private articleRepo: ArticleRepository;
  private feedRegistry: FeedRegistry;

  constructor(config: LiveIntelligenceSyncServiceConfig = {}) {
    this.eventRepo = config.eventRepository || globalEventRepository;
    this.articleRepo = config.articleRepository || globalArticleRepository;
    this.feedRegistry = config.feedRegistry || globalFeedRegistry;
  }

  /**
   * Run the end-to-end sync pipeline across all registered feed providers.
   */
  async sync(): Promise<Result<SyncPipelineMetrics>> {
    return this.syncAll();
  }

  async syncAll(): Promise<Result<SyncPipelineMetrics>> {
    const startTime = Date.now();

    try {
      // 1. Concurrent Feed Ingestion with Failure Isolation
      const feedResult = await this.feedRegistry.fetchAllFeeds();

      // 2. Validate each article at the schema boundary
      const validArticles: NewsArticle[] = [];
      for (const raw of feedResult.articles) {
        const parsed = newsArticleSchema.safeParse(raw);
        if (parsed.success) {
          validArticles.push(parsed.data as NewsArticle);
        }
      }

      // 3. Deduplicate against existing article repository
      const existingArticles = await this.articleRepo.findAll({ limit: 500 });
      const combined = [...existingArticles, ...validArticles];
      const deduplicatedAll = deduplicateArticles(combined);

      // 4. Save deduplicated articles
      await this.articleRepo.saveMany(deduplicatedAll);

      // 5. Deterministically cluster into canonical events
      const events = clusterArticlesIntoEvents(deduplicatedAll);
      await this.eventRepo.saveMany(events);

      const durationMs = Date.now() - startTime;
      const metrics: SyncPipelineMetrics = {
        articlesIngested: validArticles.length,
        articlesDeduplicated: deduplicatedAll.length,
        eventsCreatedOrUpdated: events.length,
        timestamp: new Date().toISOString(),
        durationMs,
        providersSucceeded: feedResult.successfulProviders,
        providersFailed: feedResult.failedProviders.map((f) => f.name),
      };

      return { success: true, data: metrics };
    } catch (err) {
      console.error("[LiveIntelligenceSyncService] Sync failed:", err);
      return {
        success: false,
        error:
          err instanceof AppError
            ? err
            : new AppError(
                "FEED_SYNC_FAILED",
                err instanceof Error ? err.message : "Pipeline sync failed",
                502
              ),
      };
    }
  }

  /**
   * Ingest, deduplicate, and cluster a specific batch of articles directly.
   */
  async ingestArticles(articles: NewsArticle[]): Promise<Result<SyncPipelineMetrics>> {
    const startTime = Date.now();

    try {
      const validArticles: NewsArticle[] = [];
      for (const art of articles) {
        const parsed = newsArticleSchema.safeParse(art);
        if (parsed.success) {
          validArticles.push(parsed.data as NewsArticle);
        }
      }

      const existingArticles = await this.articleRepo.findAll({ limit: 500 });
      const combined = [...existingArticles, ...validArticles];
      const deduplicatedAll = deduplicateArticles(combined);

      await this.articleRepo.saveMany(deduplicatedAll);

      const events = clusterArticlesIntoEvents(deduplicatedAll);
      await this.eventRepo.saveMany(events);

      const durationMs = Date.now() - startTime;
      const metrics: SyncPipelineMetrics = {
        articlesIngested: validArticles.length,
        articlesDeduplicated: deduplicatedAll.length,
        eventsCreatedOrUpdated: events.length,
        timestamp: new Date().toISOString(),
        durationMs,
        providersSucceeded: ["direct_ingest"],
        providersFailed: [],
      };

      return { success: true, data: metrics };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof AppError
            ? err
            : new AppError(
                "UNKNOWN_ERROR",
                err instanceof Error ? err.message : "Direct article ingestion failed",
                500
              ),
      };
    }
  }
}

export const globalLiveIntelligenceSyncService = new LiveIntelligenceSyncService();
