/**
 * Normalized Context Event Contract — WeatherGPT 2.0.
 *
 * Provides structured, verified, and location-relevant weather events
 * (such as floods, cyclones, heatwaves, and official advisories)
 * to augment weather forecasts and grounded AI responses.
 */

import type { Coordinates, ISOTimestamp } from "./common";
import type { NewsSource } from "./news";
import type { DataProvenance } from "./weather";
import type { ProximityTier } from "@/lib/geo-distance";

export type ContextEventCategory =
  | "flood"
  | "heatwave"
  | "cyclone"
  | "storm"
  | "heavy_rain"
  | "cold_wave"
  | "drought"
  | "wildfire"
  | "landslide"
  | "advisory"
  | "other";

export interface ContextEventLocation {
  name: string;
  country?: string;
  region?: string;
  coordinates?: Coordinates;
}

export interface LocationRelevance {
  /** Relevance score between 0.0 and 1.0 */
  score: number;
  /** Distance from target location in kilometers */
  distanceKm?: number;
  /** Categorized proximity tier */
  proximity: ProximityTier | "unknown";
  /** Deterministic human-readable explanation of why this event is relevant */
  reasons: string[];
}

export interface ContextEvent {
  id: string;
  headline: string;
  summary?: string;
  source: NewsSource;
  timestamp: ISOTimestamp;
  category: ContextEventCategory;
  location: ContextEventLocation;
  locationRelevance?: LocationRelevance;
  score?: number;
  url?: string;
  provenance: DataProvenance;
}
