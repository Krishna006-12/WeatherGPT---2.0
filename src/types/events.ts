/**
 * Normalized live weather event contracts.
 * Derived from docs/ARCHITECTURE.md and docs/LIVE_INTELLIGENCE.md.
 */

import type { Coordinates, ISOTimestamp } from "./common";
import type { DataProvenance } from "./weather";
import type { NewsSourceCategory, SourceTier } from "./news";

/** Controlled event categories. */
export type EventCategory =
  | "flood"
  | "flash_flood"
  | "cyclone"
  | "tropical_storm"
  | "severe_storm"
  | "heavy_rain"
  | "thunderstorm"
  | "lightning"
  | "heatwave"
  | "cold_wave"
  | "drought"
  | "wildfire"
  | "landslide"
  | "avalanche"
  | "dust_storm"
  | "earthquake"
  | "tsunami"
  | "volcanic"
  | "other";

/** Legacy/alternative alias for hazard categories. */
export type HazardType = EventCategory;

/** Event severity level. */
export type Severity = "low" | "moderate" | "high" | "extreme";

/** Event lifecycle state. */
export type EventStatus = "monitoring" | "active" | "resolved" | "archived";

/** Structured impact status. */
export type ImpactStatus =
  | "confirmed"
  | "likely"
  | "possible"
  | "monitoring"
  | "unlikely"
  | "unknown";

/** Geographic location metadata of an event. */
export interface EventLocation {
  name: string;
  country: string;
  region?: string;
  city?: string;
  coordinates?: Coordinates;
  timezone?: string;
}

/** A region affected by the event. */
export interface EventRegion {
  name: string;
  country: string;
  coordinates?: Coordinates;
}

/** A verified source backing an event claim. */
export interface EventSource {
  name: string;
  url?: string;
  publishedAt: ISOTimestamp;
  category: NewsSourceCategory;
  tier: SourceTier;
}

/** Regional impact assessment for a specific area. */
export interface RegionalImpact {
  region: EventRegion;
  status: ImpactStatus;
  severity: Severity;
  description?: string;
}

/**
 * The normalized weather event contract.
 * Every live-intelligence consumer uses this shape.
 */
export interface WeatherEvent {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  hazard: EventCategory;
  severity: Severity;
  status: EventStatus;
  description: string;
  summary?: string;
  location: EventLocation;
  locations: EventLocation[];
  affectedRegions: EventRegion[];
  firstSeenAt: ISOTimestamp;
  lastUpdatedAt: ISOTimestamp;
  confidence: number;
  sourceArticleIds: string[];
  sources: EventSource[];
  impacts: RegionalImpact[];
  provenance: DataProvenance[];
}
