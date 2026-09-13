/**
 * Deterministic Wind Risk Evaluator.
 *
 * Uses actual verified wind speed and wind gust observations and forecasts.
 * Evaluates conditions against transparent engineering product thresholds.
 */

import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity, RiskConfidence } from "@/types/risk";
import { WIND_THRESHOLDS } from "../risk-rules";

export function evaluateWindRisk(
  weather: WeatherSnapshot,
  targetDay?: DailyWeather,
  timeWindow: string = "Current & Next 24h"
): RiskAssessment {
  const current = weather.current;
  const currentSpeed = current?.windSpeed;
  const currentGust = current?.windGust;
  const dailySpeed = targetDay?.windSpeed;

  const primaryProvider = weather.provenance[0]?.provider || "Open-Meteo";
  const timestamp = current?.observedAt || weather.observedAt;
  const evidence: RiskEvidenceItem[] = [];

  if (currentSpeed === undefined && dailySpeed === undefined) {
    return {
      type: "wind",
      severity: "unavailable",
      confidence: "low",
      status: "insufficient_evidence",
      timeWindow,
      evidence: [],
      reason: "Wind speed data unavailable from authoritative weather provider.",
      recommendation: "Wind risk data currently unavailable.",
    };
  }

  if (currentSpeed !== undefined) {
    evidence.push({
      metric: "current_wind_speed",
      value: currentSpeed,
      unit: "km/h",
      source: primaryProvider,
      timestamp,
    });
  }

  if (currentGust !== undefined) {
    evidence.push({
      metric: "wind_gust",
      value: currentGust,
      unit: "km/h",
      source: primaryProvider,
      timestamp,
    });
  }

  if (dailySpeed !== undefined) {
    evidence.push({
      metric: "forecast_wind_speed",
      value: dailySpeed,
      unit: "km/h",
      source: primaryProvider,
      timestamp,
    });
  }

  const effectiveSpeed = Math.max(currentSpeed ?? 0, dailySpeed ?? 0);
  const effectiveGust = currentGust ?? effectiveSpeed;

  let severity: RiskSeverity = "low";
  let recommendation = "Calm to gentle breeze. Favorable for standard outdoor work and transit.";
  let reason = `Wind speed (${effectiveSpeed} km/h) is below elevated thresholds.`;

  if (
    effectiveSpeed >= WIND_THRESHOLDS.EXTREME_SPEED_KMH ||
    effectiveGust >= WIND_THRESHOLDS.EXTREME_GUST_KMH
  ) {
    severity = "extreme";
    recommendation =
      "Dangerous gale-force winds forecasted. Severe risk of falling branches, scaffolding compromise, and structural hazards. Suspend outdoor crane, roofing, and elevated operations.";
    reason = `Extreme wind threshold reached (Speed: ${effectiveSpeed} km/h, Gust: ${effectiveGust} km/h).`;
  } else if (
    effectiveSpeed >= WIND_THRESHOLDS.HIGH_SPEED_KMH ||
    effectiveGust >= WIND_THRESHOLDS.HIGH_GUST_KMH
  ) {
    severity = "high";
    recommendation =
      "Strong winds expected. Exercise caution with high-profile vehicles, scaffolding, light outdoor equipment, and working at heights.";
    reason = `Strong wind speeds recorded (Speed: ${effectiveSpeed} km/h, Gust: ${effectiveGust} km/h).`;
  } else if (
    effectiveSpeed >= WIND_THRESHOLDS.MODERATE_SPEED_KMH ||
    effectiveGust >= WIND_THRESHOLDS.MODERATE_GUST_KMH
  ) {
    severity = "moderate";
    recommendation =
      "Moderate breeze. Secure loose objects and tarpaulins; safe for standard ground activities.";
    reason = `Moderate wind speeds observed (Speed: ${effectiveSpeed} km/h, Gust: ${effectiveGust} km/h).`;
  }

  const confidence: RiskConfidence = "high";

  return {
    type: "wind",
    severity,
    confidence,
    status: "available",
    timeWindow,
    evidence,
    reason,
    recommendation,
  };
}
