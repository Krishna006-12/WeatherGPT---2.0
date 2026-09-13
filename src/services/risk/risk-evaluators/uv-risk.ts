/**
 * Deterministic UV Risk Evaluator.
 *
 * Only evaluates UV if actual UV data exists in the verified weather snapshot.
 * If UV data is not provided by the provider:
 * - status = "unavailable"
 * - severity = "unavailable"
 * - confidence = "low"
 * Never invents or assumes UV values.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity, RiskConfidence } from "@/types/risk";
import { UV_THRESHOLDS } from "../risk-rules";

export function evaluateUVRisk(
  weather: WeatherSnapshot,
  timeWindow: string = "Current observation"
): RiskAssessment {
  const current = weather.current;
  const uvIndex = current?.uvIndex;

  const primaryProvider = weather.provenance[0]?.provider || "Open-Meteo";
  const timestamp = current?.observedAt || weather.observedAt;

  if (uvIndex === undefined || uvIndex === null || isNaN(uvIndex)) {
    return {
      type: "uv",
      severity: "unavailable",
      confidence: "low",
      status: "unavailable",
      timeWindow,
      evidence: [],
      reason: "UV index is not provided by the authoritative weather provider for this location.",
      recommendation:
        "UV data currently unavailable from provider. Consult local solar exposure advisories if planning extended direct sun exposure.",
    };
  }

  const evidence: RiskEvidenceItem[] = [
    {
      metric: "uv_index",
      value: uvIndex,
      source: primaryProvider,
      timestamp,
    },
  ];

  let severity: RiskSeverity = "low";
  let recommendation = "Minimal UV radiation risk. Standard outdoor exposure is safe without special protection.";
  let reason = `UV index (${uvIndex}) is low.`;

  if (uvIndex >= UV_THRESHOLDS.EXTREME_INDEX) {
    severity = "extreme";
    recommendation =
      "Extreme UV radiation hazard. Severe sunburn risk within minutes. Avoid direct midday sun, seek shade, wear UV-blocking sunglasses and protective clothing.";
    reason = `UV index reaches extreme levels (${uvIndex} >= ${UV_THRESHOLDS.EXTREME_INDEX}).`;
  } else if (uvIndex >= UV_THRESHOLDS.HIGH_INDEX) {
    severity = "high";
    recommendation =
      "High UV radiation risk. Protection required: wear sun-protective clothing, hat, and sunscreen during peak solar hours.";
    reason = `UV index is high (${uvIndex} >= ${UV_THRESHOLDS.HIGH_INDEX}).`;
  } else if (uvIndex >= UV_THRESHOLDS.MODERATE_INDEX) {
    severity = "moderate";
    recommendation =
      "Moderate UV exposure. Take precautions such as seeking shade during midday hours if spending prolonged periods outdoors.";
    reason = `UV index is moderate (${uvIndex} >= ${UV_THRESHOLDS.MODERATE_INDEX}).`;
  }

  const confidence: RiskConfidence = "high";

  return {
    type: "uv",
    severity,
    confidence,
    status: "available",
    timeWindow,
    evidence,
    reason,
    recommendation,
  };
}
