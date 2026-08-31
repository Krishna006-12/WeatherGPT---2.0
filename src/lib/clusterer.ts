/**
 * Deterministic weather event clustering engine.
 * Groups related NewsArticles into unified WeatherEvent records based on:
 * 1. Matching hazard category
 * 2. Overlapping geographic location / country
 * 3. Proximity of publication window (<= 48h)
 * 4. Token overlap
 *
 * Conservative strategy: Never falsely merge unrelated regional events.
 */

import type { NewsArticle } from "@/types/news";
import type { WeatherEvent, Severity, EventStatus, EventLocation } from "@/types/events";
import { detectEventCategory } from "./category-mapper";
import { extractLocationsFromText, locationsToAffectedRegions } from "./geo-normalizer";
import { computeTokenJaccardSimilarity, generateDeterministicHash } from "./deduplicator";

const CLUSTERING_WINDOW_HOURS = 48;
const MIN_TITLE_SIMILARITY_FOR_CLUSTER = 0.15;

/**
 * Deterministically estimate severity from title and excerpt keywords.
 */
function estimateSeverity(text: string): Severity {
  if (
    /\b(catastrophic|devastating|fatalities|massive|emergency|red\s*alert|extreme)\b/i.test(
      text
    )
  ) {
    return "extreme";
  }
  if (
    /\b(severe|heavy|high|evacuat(e|ion)|danger|orange\s*alert|destructive)\b/i.test(
      text
    )
  ) {
    return "high";
  }
  if (/\b(moderate|warning|advisory|yellow\s*alert|alert)\b/i.test(text)) {
    return "moderate";
  }
  return "low";
}

/**
 * Calculate event confidence based on source tiers and source count.
 */
function calculateConfidence(articles: NewsArticle[]): number {
  let highestTier = 3;
  for (const art of articles) {
    if (art.sourceTier < highestTier) {
      highestTier = art.sourceTier;
    }
  }

  let base = 0.45;
  if (highestTier === 1) base = 0.85;
  else if (highestTier === 2) base = 0.65;

  // Add small bonus for multiple independent sources (up to +0.10)
  const sourceBonus = Math.min(0.1, (articles.length - 1) * 0.03);
  return Math.min(0.98, Number((base + sourceBonus).toFixed(2)));
}

/**
 * Generates a clean URL slug from a title.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
}

/**
 * Check if two hazard categories are compatible for clustering.
 */
function isCompatibleCategory(catA: string, catB: string): boolean {
  if (catA === catB && catA !== "other") return true;
  if (
    (catA === "flood" || catA === "flash_flood") &&
    (catB === "flood" || catB === "flash_flood")
  ) {
    return true;
  }
  if (
    (catA === "cyclone" || catA === "tropical_storm") &&
    (catB === "cyclone" || catB === "tropical_storm")
  ) {
    return true;
  }
  if (
    (catA === "severe_storm" || catA === "thunderstorm" || catA === "heavy_rain") &&
    (catB === "severe_storm" || catB === "thunderstorm" || catB === "heavy_rain")
  ) {
    return true;
  }
  return false;
}

/**
 * Check if two articles should be clustered into the same WeatherEvent.
 */
export function shouldClusterArticles(
  articleA: NewsArticle,
  articleB: NewsArticle,
  locationsA: EventLocation[],
  locationsB: EventLocation[]
): boolean {
  // 1. Must share compatible hazard categories
  const catA = detectEventCategory(`${articleA.title} ${articleA.summary || ""}`);
  const catB = detectEventCategory(`${articleB.title} ${articleB.summary || ""}`);

  if (!isCompatibleCategory(catA, catB)) {
    return false;
  }

  // 2. Must share at least one geographic entity (country or region)
  const countriesA = new Set(locationsA.map((l) => l.country));
  const countriesB = new Set(locationsB.map((l) => l.country));
  let hasGeographicOverlap = false;

  for (const c of countriesA) {
    if (countriesB.has(c) && c !== "Global") {
      hasGeographicOverlap = true;
      break;
    }
  }

  if (!hasGeographicOverlap) {
    return false;
  }

  // 3. Must be published within the clustering time window
  const timeA = new Date(articleA.publishedAt).getTime();
  const timeB = new Date(articleB.publishedAt).getTime();

  if (!isNaN(timeA) && !isNaN(timeB)) {
    const hoursDiff = Math.abs(timeA - timeB) / (1000 * 60 * 60);
    if (hoursDiff > CLUSTERING_WINDOW_HOURS) {
      return false;
    }
  }

  // 4. Must share topical title/keyword similarity
  const similarity = computeTokenJaccardSimilarity(articleA.title, articleB.title);
  return similarity >= MIN_TITLE_SIMILARITY_FOR_CLUSTER;
}

/**
 * Cluster a list of NewsArticles into normalized WeatherEvent records.
 */
export function clusterArticlesIntoEvents(articles: NewsArticle[]): WeatherEvent[] {
  if (articles.length === 0) {
    return [];
  }

  // Precompute locations and categories for each article
  const metaMap = new Map<
    string,
    { locations: EventLocation[]; category: ReturnType<typeof detectEventCategory> }
  >();

  for (const article of articles) {
    const fullText = `${article.title} ${article.summary || ""} ${article.content || ""}`;
    const locations = extractLocationsFromText(fullText);
    const category = detectEventCategory(fullText);
    metaMap.set(article.id, { locations, category });
  }

  // Disjoint set clustering
  const clusters: NewsArticle[][] = [];

  for (const article of articles) {
    const meta = metaMap.get(article.id)!;
    let placed = false;

    for (const cluster of clusters) {
      const clusterRepresentative = cluster[0]!;
      const repMeta = metaMap.get(clusterRepresentative.id)!;

      if (
        shouldClusterArticles(
          article,
          clusterRepresentative,
          meta.locations,
          repMeta.locations
        )
      ) {
        cluster.push(article);
        placed = true;
        break;
      }
    }

    if (!placed) {
      clusters.push([article]);
    }
  }

  // Build WeatherEvent objects from clusters
  const events: WeatherEvent[] = [];

  for (const cluster of clusters) {
    // Sort articles in cluster by tier (Tier 1 first) then by pubDate
    cluster.sort((a, b) => {
      if (a.sourceTier !== b.sourceTier) {
        return a.sourceTier - b.sourceTier;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    const leadArticle = cluster[0]!;
    const combinedText = cluster
      .map((a) => `${a.title} ${a.summary || ""}`)
      .join(" ");

    const allLocations: EventLocation[] = [];
    const locationNamesSeen = new Set<string>();

    for (const a of cluster) {
      const locs = metaMap.get(a.id)?.locations || [];
      for (const l of locs) {
        if (!locationNamesSeen.has(l.name)) {
          locationNamesSeen.add(l.name);
          allLocations.push(l);
        }
      }
    }

    const primaryLocation = allLocations[0] || { name: "Global", country: "Global" };
    const affectedRegions = locationsToAffectedRegions(allLocations);
    const category = metaMap.get(leadArticle.id)?.category || "other";
    const severity = estimateSeverity(combinedText);
    const confidence = calculateConfidence(cluster);

    const dates = cluster
      .map((a) => a.publishedAt)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const firstSeenAt = dates[0] || new Date().toISOString();
    const lastUpdatedAt = dates[dates.length - 1] || new Date().toISOString();

    const slug = slugify(`${primaryLocation.name}-${category}-${firstSeenAt.slice(0, 10)}`);
    const id = `evt_${generateDeterministicHash(slug + firstSeenAt)}`;

    const event: WeatherEvent = {
      id,
      slug,
      title: leadArticle.title,
      category,
      hazard: category,
      severity,
      status: "active" as EventStatus,
      description: leadArticle.summary || leadArticle.title,
      summary: leadArticle.summary,
      location: primaryLocation,
      locations: allLocations,
      affectedRegions,
      firstSeenAt,
      lastUpdatedAt,
      confidence,
      sourceArticleIds: cluster.map((a) => a.id),
      sources: cluster.map((a) => ({
        name: a.source.name,
        url: a.source.url || a.url,
        publishedAt: a.publishedAt,
        category: a.source.category,
        tier: a.sourceTier,
      })),
      impacts: [],
      provenance: [
        {
          provider: leadArticle.source.name,
          retrievedAt: leadArticle.fetchedAt,
          observedAt: leadArticle.publishedAt,
          dataType: "observation",
        },
      ],
    };

    events.push(event);
  }

  return events;
}
