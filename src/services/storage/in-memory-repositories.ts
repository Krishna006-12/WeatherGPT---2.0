/**
 * In-memory development repository implementations for events and articles.
 * Thread-safe for Node.js runtime with sorting and filtering support.
 */

import type { WeatherEvent } from "@/types/events";
import type { NewsArticle } from "@/types/news";
import type {
  EventRepository,
  ArticleRepository,
  EventFilter,
  ArticleFilter,
} from "./repository-interfaces";

export class InMemoryEventRepository implements EventRepository {
  private events = new Map<string, WeatherEvent>();

  async save(event: WeatherEvent): Promise<WeatherEvent> {
    this.events.set(event.id, event);
    return event;
  }

  async saveMany(events: WeatherEvent[]): Promise<WeatherEvent[]> {
    for (const e of events) {
      this.events.set(e.id, e);
    }
    return events;
  }

  async findById(id: string): Promise<WeatherEvent | null> {
    return this.events.get(id) || null;
  }

  async findBySlug(slug: string): Promise<WeatherEvent | null> {
    for (const e of this.events.values()) {
      if (e.slug === slug) return e;
    }
    return null;
  }

  async findAll(filter?: EventFilter): Promise<WeatherEvent[]> {
    let result = Array.from(this.events.values());

    if (filter) {
      if (filter.category) {
        result = result.filter((e) => e.category === filter.category);
      }
      if (filter.severity) {
        result = result.filter((e) => e.severity === filter.severity);
      }
      if (filter.status) {
        result = result.filter((e) => e.status === filter.status);
      }
      if (filter.country) {
        const cLower = filter.country.toLowerCase();
        result = result.filter(
          (e) =>
            e.location.country.toLowerCase() === cLower ||
            e.locations.some((l) => l.country.toLowerCase() === cLower)
        );
      }
      if (filter.region) {
        const rLower = filter.region.toLowerCase();
        result = result.filter(
          (e) =>
            e.location.region?.toLowerCase() === rLower ||
            e.affectedRegions.some((r) => r.name.toLowerCase() === rLower)
        );
      }
      if (filter.since) {
        const sinceTime = new Date(filter.since).getTime();
        if (!isNaN(sinceTime)) {
          result = result.filter(
            (e) => new Date(e.lastUpdatedAt).getTime() >= sinceTime
          );
        }
      }
    }

    // Sort descending by lastUpdatedAt
    result.sort(
      (a, b) =>
        new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    );

    const offset = filter?.offset || 0;
    const limit = filter?.limit || result.length;
    return result.slice(offset, offset + limit);
  }

  async count(filter?: EventFilter): Promise<number> {
    const all = await this.findAll(filter);
    return all.length;
  }

  async delete(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  async clear(): Promise<void> {
    this.events.clear();
  }
}

export class InMemoryArticleRepository implements ArticleRepository {
  private articles = new Map<string, NewsArticle>();
  private urlIndex = new Map<string, string>(); // url -> id

  async save(article: NewsArticle): Promise<NewsArticle> {
    this.articles.set(article.id, article);
    if (article.url) {
      this.urlIndex.set(article.url, article.id);
    }
    return article;
  }

  async saveMany(articles: NewsArticle[]): Promise<NewsArticle[]> {
    for (const a of articles) {
      this.articles.set(a.id, a);
      if (a.url) {
        this.urlIndex.set(a.url, a.id);
      }
    }
    return articles;
  }

  async findById(id: string): Promise<NewsArticle | null> {
    return this.articles.get(id) || null;
  }

  async findByUrl(url: string): Promise<NewsArticle | null> {
    const id = this.urlIndex.get(url);
    if (!id) return null;
    return this.articles.get(id) || null;
  }

  async findByIds(ids: string[]): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];
    for (const id of ids) {
      const art = this.articles.get(id);
      if (art) results.push(art);
    }
    return results;
  }

  async findAll(filter?: ArticleFilter): Promise<NewsArticle[]> {
    let result = Array.from(this.articles.values());

    if (filter) {
      if (filter.sourceTier) {
        result = result.filter((a) => a.sourceTier === filter.sourceTier);
      }
      if (filter.sourceName) {
        const sLower = filter.sourceName.toLowerCase();
        result = result.filter((a) => a.source.name.toLowerCase() === sLower);
      }
      if (filter.since) {
        const sinceTime = new Date(filter.since).getTime();
        if (!isNaN(sinceTime)) {
          result = result.filter(
            (a) => new Date(a.publishedAt).getTime() >= sinceTime
          );
        }
      }
    }

    // Sort descending by publishedAt
    result.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const offset = filter?.offset || 0;
    const limit = filter?.limit || result.length;
    return result.slice(offset, offset + limit);
  }

  async count(filter?: ArticleFilter): Promise<number> {
    const all = await this.findAll(filter);
    return all.length;
  }

  async clear(): Promise<void> {
    this.articles.clear();
    this.urlIndex.clear();
  }
}

// Global singletons for development in-memory storage
export const globalEventRepository = new InMemoryEventRepository();
export const globalArticleRepository = new InMemoryArticleRepository();
