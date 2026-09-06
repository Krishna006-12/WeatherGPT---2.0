/**
 * USGS (United States Geological Survey) Earthquake Feed Provider.
 *
 * Official authoritative Tier 1 feed adapter.
 * Parses USGS Earthquake GeoJSON feeds:
 * extracts verified magnitudes, hypocenter coordinates [lon, lat, depth],
 * place descriptions, timestamps, and tsunami warnings without fabrication.
 */

import type { NewsArticle, SourceTier } from "@/types/news";
import type { FeedProvider, FeedProviderConfig } from "./feed-provider";
import type { NewsQuery } from "./news-provider";
import { sanitizeUntrustedText } from "@/lib/text-sanitizer";
import { normalizeCanonicalUrl } from "@/lib/url-normalizer";
import { generateArticleId } from "@/lib/deduplicator";
import { newsArticleSchema } from "@/schemas/news";
import { AppError } from "@/lib/errors";

const DEFAULT_USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson";
const DEFAULT_TIMEOUT_MS = 10_000;

export interface UsgsFeature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    updated?: number;
    url: string;
    alert?: string | null;
    status?: string | null;
    tsunami?: number | null;
    title?: string | null;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number?]; // [lon, lat, depth]
  };
}

export interface UsgsGeoJson {
  type: string;
  features?: UsgsFeature[];
}

export function parseUsgsGeoJson(json: UsgsGeoJson): UsgsFeature[] {
  if (!json || json.type !== "FeatureCollection" || !Array.isArray(json.features)) {
    return [];
  }
  return json.features.filter(
    (f) =>
      f &&
      f.properties &&
      f.geometry &&
      Array.isArray(f.geometry.coordinates) &&
      f.geometry.coordinates.length >= 2
  );
}

export class UsgsProvider implements FeedProvider {
  readonly name = "USGS Earthquake Hazards Program";
  readonly tier: SourceTier = 1;
  readonly feedUrl: string;
  private timeout: number;

  constructor(config?: Partial<FeedProviderConfig>) {
    this.feedUrl = config?.feedUrl || DEFAULT_USGS_URL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT_MS;
  }

  async getArticles(query?: NewsQuery): Promise<NewsArticle[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let data: UsgsGeoJson;
    try {
      const response = await fetch(this.feedUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/json, application/geo+json",
          "User-Agent": "WeatherGPT-LiveIntelligence/2.0",
        },
      });

      if (!response.ok) {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `USGS feed returned status ${response.status}: ${response.statusText}`,
          502
        );
      }

      data = await response.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `USGS feed timed out after ${this.timeout}ms`,
          504
        );
      }
      throw err instanceof AppError
        ? err
        : new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            `Failed to fetch USGS feed: ${err instanceof Error ? err.message : "Network error"}`,
            502
          );
    } finally {
      clearTimeout(timer);
    }

    const features = parseUsgsGeoJson(data);
    const fetchedAt = new Date().toISOString();
    const articles: NewsArticle[] = [];
    const limit = query?.limit || 50;

    for (const feat of features.slice(0, limit)) {
      const { properties: props, geometry: geom } = feat;
      const magStr = props.mag !== null && props.mag !== undefined ? props.mag.toFixed(1) : "Unknown";
      const placeStr = props.place ? sanitizeUntrustedText(props.place) : "Unknown Region";
      const rawTitle = props.title || `M ${magStr} Earthquake - ${placeStr}`;
      const cleanTitle = sanitizeUntrustedText(rawTitle);

      const lon = geom.coordinates[0];
      const lat = geom.coordinates[1];
      const depth = geom.coordinates[2];

      const publishedAt = props.time
        ? new Date(props.time).toISOString()
        : fetchedAt;

      const articleUrl = props.url
        ? normalizeCanonicalUrl(props.url)
        : `https://earthquake.usgs.gov/earthquakes/eventpage/${feat.id}`;

      const id = generateArticleId(articleUrl, publishedAt);

      const summary = `Magnitude ${magStr} earthquake reported: ${placeStr}. Depth: ${depth !== undefined ? `${depth} km` : "N/A"}.`;
      
      const metaParts = [
        `Magnitude: ${magStr}`,
        `Location: ${placeStr}`,
        `Coordinates: ${lat}, ${lon}`,
      ];
      if (depth !== undefined) metaParts.push(`Depth: ${depth} km`);
      if (props.alert) metaParts.push(`USGS PAGER Alert: ${props.alert}`);
      if (props.tsunami === 1) metaParts.push("Tsunami Warning: Possible");
      if (props.status) metaParts.push(`Review Status: ${props.status}`);

      const fullContent = `${summary}\n\n${metaParts.join("; ")}`;

      const candidate: NewsArticle = {
        id,
        title: cleanTitle,
        url: articleUrl,
        source: {
          name: this.name,
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

export const USGSFeedProvider = UsgsProvider;

