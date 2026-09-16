/**
 * Deterministic Context Event Deduplicator and Location-Relevance Scorer.
 *
 * Implements pure, deterministic TypeScript calculations (NO LLMs):
 * 1. Token-similarity headline deduplication (Jaccard coefficient on stemmed tokens).
 * 2. Spatial distance calculation via Haversine formula and radius filtering.
 * 3. Multi-factor location-relevance scoring (distance, recency, source-trust).
 */

import type { Coordinates } from "@/types/common";
import type { ContextEvent, LocationRelevance } from "@/types/context-event";
import { calculateHaversineDistanceKm, getProximityTier, type ProximityTier } from "@/lib/geo-distance";
import { computeTokenJaccardSimilarity } from "@/lib/deduplicator";

export interface ScoreOptions {
  maxRadiusKm?: number;
  now?: number; // Injectable timestamp for deterministic testing
}

/**
 * Deduplicate an array of ContextEvents.
 * Collapses near-duplicate headlines within a 48-hour publication window,
 * preserving the entry with higher source trustworthiness or more recent timestamp.
 */
export function deduplicateContextEvents(
  events: ContextEvent[],
  titleSimilarityThreshold: number = 0.65
): ContextEvent[] {
  const uniqueEvents: ContextEvent[] = [];

  for (const event of events) {
    let duplicateIndex = -1;

    for (let i = 0; i < uniqueEvents.length; i++) {
      const existing = uniqueEvents[i]!;

      // Check URL match
      if (event.url && existing.url && event.url === existing.url) {
        duplicateIndex = i;
        break;
      }

      // Check headline similarity within 48-hour publication window
      const timeA = new Date(event.timestamp).getTime();
      const timeB = new Date(existing.timestamp).getTime();
      const hoursDiff = Math.abs(timeA - timeB) / (1000 * 3600);

      if (hoursDiff <= 48) {
        const similarity = computeTokenJaccardSimilarity(
          event.headline,
          existing.headline
        );
        if (similarity >= titleSimilarityThreshold) {
          duplicateIndex = i;
          break;
        }
      }
    }

    if (duplicateIndex === -1) {
      uniqueEvents.push(event);
    } else {
      const existing = uniqueEvents[duplicateIndex]!;
      // Retain the event with higher source tier (Tier 1 < Tier 2 < Tier 3)
      const eventTier = event.source.tier;
      const existingTier = existing.source.tier;

      if (eventTier < existingTier) {
        uniqueEvents[duplicateIndex] = event;
      } else if (eventTier === existingTier) {
        // If equal tier, retain more recent event
        const timeEvent = new Date(event.timestamp).getTime();
        const timeExisting = new Date(existing.timestamp).getTime();
        if (timeEvent > timeExisting) {
          uniqueEvents[duplicateIndex] = event;
        }
      }
    }
  }

  return uniqueEvents;
}

/**
 * Calculates deterministic source-trust factor (0.0 to 1.0).
 * Tier 1 (official/government) = 1.0
 * Tier 2 (wire/major news) = 0.85
 * Tier 3 (other) = 0.60
 */
export function calculateSourceTrustWeight(tier: number): number {
  if (tier === 1) return 1.0;
  if (tier === 2) return 0.85;
  return 0.6;
}

/**
 * Calculates deterministic recency factor (0.0 to 1.0).
 */
export function calculateRecencyWeight(
  timestamp: string,
  nowMs: number = Date.now()
): { weight: number; hoursAgo: number; label: string } {
  const eventTime = new Date(timestamp).getTime();
  if (isNaN(eventTime)) {
    return { weight: 0.5, hoursAgo: 999, label: "unknown time" };
  }

  const hoursAgo = Math.max(0, (nowMs - eventTime) / (1000 * 3600));

  let weight = 0.3;
  let label = `${Math.round(hoursAgo / 24)}d`;

  if (hoursAgo <= 6) {
    weight = 1.0;
    label = `${Math.max(1, Math.round(hoursAgo))}h`;
  } else if (hoursAgo <= 24) {
    weight = 0.85;
    label = `${Math.round(hoursAgo)}h`;
  } else if (hoursAgo <= 48) {
    weight = 0.7;
    label = "1d";
  } else if (hoursAgo <= 168) {
    weight = 0.5;
    label = `${Math.round(hoursAgo / 24)}d`;
  }

  return { weight, hoursAgo, label };
}

/**
 * Calculates deterministic spatial distance factor (0.0 to 1.0) and proximity tier.
 */
export function calculateDistanceWeight(distanceKm?: number): {
  weight: number;
  proximity: ProximityTier | "unknown";
} {
  if (distanceKm === undefined) {
    return { weight: 0.5, proximity: "unknown" };
  }

  const proximity = getProximityTier(distanceKm);

  if (distanceKm <= 50) {
    return { weight: 1.0, proximity };
  }
  if (distanceKm <= 150) {
    return { weight: 0.85, proximity };
  }
  if (distanceKm <= 300) {
    return { weight: 0.65, proximity };
  }
  if (distanceKm <= 500) {
    return { weight: 0.45, proximity };
  }

  return {
    weight: Math.max(0.1, Number((1 - distanceKm / 2000).toFixed(2))),
    proximity,
  };
}

/**
 * Filter and score context events for a target location.
 * Events exceeding options.maxRadiusKm (if coordinates are provided) are filtered out.
 * Returns events sorted by overall relevance score descending.
 */
export function scoreAndFilterContextEvents(
  events: ContextEvent[],
  userLocation?: Coordinates,
  options: ScoreOptions = {}
): ContextEvent[] {
  const maxRadius = options.maxRadiusKm ?? 500;
  const nowMs = options.now ?? Date.now();

  const scored: ContextEvent[] = [];

  for (const event of events) {
    const reasons: string[] = [];
    let distanceKm: number | undefined;

    if (userLocation && event.location.coordinates) {
      distanceKm = calculateHaversineDistanceKm(
        userLocation,
        event.location.coordinates
      );

      // Distance-based filtering: drop events beyond maxRadius
      if (distanceKm > maxRadius) {
        continue;
      }
    }

    const { weight: distWeight, proximity } = calculateDistanceWeight(distanceKm);
    const trustWeight = calculateSourceTrustWeight(event.source.tier);
    const { weight: recencyWeight, label: timeLabel } = calculateRecencyWeight(
      event.timestamp,
      nowMs
    );

    if (distanceKm !== undefined) {
      reasons.push(
        `Within ${Math.round(distanceKm)}km of location (${proximity} proximity)`
      );
    } else {
      reasons.push("Broad regional advisory (coordinates not pinpointed)");
    }

    reasons.push(
      `Tier ${event.source.tier} ${event.source.category} source (${event.source.name})`
    );
    reasons.push(`Reported ${timeLabel} ago`);

    // Weighted composite relevance score: 50% distance, 30% recency, 20% trust
    const overallScore = Number(
      (distWeight * 0.5 + recencyWeight * 0.3 + trustWeight * 0.2).toFixed(3)
    );

    const locationRelevance: LocationRelevance = {
      score: distWeight,
      distanceKm,
      proximity,
      reasons,
    };

    scored.push({
      ...event,
      locationRelevance,
      score: overallScore,
    });
  }

  // Sort by overall score descending
  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
