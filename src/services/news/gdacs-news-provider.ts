/**
 * GDACS Context News & Event Provider Adapter — WeatherGPT 2.0.
 *
 * Implements the NewsProvider adapter interface for the Global Disaster Alert
 * and Coordination System (GDACS — UN OCHA & European Commission).
 *
 * Why GDACS:
 * 1. Authoritative Tier 1 official disaster alerts.
 * 2. Real coordinates (<geo:lat>, <geo:long>) for exact Haversine distance calculations.
 * 3. Covers major meteorological hazards: floods, tropical cyclones, droughts, wildfires.
 * 4. Free, public, zero client exposure of credentials.
 */

import type { ContextEvent, ContextEventCategory } from "@/types/context-event";
import type { NewsProvider, NewsProviderConfig, ContextNewsQuery } from "./news-provider";
import { parseGdacsXml, type GdacsItem } from "./gdacs-provider";
import { contextEventSchema } from "@/schemas/context-event";
import { generateDeterministicHash } from "@/lib/deduplicator";
import { AppError } from "@/lib/errors";

const DEFAULT_GDACS_FEED_URL = "https://www.gdacs.org/xml/rss.xml";
const DEFAULT_TIMEOUT_MS = 10_000;

function mapGdacsToCategory(item: GdacsItem): ContextEventCategory {
  const code = (item.eventType || "").toUpperCase();
  if (code === "FL") return "flood";
  if (code === "TC") return "cyclone";
  if (code === "DR") return "drought";
  if (code === "WF") return "wildfire";

  const lower = `${item.title} ${item.description || ""}`.toLowerCase();
  if (lower.includes("flood") || lower.includes("inundation")) return "flood";
  if (lower.includes("cyclone") || lower.includes("typhoon") || lower.includes("hurricane")) return "cyclone";
  if (lower.includes("heatwave") || lower.includes("heat wave")) return "heatwave";
  if (lower.includes("coldwave") || lower.includes("cold wave")) return "cold_wave";
  if (lower.includes("heavy rain") || lower.includes("downpour") || lower.includes("cloudburst")) return "heavy_rain";
  if (lower.includes("storm") || lower.includes("gale") || lower.includes("thunderstorm")) return "storm";
  if (lower.includes("landslide") || lower.includes("mudslide")) return "landslide";
  if (lower.includes("drought") || lower.includes("dry spell")) return "drought";
  if (lower.includes("advisory") || lower.includes("warning") || lower.includes("alert")) return "advisory";

  return "other";
}

export class GdacsNewsProvider implements NewsProvider {
  readonly name = "gdacs";
  private feedUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: NewsProviderConfig = {}) {
    this.feedUrl = config.feedUrl || process.env.GDACS_BASE_URL || DEFAULT_GDACS_FEED_URL;
    this.apiKey = config.apiKey || process.env.NEWS_API_KEY;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
  }

  async getContextEvents(query?: ContextNewsQuery): Promise<ContextEvent[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      const headers: Record<string, string> = {
        Accept: "application/rss+xml, application/xml, text/xml",
      };
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      response = await fetch(this.feedUrl, {
        signal: controller.signal,
        headers,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AppError(
          "NEWS_PROVIDER_UNAVAILABLE",
          `GDACS news feed request timed out after ${this.timeout}ms`,
          504
        );
      }
      throw new AppError(
        "NEWS_PROVIDER_UNAVAILABLE",
        `Failed to reach GDACS news feed: ${err instanceof Error ? err.message : "Network error"}`,
        502
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new AppError(
          "RATE_LIMITED",
          "GDACS news feed rate limit exceeded. Please try again later.",
          429
        );
      }
      throw new AppError(
        "NEWS_PROVIDER_UNAVAILABLE",
        `GDACS news feed returned status ${response.status}: ${response.statusText}`,
        502
      );
    }

    let xmlText: string;
    try {
      xmlText = await response.text();
    } catch {
      throw new AppError(
        "NEWS_RESPONSE_INVALID",
        "GDACS returned unreadable response text",
        502
      );
    }

    const items = parseGdacsXml(xmlText);
    if (items.length === 0 && !xmlText.includes("<rss") && !xmlText.includes("<xml")) {
      throw new AppError(
        "NEWS_RESPONSE_INVALID",
        "GDACS returned invalid XML feed structure",
        502
      );
    }

    const retrievedAt = new Date().toISOString();
    const events: ContextEvent[] = [];

    for (const item of items) {
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : retrievedAt;
      const idHash = generateDeterministicHash(`${item.link}_${pubDate}`);

      const candidate: ContextEvent = {
        id: `ctx_${idHash}`,
        headline: item.title,
        summary: item.description || item.severityText,
        source: {
          name: "GDACS",
          url: "https://www.gdacs.org",
          category: "official",
          tier: 1,
        },
        timestamp: pubDate,
        category: mapGdacsToCategory(item),
        location: {
          name: item.country || "Global Region",
          country: item.country,
          coordinates:
            item.lat !== undefined && item.lon !== undefined
              ? { latitude: item.lat, longitude: item.lon }
              : undefined,
        },
        url: item.link,
        provenance: {
          provider: this.name,
          dataSource: "GDACS Official Feed",
          retrievedAt,
          observedAt: pubDate,
          dataType: "observation",
          confidence: 1.0,
        },
      };

      // Strict boundary validation
      const parseResult = contextEventSchema.safeParse(candidate);
      if (!parseResult.success) {
        throw new AppError(
          "NEWS_RESPONSE_INVALID",
          `GDACS event schema validation failed: ${parseResult.error.message}`,
          502
        );
      }

      // Filter by category if requested
      if (query?.category && candidate.category !== query.category) {
        continue;
      }

      events.push(parseResult.data);
    }

    if (query?.limit && query.limit > 0) {
      return events.slice(0, query.limit);
    }

    return events;
  }
}
