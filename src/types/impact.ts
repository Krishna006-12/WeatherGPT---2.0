/**
 * Impact Engine data contracts and types.
 * Derived from docs/MASTER_SPEC.md and docs/ARCHITECTURE.md.
 */

import type { ISOTimestamp } from "./common";
import type { EventCategory, EventLocation, IndiaImpactAssessment } from "./events";
import type { DataProvenance } from "./weather";

/** Structured impact level. */
export type ImpactLevel = "none" | "low" | "moderate" | "high" | "extreme";

/** Explicit relevance status without collapsing uncertainty into a single number. */
export type RelevanceStatus =
  | "confirmed"
  | "likely"
  | "possible"
  | "monitoring"
  | "unlikely"
  | "unknown";

/** Controlled evidence taxonomy for explainability. */
export type EvidenceType =
  | "explicit_city_match"
  | "explicit_region_match"
  | "explicit_country_match"
  | "geographic_proximity"
  | "official_authority_citation"
  | "weather_condition_aligned"
  | "weather_condition_neutral"
  | "downstream_unestablished"
  | "no_evidence_available";

/** Machine-readable evidence item backing an impact assessment. */
export interface EvidenceItem {
  type: EvidenceType;
  description: string;
  weight: "supporting" | "neutral" | "refuting";
  source?: string;
}

/**
 * The normalized Impact Assessment contract.
 * Answers: "How relevant is this event to this target location?"
 */
export interface ImpactAssessment {
  id: string;
  eventId: string;
  targetLocation: EventLocation;
  hazard: EventCategory;
  impactLevel: ImpactLevel;
  relevanceStatus: RelevanceStatus;
  confidence: number; // 0.0 to 1.0 deterministic score
  reasons: string[];
  evidence: EvidenceItem[];
  assessedAt: ISOTimestamp;
  methodology: string; // e.g. "impact-engine-v1"
  provenance: DataProvenance[];
  eventFact?: string;
  geographicRelevance?: string;
  actualHazardImpact?: string;
  advisory?: string;
  indiaImpact?: IndiaImpactAssessment;
}
