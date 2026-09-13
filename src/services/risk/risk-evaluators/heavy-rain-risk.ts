/**
 * Deterministic Heavy Rain Risk Evaluator.
 *
 * Uses actual verified precipitation rate (mm/h), daily precipitation sum (mm),
 * and precipitation probability (%) from authoritative provider forecasts.
 */

import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity, RiskConfidence } from "@/types/risk";
import { HEAVY_RAIN_THRESHOLDS } from "../risk-rules";

export function evaluateHeavyRainRisk(
  weather: WeatherSnapshot,
  targetDay?: DailyWeather,
  timeWindow: string = "Current & Next 24h"
): RiskAssessment {
  const current = weather.current;
  const precipRate = current?.precipitation;
  const precipSum = targetDay?.precipitationSum;
  const precipProb = targetDay?.precipitationProbability ?? current?.precipitationProbability;

  const primaryProvider = weather.provenance[0]?.provider || "Open-Meteo";
  const timestamp = current?.observedAt || weather.observedAt;
  const evidence: RiskEvidenceItem[] = [];

  if (precipRate === undefined && precipSum === undefined && precipProb === undefined) {
    return {
      type: "heavy_rain",
      severity: "unavailable",
      confidence: "low",
      status: "insufficient_evidence",
      timeWindow,
      evidence: [],
      reason: "No quantitative precipitation observations or probabilities available.",
      recommendation: "Precipitation data unavailable from weather provider.",
    };
  }

  if (precipRate !== undefined) {
    evidence.push({
      metric: "precipitation_rate",
      value: precipRate,
      unit: "mm/h",
      source: primaryProvider,
      timestamp,
    });
  }

  if (precipSum !== undefined) {
    evidence.push({
      metric: "daily_precipitation_sum",
      value: precipSum,
      unit: "mm",
      source: primaryProvider,
      timestamp,
    });
  }

  if (precipProb !== undefined) {
    evidence.push({
      metric: "precipitation_probability",
      value: precipProb,
      unit: "%",
      source: primaryProvider,
      timestamp,
    });
  }

  const effectiveSum = precipSum ?? 0;
  const effectiveRate = precipRate ?? 0;
  const effectiveProb = precipProb ?? 0;

  let severity: RiskSeverity = "low";
  let recommendation = "Precipitation levels remain low or dry. Favorable for outdoor operations.";
  let reason = `Expected precipitation (${effectiveSum} mm, ${effectiveProb}% probability) is within baseline range.`;

  if (
    effectiveSum >= HEAVY_RAIN_THRESHOLDS.EXTREME_DAILY_SUM_MM ||
    effectiveRate >= HEAVY_RAIN_THRESHOLDS.EXTREME_RATE_MM_H
  ) {
    severity = "extreme";
    recommendation =
      "Extreme torrential downpours forecasted. Flash runoff and severe surface waterlogging expected. Halt sensitive outdoor operations and prepare drainage.";
    reason = `Torrential rainfall threshold exceeded (Daily: ${effectiveSum} mm, Rate: ${effectiveRate} mm/h).`;
  } else if (
    effectiveSum >= HEAVY_RAIN_THRESHOLDS.HIGH_DAILY_SUM_MM ||
    effectiveRate >= HEAVY_RAIN_THRESHOLDS.HIGH_RATE_MM_H ||
    (effectiveSum >= HEAVY_RAIN_THRESHOLDS.HIGH_SUM_WITH_PROB_MM &&
      effectiveProb >= HEAVY_RAIN_THRESHOLDS.HIGH_PROB_THRESHOLD_PCT)
  ) {
    severity = "high";
    recommendation =
      "Heavy rainfall expected. Secure vulnerable equipment, prepare water runoff diversions, and anticipate significant transit delays.";
    reason = `Heavy precipitation expected (Daily: ${effectiveSum} mm, Probability: ${effectiveProb}%).`;
  } else if (
    effectiveSum >= HEAVY_RAIN_THRESHOLDS.MODERATE_DAILY_SUM_MM ||
    effectiveRate >= HEAVY_RAIN_THRESHOLDS.MODERATE_RATE_MM_H ||
    (effectiveSum >= HEAVY_RAIN_THRESHOLDS.MODERATE_SUM_WITH_PROB_MM &&
      effectiveProb >= HEAVY_RAIN_THRESHOLDS.MODERATE_PROB_THRESHOLD_PCT)
  ) {
    severity = "moderate";
    recommendation =
      "Moderate precipitation anticipated. Waterproof coverings and rain gear recommended for outdoor activities.";
    reason = `Moderate rainfall forecasted (Daily: ${effectiveSum} mm, Probability: ${effectiveProb}%).`;
  }

  const confidence: RiskConfidence =
    (precipSum !== undefined || precipRate !== undefined) && precipProb !== undefined
      ? "high"
      : "moderate";

  return {
    type: "heavy_rain",
    severity,
    confidence,
    status: "available",
    timeWindow,
    evidence,
    reason,
    recommendation,
  };
}
