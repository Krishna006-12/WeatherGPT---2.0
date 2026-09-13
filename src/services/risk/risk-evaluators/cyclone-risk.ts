/**
 * Deterministic Tropical Cyclone Risk Evaluator.
 *
 * Grounded in official India Meteorological Department (IMD) / WMO cyclone classification:
 * - Deep Depression: 52–61 km/h
 * - Cyclonic Storm: 62–88 km/h
 * - Severe Cyclonic Storm: 89–117 km/h
 * - Very Severe / Super Cyclonic Storm: >= 118 km/h
 * Evaluates sustained winds, barometric pressure deficits, and torrential downpours.
 */

import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity } from "@/types/risk";

export function evaluateCycloneRisk(
  weather: WeatherSnapshot,
  targetDay?: DailyWeather,
  timeWindow: string = "Next 24h - 48h"
): RiskAssessment {
  const current = weather.current;
  const currentSpeed = current?.windSpeed ?? 0;
  const currentGust = current?.windGust ?? currentSpeed;
  const dailySpeed = targetDay?.windSpeed ?? 0;
  const dailyRain = targetDay?.precipitationSum ?? current?.precipitation ?? 0;
  const pressure = current?.pressure ?? 1013;

  const effectiveWindKmh = Math.max(currentSpeed, dailySpeed);
  const effectiveGustKmh = Math.max(currentGust, effectiveWindKmh);

  const primaryProvider = weather.provenance[0]?.provider || "Open-Meteo";
  const timestamp = current?.observedAt || weather.observedAt;
  const evidence: RiskEvidenceItem[] = [];

  evidence.push({
    metric: "sustained_wind_speed",
    value: effectiveWindKmh,
    unit: "km/h",
    source: primaryProvider,
    timestamp,
  });

  evidence.push({
    metric: "wind_gust",
    value: effectiveGustKmh,
    unit: "km/h",
    source: primaryProvider,
    timestamp,
  });

  evidence.push({
    metric: "surface_pressure",
    value: pressure,
    unit: "hPa",
    source: primaryProvider,
    timestamp,
  });

  evidence.push({
    metric: "24h_rainfall",
    value: dailyRain,
    unit: "mm",
    source: primaryProvider,
    timestamp,
  });

  let severity: RiskSeverity = "low";
  let recommendation = "No cyclonic atmospheric signature detected. Standard meteorological conditions.";
  let reason = `Sustained wind (${effectiveWindKmh} km/h) and surface pressure (${pressure} hPa) are within non-cyclonic thresholds.`;

  // Super / Very Severe Cyclone: Wind >= 89 km/h or Pressure < 990 hPa
  if (effectiveWindKmh >= 89 || effectiveGustKmh >= 115 || (pressure < 990 && effectiveWindKmh >= 60)) {
    severity = "extreme";
    recommendation =
      "CRITICAL CYCLONIC THREAT: Severe to Super Cyclonic force conditions forecasted. Complete cessation of maritime/fishing operations, secure structural reinforcements, evacuate low-lying coastal floodplains, and follow NDRF/SDMA directives.";
    reason = `Severe cyclonic intensity: Sustained wind ${effectiveWindKmh} km/h (Gusts: ${effectiveGustKmh} km/h) with steep barometric pressure drop (${pressure} hPa) and heavy rainfall (${dailyRain} mm).`;
  }
  // Cyclonic Storm: Wind 62–88 km/h or Pressure < 1000 hPa with strong gale
  else if (effectiveWindKmh >= 62 || effectiveGustKmh >= 80 || (pressure < 1000 && effectiveWindKmh >= 48)) {
    severity = "high";
    recommendation =
      "HIGH CYCLONE ALERT: Cyclonic storm conditions approaching. Fishermen advised not to venture into deep waters. Secure loose tin roofs, signs, and overhead utility lines.";
    reason = `Cyclonic storm threshold reached: Wind speeds ${effectiveWindKmh} km/h with low surface pressure (${pressure} hPa).`;
  }
  // Deep Depression / Squally Weather: Wind 45–61 km/h with heavy rain
  else if ((effectiveWindKmh >= 45 || effectiveGustKmh >= 60) && (pressure < 1005 || dailyRain >= 40)) {
    severity = "moderate";
    recommendation =
      "Deep Depression / Squally Wind Advisory: Heightened wave action and heavy rain gusts. Exercise caution near coastal and waterfront installations.";
    reason = `Squally wind patterns detected (${effectiveWindKmh} km/h) combined with depressed barometric pressure (${pressure} hPa).`;
  }

  return {
    type: "cyclone",
    severity,
    confidence: "high",
    status: "available",
    timeWindow,
    evidence,
    reason,
    recommendation,
  };
}
