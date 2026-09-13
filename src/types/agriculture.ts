/**
 * Agriculture Intelligence Data Contracts.
 *
 * Weather-based agricultural decision-support models strictly derived from
 * atmospheric observations and forecast metrics, enriched with ICAR agronomic citations,
 * FAO-56 Penman-Monteith ET₀ evapotranspiration, and SoilGrids parameters.
 */

import type { Coordinates, ISOTimestamp } from "./common";
import type { DataProvenance } from "./weather";

/** Supported crop types (24+ ICAR prioritized crops + generic). */
export type CropType =
  | "wheat"
  | "rice"
  | "maize"
  | "potato"
  | "mustard"
  | "cotton"
  | "sugarcane"
  | "chickpea"
  | "soybean"
  | "groundnut"
  | "tomato"
  | "onion"
  | "chili"
  | "tea"
  | "coffee"
  | "barley"
  | "sorghum"
  | "pearl_millet"
  | "pigeon_pea"
  | "lentil"
  | "garlic"
  | "jute"
  | "mango"
  | "banana"
  | "generic";

/** Supported agriculture activity types. */
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

/** Fungal disease risk profile and meteorological triggers. */
export interface DiseaseRiskAssessment {
  diseaseName: string;
  cropTarget: string;
  riskLevel: RiskLevel;
  temperatureOptimalMet: boolean;
  humiditySustainedMet: boolean;
  leafWetnessHoursEstimated: number;
  pathogen: string;
  preventativeAdvisory: string;
  icarCitation: string;
}

/** Evapotranspiration (ET₀) and crop water requirement based on FAO-56. */
export interface EvapotranspirationEstimate {
  et0MmDay: number;
  cropEtMmDay: number;
  cropCoefficientKc: number;
  rainfall24hMm: number;
  irrigationDeficitMm: number;
  recommendedWaterLitersPerM2: number;
  method: string;
}

/** Soil profile parameters (SoilGrids / ICAR Soil Health Card standard). */
export interface SoilHealthProfile {
  soilType: "alluvial" | "black" | "red" | "laterite" | "sandy_loam" | "clay_loam";
  displayName: string;
  texture: string;
  drainage: "poor" | "moderate" | "well_drained" | "excessive";
  phRange: string;
  organicCarbonPct: number;
  fieldCapacityPct: number;
  wiltingPointPct: number;
  source: string;
}

/** Heuristic crop sensitivity definition based on meteorological thresholds and ICAR standards. */
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
  icarCitation?: string;
  et0CropCoefficient?: {
    kcInitial: number;
    kcMid: number;
    kcEnd: number;
  };
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
  diseaseRisks?: DiseaseRiskAssessment[];
  evapotranspiration?: EvapotranspirationEstimate;
  soilProfile?: SoilHealthProfile;
  cropEvidenceNote?: string;
  disclaimer: string;
  provenance: DataProvenance[];
}
