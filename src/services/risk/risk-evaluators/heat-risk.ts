/**
 * Deterministic Heat Risk Evaluator.
 *
 * Uses verified temperature, apparent temperature (feelsLike), and daily high values.
 * Conservatively classifies weather risk without offering medical advice.
 */

import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity, RiskConfidence } from "@/types/risk";
import { HEAT_THRESHOLDS } from "../risk-rules";

export function evaluateHeatRisk(
  weather: WeatherSnapshot,
  targetDay?: DailyWeather,
  timeWindow: string = "Current & Next 24h"
): RiskAssessment {
  const current = weather.current;
  const tempCurrent = current?.temperature;
  const feelsLikeCurrent = current?.feelsLike;
  const tempHigh = targetDay?.temperatureHigh;

  const evidence: RiskEvidenceItem[] = [];
  const primaryProvider = weather.provenance[0]?.provider || "Open-Meteo";
  const timestamp = current?.observedAt || weather.observedAt;

  if (tempCurrent === undefined && tempHigh === undefined) {
    return {
      type: "heat",
      severity: "unavailable",
      confidence: "low",
      status: "insufficient_evidence",
      timeWindow,
      evidence: [],
      reason: "No temperature observations or forecasts available from weather provider.",
      recommendation: "Thermal risk data unavailable. Check local meteorological observations.",
    };
  }

  if (tempCurrent !== undefined) {
    evidence.push({
      metric: "current_temperature",
      value: tempCurrent,
      unit: "°C",
      source: primaryProvider,
      timestamp,
    });
  }

  if (feelsLikeCurrent !== undefined) {
    evidence.push({
      metric: "apparent_temperature",
      value: feelsLikeCurrent,
      unit: "°C",
      source: primaryProvider,
      timestamp,
    });
  }

  if (tempHigh !== undefined) {
    evidence.push({
      metric: "forecast_temperature_high",
      value: tempHigh,
      unit: "°C",
      source: primaryProvider,
      timestamp,
    });
  }

  const effectiveTemp = Math.max(
    tempHigh !== undefined ? tempHigh : -999,
    tempCurrent !== undefined ? tempCurrent : -999
  );
  const effectiveFeelsLike = feelsLikeCurrent !== undefined ? feelsLikeCurrent : effectiveTemp;

  let severity: RiskSeverity = "low";
  let recommendation = "Thermal conditions are within comfortable baseline ranges.";
  let reason = `Temperature (${effectiveTemp}°C) is below elevated heat thresholds.`;

  if (
    effectiveTemp >= HEAT_THRESHOLDS.EXTREME_TEMP_C ||
    effectiveFeelsLike >= HEAT_THRESHOLDS.EXTREME_FEELS_LIKE_C
  ) {
    severity = "extreme";
    recommendation =
      "Hazardous extreme heat conditions. Minimize direct outdoor labor, maintain continuous hydration, and take frequent shade rest (weather risk indicator, not medical advice).";
    reason = `Observed or forecasted temperatures reach extreme threshold (Peak: ${effectiveTemp}°C, Apparent: ${effectiveFeelsLike}°C).`;
  } else if (
    effectiveTemp >= HEAT_THRESHOLDS.HIGH_TEMP_C ||
    effectiveFeelsLike >= HEAT_THRESHOLDS.HIGH_FEELS_LIKE_C
  ) {
    severity = "high";
    recommendation =
      "High heat conditions. Limit strenuous outdoor activities during peak sun hours, increase fluid intake, and monitor heat stress.";
    reason = `High temperature forecasted (Peak: ${effectiveTemp}°C, Apparent: ${effectiveFeelsLike}°C).`;
  } else if (
    effectiveTemp >= HEAT_THRESHOLDS.MODERATE_TEMP_C ||
    effectiveFeelsLike >= HEAT_THRESHOLDS.MODERATE_FEELS_LIKE_C
  ) {
    severity = "moderate";
    recommendation =
      "Elevated thermal conditions. Stay hydrated and plan rest periods during extended outdoor fieldwork.";
    reason = `Moderate heat observed/forecasted (Peak: ${effectiveTemp}°C, Apparent: ${effectiveFeelsLike}°C).`;
  }

  const confidence: RiskConfidence =
    tempHigh !== undefined && tempCurrent !== undefined ? "high" : "moderate";

  return {
    type: "heat",
    severity,
    confidence,
    status: "available",
    timeWindow,
    evidence,
    reason,
    recommendation,
  };
}
