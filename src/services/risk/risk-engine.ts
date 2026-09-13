/**
 * Central Deterministic Weather Risk Engine.
 *
 * Orchestrates deterministic risk evaluators across 6 categories:
 * 1. Heat
 * 2. Heavy Rain
 * 3. Thunderstorm
 * 4. Wind
 * 5. UV
 * 6. Flood (via Live Intelligence)
 *
 * Guaranteed properties:
 * - Evidence-based and 100% deterministic (no LLM generation or speculation).
 * - Full citation and data provenance preservation.
 * - Adheres strictly to Zod schemas.
 */

import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { WeatherRiskReport, RiskAssessment, RiskSeverity } from "@/types/risk";
import { weatherRiskReportSchema } from "@/schemas/risk";
import type { EventRepository } from "@/services/storage/repository-interfaces";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import { evaluateHeatRisk } from "./risk-evaluators/heat-risk";
import { evaluateHeavyRainRisk } from "./risk-evaluators/heavy-rain-risk";
import { evaluateThunderstormRisk } from "./risk-evaluators/thunderstorm-risk";
import { evaluateWindRisk } from "./risk-evaluators/wind-risk";
import { evaluateUVRisk } from "./risk-evaluators/uv-risk";
import { evaluateFloodRisk } from "./risk-evaluators/flood-risk";
import { evaluateDroughtRisk } from "./risk-evaluators/drought-risk";
import { evaluateCycloneRisk } from "./risk-evaluators/cyclone-risk";

export interface EvaluateRiskOptions {
  weather: WeatherSnapshot;
  eventRepository?: EventRepository;
  targetDate?: string;
  temporalTarget?: string;
}

const SEVERITY_WEIGHTS: Record<RiskSeverity, number> = {
  extreme: 4,
  high: 3,
  moderate: 2,
  low: 1,
  no_evidence: 0,
  unavailable: 0,
};

export class RiskEngine {
  private defaultEventRepository: EventRepository;

  constructor(eventRepository?: EventRepository) {
    this.defaultEventRepository = eventRepository || globalEventRepository;
  }

  /**
   * Evaluate complete weather risk report deterministically from verified snapshot.
   */
  async evaluate(options: EvaluateRiskOptions): Promise<WeatherRiskReport> {
    const { weather, targetDate, temporalTarget } = options;
    const eventRepo = options.eventRepository || this.defaultEventRepository;

    // Resolve target day forecast if available
    let targetDay: DailyWeather | undefined;
    if (targetDate && weather.daily && weather.daily.length > 0) {
      targetDay = weather.daily.find((d) => d.date.startsWith(targetDate));
    }
    if (!targetDay && weather.daily && weather.daily.length > 0) {
      targetDay = weather.daily[0];
    }

    const timeWindow = targetDate
      ? `Forecast for ${targetDate}`
      : temporalTarget
      ? `Target: ${temporalTarget}`
      : "Current & Next 24h";

    // Run all 8 deterministic evaluators
    const heat = evaluateHeatRisk(weather, targetDay, timeWindow);
    const heavyRain = evaluateHeavyRainRisk(weather, targetDay, timeWindow);
    const thunderstorm = evaluateThunderstormRisk(weather, targetDay, timeWindow);
    const wind = evaluateWindRisk(weather, targetDay, timeWindow);
    const uv = evaluateUVRisk(weather, timeWindow);
    const flood = await evaluateFloodRisk(weather.location, eventRepo, timeWindow);
    const drought = evaluateDroughtRisk(weather, targetDay, timeWindow);
    const cyclone = evaluateCycloneRisk(weather, targetDay, timeWindow);

    const assessments: RiskAssessment[] = [
      heat,
      heavyRain,
      thunderstorm,
      wind,
      uv,
      flood,
      drought,
      cyclone,
    ];

    // Calculate overall severity
    const overallSeverity = this.calculateOverallSeverity(assessments);

    const report: WeatherRiskReport = {
      location: weather.location,
      period: timeWindow,
      targetDate,
      overallSeverity,
      assessments,
      evaluatedAt: new Date().toISOString(),
      provenance: weather.provenance,
    };

    const validated = weatherRiskReportSchema.safeParse(report);
    if (!validated.success) {
      throw new Error(`Risk report validation failed: ${validated.error.message}`);
    }

    return validated.data as WeatherRiskReport;
  }

  /**
   * Determine overall risk severity across assessments.
   */
  private calculateOverallSeverity(assessments: RiskAssessment[]): RiskSeverity {
    let maxWeight = 0;
    let maxSeverity: RiskSeverity = "low";
    let allUnavailable = true;

    for (const a of assessments) {
      if (a.severity !== "unavailable") {
        allUnavailable = false;
      }
      const weight = SEVERITY_WEIGHTS[a.severity] || 0;
      if (weight > maxWeight) {
        maxWeight = weight;
        maxSeverity = a.severity;
      }
    }

    if (allUnavailable) {
      return "unavailable";
    }

    return maxSeverity;
  }
}

export const globalRiskEngine = new RiskEngine();
