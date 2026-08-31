/**
 * RSS and Atom feed provider adapter.
 * Parses public RSS/Atom XML feeds from official disaster agencies and wire news
 * into normalized NewsArticle structures with full source tiering and provenance.
 */

import type { NewsArticle } from "@/types/news";
import type { NewsProvider, NewsProviderConfig, NewsQuery } from "./news-provider";
import { classifySource } from "@/lib/source-trust";
import { normalizeCanonicalUrl } from "@/lib/url-normalizer";
import { sanitizeUntrustedText } from "@/lib/text-sanitizer";
import { generateArticleId } from "@/lib/deduplicator";
import { rawFeedItemSchema } from "@/schemas/news";
import { AppError } from "@/lib/errors";

const DEFAULT_TIMEOUT_MS = 10_000;

interface ExtractedFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  content?: string;
  guid?: string;
}

/**
 * Lightweight deterministic XML element extractor for RSS & Atom feeds.
 */
export function parseXmlFeedItems(xmlText: string): ExtractedFeedItem[] {
  const items: ExtractedFeedItem[] = [];

  // Match RSS 2.0 <item>...</item>
  const rssItemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi);
  if (rssItemMatches && rssItemMatches.length > 0) {
    for (const itemXml of rssItemMatches) {
      const titleMatch = itemXml.match(/<title[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const linkMatch = itemXml.match(/<link[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const pubDateMatch = itemXml.match(/<pubDate[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const descMatch = itemXml.match(/<description[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
      const contentMatch = itemXml.match(/<content:encoded[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content:encoded>/i);
      const guidMatch = itemXml.match(/<guid[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/guid>/i);

      const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
      const link = (linkMatch?.[1] || linkMatch?.[2] || "").trim().replaceAll("&amp;", "&");
      const pubDate = (pubDateMatch?.[1] || pubDateMatch?.[2] || "").trim();
      const description = (descMatch?.[1] || descMatch?.[2] || "").trim();
      const content = (contentMatch?.[1] || contentMatch?.[2] || "").trim();
      const guid = (guidMatch?.[1] || guidMatch?.[2] || "").trim();

      if (title && link) {
        items.push({ title, link, pubDate, description, content, guid });
      }
    }
    return items;
  }

  // Match Atom <entry>...</entry>
  const atomEntryMatches = xmlText.match(/<entry[\s\S]*?<\/entry>/gi);
  if (atomEntryMatches && atomEntryMatches.length > 0) {
    for (const entryXml of atomEntryMatches) {
      const titleMatch = entryXml.match(/<title[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const linkHrefMatch = entryXml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      const publishedMatch = entryXml.match(/<(?:published|updated)[\s\S]*?>([\s\S]*?)<\/(?:published|updated)>/i);
      const summaryMatch = entryXml.match(/<summary[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/summary>/i);
      const contentMatch = entryXml.match(/<content[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content>/i);
      const idMatch = entryXml.match(/<id[\s\S]*?>([\s\S]*?)<\/id>/i);

      const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
      const link = (linkHrefMatch?.[1] || "").trim().replaceAll("&amp;", "&");
      const pubDate = (publishedMatch?.[1] || "").trim();
      const description = (summaryMatch?.[1] || summaryMatch?.[2] || "").trim();
      const content = (contentMatch?.[1] || contentMatch?.[2] || "").trim();
      const guid = (idMatch?.[1] || "").trim();

      if (title && link) {
        items.push({ title, link, pubDate, description, content, guid });
      }
    }
  }

  return items;
}

export class RssFeedProvider implements NewsProvider {
  readonly name: string;
  private feedUrl: string;
  private timeout: number;

  constructor(config: NewsProviderConfig) {
    this.name = config.name;
    this.feedUrl = config.feedUrl;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
  }

  async getArticles(query?: NewsQuery): Promise<NewsArticle[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let xmlText = "";
    try {
      const response = await fetch(this.feedUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
      });

      if (!response.ok) {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `Feed ${this.name} returned status ${response.status}: ${response.statusText}`,
          502
        );
      }

      xmlText = await response.text();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `Feed request to ${this.feedUrl} timed out after ${this.timeout}ms`,
          504
        );
      }
      throw err instanceof AppError
        ? err
        : new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            `Failed to fetch feed ${this.name}: ${err instanceof Error ? err.message : "Network error"}`,
            502
          );
    } finally {
      clearTimeout(timer);
    }

    const rawItems = parseXmlFeedItems(xmlText);
    const fetchedAt = new Date().toISOString();
    const sourceInfo = classifySource(this.name, this.feedUrl);

    const articles: NewsArticle[] = [];
    const limit = query?.limit || 50;

    for (const raw of rawItems.slice(0, limit)) {
      const validation = rawFeedItemSchema.safeParse(raw);
      if (!validation.success) {
        continue; // Skip malformed items gracefully
      }

      const item = validation.data;
      const canonicalUrl = normalizeCanonicalUrl(item.link);
      const cleanTitle = sanitizeUntrustedText(item.title);
      const cleanSummary = sanitizeUntrustedText(item.description);
      const cleanContent = sanitizeUntrustedText(item.content);

      // Parse pubDate safely or fallback to fetchedAt
      let publishedAt = fetchedAt;
      if (item.pubDate) {
        const parsedDate = new Date(item.pubDate);
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      }

      const id = generateArticleId(canonicalUrl || item.link, publishedAt);

      const article: NewsArticle = {
        id,
        title: cleanTitle,
        url: canonicalUrl || item.link,
        source: {
          name: this.name,
          url: this.feedUrl,
          category: sourceInfo.category,
          tier: sourceInfo.tier,
        },
        publishedAt,
        fetchedAt,
        summary: cleanSummary || undefined,
        content: cleanContent || undefined,
        language: "en",
        sourceTier: sourceInfo.tier,
        provenance: {
          provider: this.name,
          retrievedAt: fetchedAt,
          observedAt: publishedAt,
          dataType: "observation",
        },
      };

      articles.push(article);
    }

    return articles;
  }
}
