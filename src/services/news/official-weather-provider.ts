/**
 * Official Meteorological Alert Provider.
 *
 * Tier 1 official meteorological and weather warning feed adapter.
 * Supports official National Weather Service (NWS / NOAA) and international
 * alert feeds, transforming CAP/Atom/GeoJSON alerts into canonical NewsArticle records.
 */

import type { NewsArticle, SourceTier } from "@/types/news";
import type { FeedProvider, FeedProviderConfig } from "./feed-provider";
import type { NewsQuery } from "./news-provider";
import { sanitizeUntrustedText } from "@/lib/text-sanitizer";
import { normalizeCanonicalUrl } from "@/lib/url-normalizer";
import { generateArticleId } from "@/lib/deduplicator";
import { newsArticleSchema } from "@/schemas/news";
import { AppError } from "@/lib/errors";

const DEFAULT_NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";
const DEFAULT_TIMEOUT_MS = 10_000;

interface NwsAlertFeature {
  id: string;
  properties: {
    event: string;
    headline?: string;
    description?: string;
    severity?: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
    certainty?: string;
    urgency?: string;
    areaDesc?: string;
    effective?: string;
    expires?: string;
    senderName?: string;
  };
  geometry?: {
    type: string;
    coordinates?: unknown;
  };
}

interface NwsAlertsResponse {
  features?: NwsAlertFeature[];
}

export class OfficialWeatherProvider implements FeedProvider {
  readonly name: string;
  readonly tier: SourceTier = 1;
  readonly feedUrl: string;
  private timeout: number;

  constructor(config?: Partial<FeedProviderConfig>) {
    this.name = config?.name || "Official Weather Service Alerts";
    this.feedUrl = config?.feedUrl || DEFAULT_NWS_ALERTS_URL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT_MS;
  }

  async getArticles(query?: NewsQuery): Promise<NewsArticle[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let data: NwsAlertsResponse;
    try {
      const response = await fetch(this.feedUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/geo+json, application/json",
          "User-Agent": "WeatherGPT-LiveIntelligence/2.0 (contact@weathergpt.local)",
        },
      });

      if (!response.ok) {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `Official weather alert feed returned status ${response.status}: ${response.statusText}`,
          502
        );
      }

      data = await response.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `Official weather feed timed out after ${this.timeout}ms`,
          504
        );
      }
      throw err instanceof AppError
        ? err
        : new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            `Failed to fetch official weather alerts: ${err instanceof Error ? err.message : "Network error"}`,
            502
          );
    } finally {
      clearTimeout(timer);
    }

    const features = Array.isArray(data.features) ? data.features : [];
    const fetchedAt = new Date().toISOString();
    const articles: NewsArticle[] = [];
    const limit = query?.limit || 50;

    for (const feat of features.slice(0, limit)) {
      const props = feat.properties;
      if (!props || !props.event) continue;

      const title = sanitizeUntrustedText(
        props.headline || `${props.event} Alert - ${props.areaDesc || "Affected Region"}`
      );
      const summary = sanitizeUntrustedText(
        props.description ? props.description.slice(0, 500) : `${props.event} warning in effect.`
      );
      const publishedAt = props.effective
        ? new Date(props.effective).toISOString()
        : fetchedAt;

      const rawUrl = feat.id && (feat.id.startsWith("http://") || feat.id.startsWith("https://"))
        ? feat.id
        : `${this.feedUrl}#${feat.id || "alert"}`;
      const url = normalizeCanonicalUrl(rawUrl) || this.feedUrl;
      const id = generateArticleId(url, publishedAt);

      const metaParts = [
        `Event: ${props.event}`,
        `Severity: ${props.severity || "Unknown"}`,
        `Urgency: ${props.urgency || "Unknown"}`,
        `Area: ${props.areaDesc || "Unspecified"}`,
      ];
      if (props.senderName) metaParts.push(`Issued By: ${props.senderName}`);

      const fullContent = `${summary}\n\n${metaParts.join("; ")}`;

      const candidate: NewsArticle = {
        id,
        title,
        url,
        source: {
          name: props.senderName || this.name,
          url: this.feedUrl,
          category: "official",
          tier: 1,
        },
        publishedAt,
        fetchedAt,
        summary,
        content: fullContent,
        language: "en",
        sourceTier: 1,
        provenance: {
          provider: props.senderName || this.name,
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

export const OfficialWeatherAlertsProvider = OfficialWeatherProvider;

