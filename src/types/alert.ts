/**
 * Type definitions for deterministic weather alerts.
 *
 * Implements Phase 5 severe-weather alerting contracts:
 * Threshold-based physical alerts produced by pure code without LLM involvement.
 */

import type { ISOTimestamp } from "./common";

/** Alert severity levels matching meteorological risk gradations. */
export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme";

/** Weather alert categories. */
export type AlertCategory =
  | "heat"
  | "heavy_rain"
  | "wind"
  | "cyclone"
  | "thunderstorm"
  | "flood"
  | "cold_wave"
  | "air_quality";

/**
 * Deterministic alert produced by evaluating weather snapshot observations against rules.
 */
export interface Alert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  headline: string;
  description: string;
  source: string;
  effectiveAt: ISOTimestamp;
  expiresAt: ISOTimestamp;
  thresholdMetric: string;
  observedValue: number | string;
  thresholdValue: number | string;
  affectedLocation?: string;
}

/** Options for alert evaluation */
export interface AlertEvaluationOptions {
  locationName?: string;
  evaluatedAt?: ISOTimestamp;
}
