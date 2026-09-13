/**
 * Deterministic Thunderstorm Risk Evaluator.
 *
 * Uses verified normalized condition ('thunderstorm') and official alerts.
 * Strictly adheres to rule: NEVER infer thunderstorms from ordinary rain alone.
 */

import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { RiskAssessment, RiskEvidenceItem, RiskSeverity, RiskConfidence } from "@/types/risk";

export function evaluateThunderstormRisk(
  weather: WeatherSnapshot,
  targetDay?: DailyWeather,
  timeWindow: string = "Current & Next 24h"
): RiskAssessment {
  const current = weather.current;
  const currentCond = current?.condition;
  const dailyCond = targetDay?.condition;

  const primaryProvider = weather.provenance[0]?.provider || "Open-Meteo";
  const timestamp = current?.observedAt || weather.observedAt;
  const evidence: RiskEvidenceItem[] = [];

  if (!currentCond && !dailyCond) {
    return {
      type: "thunderstorm",
      severity: "unavailable",
      confidence: "low",
      status: "insufficient_evidence",
      timeWindow,
      evidence: [],
      reason: "Weather condition code missing from authoritative weather provider.",
      recommendation: "Thunderstorm monitoring data unavailable.",
    };
  }

  if (currentCond) {
    evidence.push({
      metric: "current_condition",
      value: currentCond,
      source: primaryProvider,
      timestamp,
    });
  }

  if (dailyCond) {
    evidence.push({
      metric: "forecast_condition",
      value: dailyCond,
      source: primaryProvider,
      timestamp,
    });
  }

  // Check official thunderstorm weather alerts if present
  const tsAlert = weather.alerts?.find(
    (a) =>
      a.title.toLowerCase().includes("thunderstorm") ||
      a.title.toLowerCase().includes("lightning") ||
      a.description.toLowerCase().includes("thunderstorm")
  );

  if (tsAlert) {
    evidence.push({
      metric: "official_alert",
      value: `[${tsAlert.severity.toUpperCase()}] ${tsAlert.title}`,
      source: tsAlert.source,
      timestamp: tsAlert.effectiveAt,
    });
  }

  const isThunderstorm =
    currentCond === "thunderstorm" ||
    dailyCond === "thunderstorm" ||
    Boolean(tsAlert);

  const windSpeed = Math.max(current?.windSpeed ?? 0, targetDay?.windSpeed ?? 0);

  let severity: RiskSeverity = "low";
  let recommendation = "No convective thunderstorm or lightning signals detected in verified meteorological data.";
  let reason = "Verified condition codes and atmospheric indicators do not indicate thunderstorm activity.";

  if (isThunderstorm) {
    if (tsAlert?.severity === "extreme" || tsAlert?.severity === "severe" || windSpeed >= 60) {
      severity = "extreme";
      recommendation =
        "Severe thunderstorm hazard with intense lightning, localized downpours, and damaging wind gusts. Take immediate shelter indoors. Suspend all outdoor and high-elevation operations.";
      reason = `Severe thunderstorm confirmed in verified forecast with high wind (${windSpeed} km/h) or official alert warnings.`;
    } else {
      severity = "high";
      recommendation =
        "Thunderstorm activity detected. Lightning risk present; avoid open ground, metal structures, and tall trees. Move indoors during storm periods.";
      reason = "Thunderstorm condition code verified in current observations or target period forecast.";
    }
  }

  const confidence: RiskConfidence = "high";

  return {
    type: "thunderstorm",
    severity,
    confidence,
    status: "available",
    timeWindow,
    evidence,
    reason,
    recommendation,
  };
}
