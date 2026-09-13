/**
 * get_risk tool.
 *
 * Deterministic weather risk assessment tool implementing the Phase 9 Unified
 * Weather Risk Center specifications.
 * Evaluates verified meteorological snapshots and live intelligence events into
 * 6 structured risk categories (Heat, Heavy Rain, Thunderstorm, Wind, UV, Flood).
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { WeatherSnapshot } from "@/types/weather";
import type { WeatherRiskReport, RiskSeverity, RiskConfidence, RiskCategory } from "@/types/risk";
import type { EventRepository } from "@/services/storage/repository-interfaces";
import { RiskEngine, globalRiskEngine } from "@/services/risk/risk-engine";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const getRiskInputSchema = z.object({
  weather: z.custom<WeatherSnapshot>((val) => typeof val === "object" && val !== null),
  temporalTarget: z.string().optional().default("today"),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityType: z.enum(["outdoor_work", "travel", "general"]).optional().default("outdoor_work"),
});

export type GetRiskInput = z.input<typeof getRiskInputSchema>;

export interface GetRiskToolOutput extends WeatherRiskReport {
  riskLevel: RiskSeverity;
  confidence: RiskConfidence;
  primaryHazard?: RiskCategory;
  activitySuitability: {
    activity: string;
    status: "favorable" | "caution" | "unfavorable";
    advisory: string;
  };
  recommendation: string;
  evidenceSummary: string[];
}

export interface GetRiskToolOptions {
  eventRepository?: EventRepository;
  riskEngine?: RiskEngine;
}

export class GetRiskTool implements WeatherIntelligenceTool<GetRiskInput, GetRiskToolOutput> {
  readonly name = "get_risk" as const;
  readonly description =
    "Evaluate deterministic weather risk across Heat, Heavy Rain, Thunderstorm, Wind, UV, and Flood from verified meteorological and event data.";
  readonly schema = getRiskInputSchema;

  private riskEngine: RiskEngine;

  constructor(options?: GetRiskToolOptions) {
    this.riskEngine =
      options?.riskEngine ||
      (options?.eventRepository ? new RiskEngine(options.eventRepository) : globalRiskEngine);
  }

  async execute(input: GetRiskInput): Promise<Result<GetRiskToolOutput>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_risk parameters: ${parsed.error.message}`),
      };
    }

    const { weather, targetDate, temporalTarget, activityType } = parsed.data;

    if (!weather || !weather.current) {
      return {
        success: false,
        error: new Error("Missing verified weather snapshot for risk evaluation"),
      };
    }

    try {
      const report = await this.riskEngine.evaluate({
        weather,
        targetDate,
        temporalTarget,
      });

      // Identify primary elevated hazard among active assessments
      const hazardPriority: Record<string, number> = {
        thunderstorm: 6,
        flood: 5,
        heavy_rain: 4,
        wind: 3,
        heat: 2,
        uv: 1,
      };

      const activeElevated = report.assessments.filter(
        (a) => a.severity === "extreme" || a.severity === "high" || a.severity === "moderate"
      );
      activeElevated.sort((a, b) => {
        const score = (s: RiskSeverity) => (s === "extreme" ? 3 : s === "high" ? 2 : 1);
        const diff = score(b.severity) - score(a.severity);
        if (diff !== 0) return diff;
        return (hazardPriority[b.type] || 0) - (hazardPriority[a.type] || 0);
      });

      const primaryHazard = activeElevated[0]?.type;
      const primaryAssessment = activeElevated[0] || report.assessments[0];

      // Activity suitability derivation
      let activityStatus: "favorable" | "caution" | "unfavorable" = "favorable";
      let advisory = "Weather conditions are favorable for outdoor work and standard activities.";

      if (report.overallSeverity === "extreme" || report.overallSeverity === "high") {
        activityStatus = "unfavorable";
        const hazardLabel = primaryHazard ? primaryHazard.replace(/_/g, " ") : "hazardous weather";
        advisory = `${
          activityType === "travel" ? "Travel" : "Outdoor work"
        } is not recommended due to elevated ${hazardLabel} risk. Suspend non-essential operations.`;
      } else if (report.overallSeverity === "moderate") {
        activityStatus = "caution";
        const hazardLabel = primaryHazard ? primaryHazard.replace(/_/g, " ") : "moderate weather";
        advisory = `Proceed with caution. Elevated ${hazardLabel} risk detected for the target window.`;
      }

      // Collect evidence summaries
      const evidenceSummary: string[] = [];
      for (const a of report.assessments) {
        if (a.evidence.length > 0) {
          for (const ev of a.evidence) {
            evidenceSummary.push(
              `[${a.type.toUpperCase()}] ${ev.metric}: ${ev.value}${ev.unit ? ` ${ev.unit}` : ""} (${ev.source})`
            );
          }
        }
      }

      const recommendation =
        primaryAssessment?.recommendation ||
        "All verified meteorological indicators are within standard baseline thresholds.";

      // Confidence matching overall or primary hazard
      const confidence = primaryAssessment?.confidence || "high";

      return {
        success: true,
        data: {
          ...report,
          riskLevel: report.overallSeverity,
          confidence,
          primaryHazard,
          activitySuitability: {
            activity: activityType || "outdoor_work",
            status: activityStatus,
            advisory,
          },
          recommendation,
          evidenceSummary,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unexpected error executing get_risk tool"),
      };
    }
  }
}
