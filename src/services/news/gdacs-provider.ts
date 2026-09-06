/**
 * GDACS (Global Disaster Alert and Coordination System) Feed Provider.
 *
 * Official authoritative Tier 1 feed adapter.
 * Parses GDACS RSS 2.0 XML with GeoRSS and GDACS custom extensions:
 * alert level (Red/Orange/Green), hazard category, country, severity metrics,
 * and geographic coordinates without fabrication.
 */

import type { NewsArticle, SourceTier } from "@/types/news";
import type { FeedProvider, FeedProviderConfig } from "./feed-provider";
import type { NewsQuery } from "./news-provider";
import { sanitizeUntrustedText } from "@/lib/text-sanitizer";
import { normalizeCanonicalUrl } from "@/lib/url-normalizer";
import { generateArticleId } from "@/lib/deduplicator";
import { newsArticleSchema } from "@/schemas/news";
import { AppError } from "@/lib/errors";

const DEFAULT_GDACS_URL = "https://www.gdacs.org/xml/rss.xml";
const DEFAULT_TIMEOUT_MS = 10_000;

export interface GdacsItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  alertLevel?: "Green" | "Orange" | "Red" | string;
  eventType?: string; // FL, TC, EQ, VO, DR, WF
  country?: string;
  severityText?: string;
  lat?: number;
  lon?: number;
}

/**
 * Deterministically parse GDACS RSS XML items including gdacs:* and geo:* elements.
 */
export function parseGdacsXml(xmlText: string): GdacsItem[] {
  const items: GdacsItem[] = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi);

  if (!itemMatches || itemMatches.length === 0) {
    return items;
  }

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const linkMatch = itemXml.match(/<link[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
    const descMatch = itemXml.match(/<description[\s\S]*?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
    
    // GDACS namespace tags
    const alertLevelMatch = itemXml.match(/<gdacs:alertlevel[\s\S]*?>([\s\S]*?)<\/gdacs:alertlevel>/i);
    const eventTypeMatch = itemXml.match(/<gdacs:eventtype[\s\S]*?>([\s\S]*?)<\/gdacs:eventtype>/i);
    const countryMatch = itemXml.match(/<gdacs:country[\s\S]*?>([\s\S]*?)<\/gdacs:country>/i);
    const severityMatch = itemXml.match(/<gdacs:severity[\s\S]*?>([\s\S]*?)<\/gdacs:severity>/i);

    // Geo coordinates
    const geoLatMatch = itemXml.match(/<geo:lat[\s\S]*?>([\s\S]*?)<\/geo:lat>/i);
    const geoLongMatch = itemXml.match(/<geo:long[\s\S]*?>([\s\S]*?)<\/geo:long>/i);
    const georssPointMatch = itemXml.match(/<georss:point[\s\S]*?>([\s\S]*?)<\/georss:point>/i);

    const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
    const link = (linkMatch?.[1] || linkMatch?.[2] || "").trim().replaceAll("&amp;", "&");
    const pubDate = (pubDateMatch?.[1] || pubDateMatch?.[2] || "").trim();
    const description = (descMatch?.[1] || descMatch?.[2] || "").trim();
    const alertLevel = (alertLevelMatch?.[1] || "").trim();
    const eventType = (eventTypeMatch?.[1] || "").trim();
    const country = (countryMatch?.[1] || "").trim();
    const severityText = (severityMatch?.[1] || "").trim();

    let lat: number | undefined;
    let lon: number | undefined;

    if (geoLatMatch?.[1] && geoLongMatch?.[1]) {
      const parsedLat = parseFloat(geoLatMatch[1]);
      const parsedLon = parseFloat(geoLongMatch[1]);
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        lat = parsedLat;
        lon = parsedLon;
      }
    } else if (georssPointMatch?.[1]) {
      const parts = georssPointMatch[1].trim().split(/\s+/);
      if (parts.length >= 2) {
        const parsedLat = parseFloat(parts[0] || "");
        const parsedLon = parseFloat(parts[1] || "");
        if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
          lat = parsedLat;
          lon = parsedLon;
        }
      }
    }

    if (title && link) {
      items.push({
        title,
        link,
        pubDate,
        description,
        alertLevel,
        eventType,
        country,
        severityText,
        lat,
        lon,
      });
    }
  }

  return items;
}

export class GdacsProvider implements FeedProvider {
  readonly name = "GDACS Disaster Alerts";
  readonly tier: SourceTier = 1;
  readonly feedUrl: string;
  private timeout: number;

  constructor(config?: Partial<FeedProviderConfig>) {
    this.feedUrl = config?.feedUrl || DEFAULT_GDACS_URL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT_MS;
  }

  async getArticles(query?: NewsQuery): Promise<NewsArticle[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let xmlText = "";
    try {
      const response = await fetch(this.feedUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
          "User-Agent": "WeatherGPT-LiveIntelligence/2.0",
        },
      });

      if (!response.ok) {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `GDACS feed returned status ${response.status}: ${response.statusText}`,
          502
        );
      }

      xmlText = await response.text();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `GDACS feed timed out after ${this.timeout}ms`,
          504
        );
      }
      throw err instanceof AppError
        ? err
        : new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            `Failed to fetch GDACS feed: ${err instanceof Error ? err.message : "Network error"}`,
            502
          );
    } finally {
      clearTimeout(timer);
    }

    const gdacsItems = parseGdacsXml(xmlText);
    const fetchedAt = new Date().toISOString();
    const articles: NewsArticle[] = [];
    const limit = query?.limit || 50;

    for (const item of gdacsItems.slice(0, limit)) {
      const canonicalUrl = normalizeCanonicalUrl(item.link);
      const cleanTitle = sanitizeUntrustedText(item.title);
      const cleanSummary = sanitizeUntrustedText(item.description);

      let publishedAt = fetchedAt;
      if (item.pubDate) {
        const parsedDate = new Date(item.pubDate);
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      }

      const id = generateArticleId(canonicalUrl || item.link, publishedAt);

      // Construct rich content with verified GDACS tags
      const metaLines: string[] = [];
      if (item.alertLevel) metaLines.push(`GDACS Alert: ${item.alertLevel}`);
      if (item.eventType) metaLines.push(`Event Type: ${item.eventType}`);
      if (item.country) metaLines.push(`Country: ${item.country}`);
      if (item.severityText) metaLines.push(`Severity: ${item.severityText}`);
      if (item.lat !== undefined && item.lon !== undefined) {
        metaLines.push(`Coordinates: ${item.lat}, ${item.lon}`);
      }

      const fullContent = [cleanSummary, metaLines.join("; ")].filter(Boolean).join("\n\n");

      const candidate: NewsArticle = {
        id,
        title: cleanTitle,
        url: canonicalUrl || item.link,
        source: {
          name: this.name,
          url: this.feedUrl,
          category: "official",
          tier: 1,
        },
        publishedAt,
        fetchedAt,
        summary: cleanSummary || undefined,
        content: fullContent || undefined,
        language: "en",
        sourceTier: 1,
        provenance: {
          provider: this.name,
          retrievedAt: fetchedAt,
          observedAt: publishedAt,
          dataType: "observation",
        },
      };

      const validated = newsArticleSchema.safeParse(candidate);
      if (validated.success) {
        articles.push(validated.data as NewsArticle);
      }
    }

    return articles;
  }

  async fetchArticles(query?: NewsQuery): Promise<NewsArticle[]> {
    return this.getArticles(query);
  }
}

export const GDACSFeedProvider = GdacsProvider;

