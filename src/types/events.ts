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
export type Severity =
  | "info"
  | "low"
  | "moderate"
  | "high"
  | "severe"
  | "extreme"
  | "critical";

/** Event lifecycle state. */
export type EventStatus =
  | "monitoring"
  | "active"
  | "resolved"
  | "archived"
  | "expired";

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

/** Freshness classification levels. */
export type FreshnessLevel = "fresh" | "recent" | "aging" | "stale" | "expired";

/** Freshness metadata for an event. */
export interface FreshnessInfo {
  level: FreshnessLevel;
  label: string;
  isLive: boolean;
  ageMinutes: number;
  lastCheckedAt: ISOTimestamp;
}

/** India impact relevance taxonomy. */
export type IndiaImpactLevel =
  | "DIRECT"
  | "REGIONAL"
  | "POSSIBLE"
  | "LOW"
  | "NONE"
  | "INSUFFICIENT_EVIDENCE";

/** Structured assessment of event relevance to India. */
export interface IndiaImpactAssessment {
  level: IndiaImpactLevel;
  relevanceStatus: ImpactStatus;
  confidence: number;
  summary: string;
  reasons: string[];
  isTransboundary: boolean;
}

/** Timeline entry capturing event detection or status transition. */
export interface EventTimelineEntry {
  timestamp: ISOTimestamp;
  type: "detected" | "source_added" | "severity_updated" | "status_changed";
  description: string;
  sourceName?: string;
}

/** Source comparison breakdown. */
export interface SourceComparison {
  primarySource: EventSource;
  supportingSources: EventSource[];
  highestTier: SourceTier;
  tierBreakdown: Record<SourceTier, number>;
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
  freshness?: FreshnessInfo;
  indiaImpact?: IndiaImpactAssessment;
  timeline?: EventTimelineEntry[];
  sourceComparison?: SourceComparison;
}
