/**
 * Data contracts and types for the Unified Weather Risk Center.
 * Derived from Phase 9 specifications.
 */

import type { Coordinates, ISOTimestamp } from "./common";
import type { LocationInfo, DataProvenance } from "./weather";

/** The 6 initial deterministic weather risk categories. */
export type RiskCategory =
  | "heat"
  | "heavy_rain"
  | "thunderstorm"
  | "wind"
  | "uv"
  | "flood"
  | "drought"
  | "cyclone";

/** Deterministic severity classifications. */
export type RiskSeverity =
  | "low"
  | "moderate"
  | "high"
  | "extreme"
  | "no_evidence"
  | "unavailable";

/** Confidence levels reflecting evidence availability and quality. */
export type RiskConfidence = "low" | "moderate" | "high";

/** Evidence status for the risk evaluator. */
export type RiskStatus =
  | "available"
  | "insufficient_evidence"
  | "unavailable"
  | "no_evidence";

/** Individual structured evidence item backing a risk finding. */
export interface RiskEvidenceItem {
  metric: string;
  value: string | number;
  unit?: string;
  source: string;
  timestamp: ISOTimestamp;
}

/** Structured risk assessment for an individual risk category. */
export interface RiskAssessment {
  type: RiskCategory;
  severity: RiskSeverity;
  confidence: RiskConfidence;
  evidence: RiskEvidenceItem[];
  timeWindow: string;
  recommendation: string;
  status: RiskStatus;
  reason?: string;
  provenance?: DataProvenance[];
}

/** Complete Weather Risk Report for a given location and time period. */
export interface WeatherRiskReport {
  location: LocationInfo;
  period: string;
  targetDate?: string;
  overallSeverity: RiskSeverity;
  assessments: RiskAssessment[];
  evaluatedAt: ISOTimestamp;
  provenance: DataProvenance[];
}
