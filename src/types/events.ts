/**
 * Normalized live weather event contracts.
 * Derived from docs/ARCHITECTURE.md Section 5.
 */

import type { Coordinates, ISOTimestamp } from './common';
import type { DataProvenance } from './weather';

/** Hazard categories for weather events. */
export type HazardType =
  | 'flood'
  | 'cyclone'
  | 'storm'
  | 'heatwave'
  | 'coldwave'
  | 'landslide'
  | 'drought'
  | 'wildfire'
  | 'avalanche'
  | 'earthquake'
  | 'other';

/** Event severity level. */
export type Severity = 'low' | 'moderate' | 'high' | 'extreme';

/** Structured impact status — never a free-form LLM guess. */
export type ImpactStatus =
  | 'confirmed'
  | 'likely'
  | 'possible'
  | 'monitoring'
  | 'unlikely'
  | 'unknown';

/** Geographic location of an event. */
export interface EventLocation {
  name: string;
  coordinates?: Coordinates;
  country: string;
  region?: string;
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
  url: string;
  publishedAt: ISOTimestamp;
  category: 'official' | 'government' | 'wire' | 'news' | 'other';
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
  hazard: HazardType;
  severity: Severity;
  summary: string;
  startedAt?: ISOTimestamp;
  updatedAt: ISOTimestamp;
  location: EventLocation;
  affectedRegions: EventRegion[];
  sources: EventSource[];
  confidence: number;
  impacts: RegionalImpact[];
  provenance: DataProvenance[];
}
