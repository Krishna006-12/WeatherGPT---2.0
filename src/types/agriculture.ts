/**
 * Agriculture Intelligence v1 Data Contracts.
 *
 * Weather-based agricultural decision-support models strictly derived from
 * atmospheric observations and forecast metrics.
 *
 * Grounding constraint: No sensor, soil, disease diagnosis, or stage-specific
 * telemetry is assumed or fabricated.
 */

import type { Coordinates, ISOTimestamp } from "./common";
import type { DataProvenance } from "./weather";

/** Supported v1 crop types. */
export type CropType = "wheat" | "rice" | "maize" | "potato" | "mustard" | "generic";

/** Supported v1 agriculture activity types. */
export type AgricultureActivityType =
  | "irrigation"
  | "spraying"
  | "sowing"
  | "harvesting"
  | "outdoor_field_work";

/** Standard risk level classification. */
export type RiskLevel = "low" | "moderate" | "high" | "critical";

/** Suitability status for farm field activities. */
export type ActivityStatus = "favorable" | "caution" | "unfavorable";

/** Activity advisory evaluation. */
export interface AgricultureActivity {
  status: ActivityStatus;
  advisory: string;
  reason: string;
}

/** Individual weather hazard detected for a crop. */
export interface AgricultureHazard {
  type: string;
  severity: RiskLevel;
  description: string;
  triggerMetric: string;
  evidence: string;
}

/** Specific piece of meteorological evidence backing an assessment. */
export interface AgricultureEvidence {
  parameter: string;
  observationOrForecast: string;
  impactOnCrop: string;
}

/** Forecast metrics aggregated across key agronomic windows. */
export interface AgricultureForecastSummary {
  next24hPrecipMm: number;
  next48hPrecipMm: number;
  sevenDayPrecipSumMm: number;
  maxTemperatureC: number;
  minTemperatureC: number;
  maxWindSpeedKmh: number;
  averageHumidityPct: number;
}

/** Heuristic crop sensitivity definition based purely on meteorological thresholds. */
export interface CropProfile {
  crop: CropType;
  displayName: string;
  temperature: {
    heatStressThresholdC: number;
    extremeHeatThresholdC: number;
    coldChillingThresholdC: number;
    frostThresholdC: number;
  };
  precipitation: {
    moderate24hRainMm: number;
    heavy24hRainMm: number;
    excessive7dRainMm: number;
  };
  wind: {
    sprayingWindLimitKmh: number;
    lodgingWindRiskKmh: number;
  };
  humidity: {
    highHumidityThresholdPct: number;
  };
  notes: string;
}

/**
 * The normalized Agriculture Assessment contract.
 * Returned by AgricultureService, API route, and Copilot tools.
 */
export interface AgricultureAssessment {
  id: string;
  crop?: CropType;
  cropDisplayName: string;
  location: {
    name: string;
    coordinates?: Coordinates;
  };
  assessedAt: ISOTimestamp;
  overallRiskLevel: RiskLevel;
  primaryHazard?: string;
  activities: {
    irrigation: AgricultureActivity;
    spraying: AgricultureActivity;
    fieldOperations: AgricultureActivity;
    sowing?: AgricultureActivity;
    harvesting?: AgricultureActivity;
    outdoorFieldWork?: AgricultureActivity;
  };
  hazards: AgricultureHazard[];
  forecastSummary: AgricultureForecastSummary;
  evidence: AgricultureEvidence[];
  cropEvidenceNote?: string;
  disclaimer: string;
  provenance: DataProvenance[];
}
