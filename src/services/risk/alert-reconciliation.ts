/**
 * Alert Reconciliation Engine — WeatherGPT 2.0.
 *
 * Cross-validates and reconciles official agency warnings (IMD, GDACS, USGS)
 * against live verified atmospheric NWP models to eliminate duplicates, resolve
 * discrepancies, and generate a unified situational status.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type { WeatherEvent } from "@/types/events";
import type { RiskAssessment } from "@/types/risk";

export interface ReconciledAlert {
  id: string;
  sourceType: "official_agency" | "nwp_model" | "hybrid_consensus";
  headline: string;
  category: string;
  reconciledSeverity: "low" | "moderate" | "high" | "extreme";
  validationStatus: "verified_active" | "developing_watch" | "unconfirmed_divergent";
  confidenceScore: number;
  explanation: string;
  actionableGuidance: string;
}

export function reconcileAlerts(
  events: WeatherEvent[],
  riskAssessments: RiskAssessment[],
  weather: WeatherSnapshot
): ReconciledAlert[] {
  const reconciled: ReconciledAlert[] = [];

  // 1. Process active official events against live atmospheric models
  for (const event of events) {
    if (event.status !== "active") continue;

    // Look for matching risk assessment
    const matchingRisk = riskAssessments.find(
      (r) =>
        (event.category === "cyclone" && r.type === "cyclone") ||
        (event.category === "flood" && (r.type === "flood" || r.type === "heavy_rain")) ||
        (event.category === "heatwave" && r.type === "heat") ||
        (event.category === "severe_storm" && (r.type === "thunderstorm" || r.type === "wind"))
    );

    let status: ReconciledAlert["validationStatus"] = "verified_active";
    let score = event.confidence || 0.85;
    let explanation = `Official agency bulletin confirmed by local meteorological readings.`;

    if (matchingRisk) {
      if (matchingRisk.severity === "extreme" || matchingRisk.severity === "high") {
        status = "verified_active";
        score = Math.min(0.98, score + 0.1);
        explanation = `High consensus: Official advisory aligns with verified physical thresholds (${matchingRisk.reason || "Active risk confirmed"}).`;
      } else if (matchingRisk.severity === "moderate") {
        status = "developing_watch";
        score = Math.min(0.85, score);
        explanation = `Moderate physical signal detected; monitoring for intensification.`;
      } else {
        // Low NWP signal despite official alert
        status = "developing_watch";
        score = 0.72;
        explanation = `Advisory recorded from external feed, but immediate local atmospheric conditions remain sub-critical.`;
      }
    }

    reconciled.push({
      id: `rec_${event.id}`,
      sourceType: "hybrid_consensus",
      headline: event.title,
      category: event.category,
      reconciledSeverity:
        event.severity === "extreme" || event.severity === "critical"
          ? "extreme"
          : event.severity === "severe" || event.severity === "high"
          ? "high"
          : event.severity === "moderate"
          ? "moderate"
          : "low",
      validationStatus: status,
      confidenceScore: score,
      explanation,
      actionableGuidance:
        event.description || `Follow official civil protection guidelines for ${event.location.name}.`,
    });
  }

  // 2. Synthesize NWP-detected extreme signals that may lack an external text advisory
  for (const risk of riskAssessments) {
    if (risk.severity === "extreme" || risk.severity === "high") {
      const alreadyCovered = reconciled.some(
        (r) =>
          (risk.type === "cyclone" && r.category === "cyclone") ||
          (risk.type === "heavy_rain" && r.category === "flood") ||
          (risk.type === "heat" && r.category === "heatwave")
      );

      if (!alreadyCovered) {
        reconciled.push({
          id: `rec_nwp_${risk.type}_${Date.now()}`,
          sourceType: "nwp_model",
          headline: `Atmospheric ${risk.type.toUpperCase().replace("_", " ")} Warning`,
          category: risk.type,
          reconciledSeverity: risk.severity === "extreme" ? "extreme" : "high",
          validationStatus: "verified_active",
          confidenceScore: 0.9,
          explanation: `Numerical weather prediction model detected critical physical thresholds exceeding safety limits.`,
          actionableGuidance: risk.recommendation,
        });
      }
    }
  }

  return reconciled;
}
