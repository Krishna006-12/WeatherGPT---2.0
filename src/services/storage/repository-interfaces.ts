/**
 * Repository interfaces for event and article storage.
 * Keeps storage persistence behind a clean interface boundary so
 * in-memory development storage can be seamlessly replaced with
 * PostgreSQL/Supabase in future phases.
 */

import type { WeatherEvent, EventCategory, Severity, EventStatus } from "@/types/events";
import type { NewsArticle, SourceTier } from "@/types/news";

export interface EventFilter {
  category?: EventCategory;
  country?: string;
  region?: string;
  severity?: Severity;
  status?: EventStatus;
  since?: string;
  limit?: number;
  offset?: number;
}

export interface ArticleFilter {
  sourceTier?: SourceTier;
  sourceName?: string;
  since?: string;
  limit?: number;
  offset?: number;
}

export interface EventRepository {
  save(event: WeatherEvent): Promise<WeatherEvent>;
  saveMany(events: WeatherEvent[]): Promise<WeatherEvent[]>;
  findById(id: string): Promise<WeatherEvent | null>;
  findBySlug(slug: string): Promise<WeatherEvent | null>;
  findAll(filter?: EventFilter): Promise<WeatherEvent[]>;
  count(filter?: EventFilter): Promise<number>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface ArticleRepository {
  save(article: NewsArticle): Promise<NewsArticle>;
  saveMany(articles: NewsArticle[]): Promise<NewsArticle[]>;
  findById(id: string): Promise<NewsArticle | null>;
  findByUrl(url: string): Promise<NewsArticle | null>;
  findByIds(ids: string[]): Promise<NewsArticle[]>;
  findAll(filter?: ArticleFilter): Promise<NewsArticle[]>;
  count(filter?: ArticleFilter): Promise<number>;
  clear(): Promise<void>;
}
