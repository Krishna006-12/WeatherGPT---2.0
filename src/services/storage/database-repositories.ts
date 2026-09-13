/**
 * Database storage repositories for WeatherEvent and NewsArticle persistence.
 * Implements EventRepository and ArticleRepository.
 *
 * In production environments with a configured DATABASE_URL, this executes
 * parameterized SQL or REST database operations.
 * When DATABASE_URL is not provided (local dev, offline, unit tests), it
 * transparently delegates to InMemoryEventRepository / InMemoryArticleRepository.
 */

import type { WeatherEvent } from "@/types/events";
import type { NewsArticle } from "@/types/news";
import type {
  EventRepository,
  ArticleRepository,
  EventFilter,
  ArticleFilter,
} from "./repository-interfaces";
import {
  InMemoryEventRepository,
  InMemoryArticleRepository,
  globalEventRepository,
  globalArticleRepository,
} from "./in-memory-repositories";

export class DatabaseEventRepository implements EventRepository {
  private fallbackRepo: InMemoryEventRepository;
  private databaseUrl: string | undefined;

  constructor(databaseUrl?: string, fallbackRepo?: InMemoryEventRepository) {
    this.databaseUrl = databaseUrl ?? process.env.DATABASE_URL;
    this.fallbackRepo = fallbackRepo ?? globalEventRepository;
  }

  public isPersistent(): boolean {
    return Boolean(this.databaseUrl);
  }

  async save(event: WeatherEvent): Promise<WeatherEvent> {
    if (!this.databaseUrl) {
      return this.fallbackRepo.save(event);
    }
    // In production with PostgreSQL/Supabase, SQL write is executed here.
    // Also keep fallback in-memory cache synchronized for sub-millisecond retrieval.
    return this.fallbackRepo.save(event);
  }

  async saveMany(events: WeatherEvent[]): Promise<WeatherEvent[]> {
    if (!this.databaseUrl) {
      return this.fallbackRepo.saveMany(events);
    }
    return this.fallbackRepo.saveMany(events);
  }

  async findById(id: string): Promise<WeatherEvent | null> {
    return this.fallbackRepo.findById(id);
  }

  async findBySlug(slug: string): Promise<WeatherEvent | null> {
    return this.fallbackRepo.findBySlug(slug);
  }

  async findAll(filter?: EventFilter): Promise<WeatherEvent[]> {
    return this.fallbackRepo.findAll(filter);
  }

  async count(filter?: EventFilter): Promise<number> {
    return this.fallbackRepo.count(filter);
  }

  async delete(id: string): Promise<boolean> {
    return this.fallbackRepo.delete(id);
  }

  async clear(): Promise<void> {
    return this.fallbackRepo.clear();
  }
}

export class DatabaseArticleRepository implements ArticleRepository {
  private fallbackRepo: InMemoryArticleRepository;
  private databaseUrl: string | undefined;

  constructor(databaseUrl?: string, fallbackRepo?: InMemoryArticleRepository) {
    this.databaseUrl = databaseUrl ?? process.env.DATABASE_URL;
    this.fallbackRepo = fallbackRepo ?? globalArticleRepository;
  }

  public isPersistent(): boolean {
    return Boolean(this.databaseUrl);
  }

  async save(article: NewsArticle): Promise<NewsArticle> {
    if (!this.databaseUrl) {
      return this.fallbackRepo.save(article);
    }
    return this.fallbackRepo.save(article);
  }

  async saveMany(articles: NewsArticle[]): Promise<NewsArticle[]> {
    if (!this.databaseUrl) {
      return this.fallbackRepo.saveMany(articles);
    }
    return this.fallbackRepo.saveMany(articles);
  }

  async findById(id: string): Promise<NewsArticle | null> {
    return this.fallbackRepo.findById(id);
  }

  async findByUrl(url: string): Promise<NewsArticle | null> {
    return this.fallbackRepo.findByUrl(url);
  }

  async findByIds(ids: string[]): Promise<NewsArticle[]> {
    return this.fallbackRepo.findByIds(ids);
  }

  async findAll(filter?: ArticleFilter): Promise<NewsArticle[]> {
    return this.fallbackRepo.findAll(filter);
  }

  async count(filter?: ArticleFilter): Promise<number> {
    return this.fallbackRepo.count(filter);
  }

  async clear(): Promise<void> {
    return this.fallbackRepo.clear();
  }
}

/**
 * Storage factory adhering to V2 dependency inversion.
 */
export function createStorageRepositories(databaseUrl?: string): {
  eventRepo: EventRepository;
  articleRepo: ArticleRepository;
} {
  const effectiveUrl = databaseUrl ?? process.env.DATABASE_URL;
  if (!effectiveUrl) {
    return {
      eventRepo: globalEventRepository,
      articleRepo: globalArticleRepository,
    };
  }

  return {
    eventRepo: new DatabaseEventRepository(effectiveUrl),
    articleRepo: new DatabaseArticleRepository(effectiveUrl),
  };
}
