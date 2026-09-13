/**
 * Data contracts and types for Phase 10 NWP Model Intelligence & Model Consensus.
 */

import type { Coordinates, ISOTimestamp } from "./common";
import type { LocationInfo, DataProvenance, WeatherCondition } from "./weather";

/** Identifier of supported global Numerical Weather Prediction (NWP) models. */
export type NwpModelId = "ecmwf" | "gfs" | "icon" | "gem" | "meteofrance";

/** Agreement level for a specific meteorological variable across models. */
export type MetricAgreementLevel = "high" | "moderate" | "divergent";

/** Overall consensus confidence level based on model spread and agreement. */
export type ConsensusConfidence = "high" | "moderate" | "low";

/** Daily forecast values predicted by an individual NWP model. */
export interface ModelDailyForecast {
  date: string;
  temperatureHigh: number;
  temperatureLow: number;
  precipitationSum: number;
  precipitationProbability: number;
  windSpeedMax: number;
  condition: WeatherCondition;
  description: string;
}

/** Complete forecast payload from a specific NWP model. */
export interface ModelForecast {
  modelId: NwpModelId;
  modelName: string;
  organization: string;
  resolutionKm: number;
  runTimestamp?: ISOTimestamp;
  daily: ModelDailyForecast[];
}

/** Deterministic statistical consensus for an individual metric on a single day. */
export interface MetricConsensus {
  metric: string;
  unit: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  spread: number; // max - min
  standardDeviation: number;
  agreementLevel: MetricAgreementLevel;
  valuesByModel: Partial<Record<NwpModelId, number>>;
}

/** Model divergence annotation when an individual model deviates from consensus. */
export interface ModelDivergenceItem {
  modelId: NwpModelId;
  metric: string;
  deviation: number;
  direction: "higher" | "lower";
  explanation: string;
}

/** Consensus metrics for a single forecast day. */
export interface DailyConsensus {
  date: string;
  temperatureHigh: MetricConsensus;
  temperatureLow: MetricConsensus;
  precipitationSum: MetricConsensus;
  windSpeedMax: MetricConsensus;
  consensusCondition: WeatherCondition;
  conditionAgreementPercent: number;
  agreementScore: number; // 0 to 100%
  confidence: ConsensusConfidence;
  divergentModels: ModelDivergenceItem[];
  modelConditions: Partial<Record<NwpModelId, WeatherCondition>>;
}

/** Complete multi-model consensus report. */
export interface ModelConsensusReport {
  location: LocationInfo;
  targetDate?: string;
  modelsUsed: NwpModelId[];
  modelDetails: {
    modelId: NwpModelId;
    name: string;
    organization: string;
    resolutionKm: number;
  }[];
  consensusDays: DailyConsensus[];
  overallAgreementScore: number; // 0 to 100%
  overallConfidence: ConsensusConfidence;
  summaryNotes: string;
  evaluatedAt: ISOTimestamp;
  provenance: DataProvenance[];
}
