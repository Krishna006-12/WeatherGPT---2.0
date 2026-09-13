/**
 * Central Deterministic NWP Consensus Engine.
 *
 * Computes deterministic multi-model consensus metrics across global NWP models:
 * - Ensemble mean, median, min, max, spread, and standard deviation.
 * - Agreement level per metric (high, moderate, divergent).
 * - Outlier / divergent model identification.
 * - Daily and overall agreement scores (0–100%) and consensus confidence (high, moderate, low).
 * - Human-readable, evidence-based consensus summary notes.
 *
 * Guaranteed properties:
 * - 100% deterministic (no speculative LLM hallucination).
 * - Strict adherence to Zod schemas.
 */

import type { LocationInfo, DataProvenance, WeatherCondition } from "@/types/weather";
import type {
  NwpModelId,
  ModelForecast,
  MetricConsensus,
  MetricAgreementLevel,
  DailyConsensus,
  ModelDivergenceItem,
  ConsensusConfidence,
  ModelConsensusReport,
} from "@/types/nwp";
import { modelConsensusReportSchema } from "@/schemas/nwp";
import { NWP_MODEL_CONFIGS } from "./nwp-provider";

export interface EvaluateConsensusOptions {
  location: LocationInfo;
  forecasts: ModelForecast[];
  targetDate?: string;
  provenance?: DataProvenance[];
}

export class ConsensusEngine {
  /**
   * Evaluate multi-model forecasts and generate a complete ModelConsensusReport.
   */
  evaluate(options: EvaluateConsensusOptions): ModelConsensusReport {
    const { location, forecasts, targetDate, provenance = [] } = options;

    if (forecasts.length === 0) {
      throw new Error("Consensus evaluation requires at least one model forecast");
    }

    const modelsUsed: NwpModelId[] = forecasts.map((f) => f.modelId);
    const modelDetails = forecasts.map((f) => {
      const cfg = NWP_MODEL_CONFIGS[f.modelId] || {
        name: f.modelName,
        organization: f.organization,
        resolutionKm: f.resolutionKm,
      };
      return {
        modelId: f.modelId,
        name: cfg.name,
        organization: cfg.organization,
        resolutionKm: cfg.resolutionKm,
      };
    });

    // Collect unique forecast dates across all models
    const dateSet = new Set<string>();
    for (const f of forecasts) {
      for (const d of f.daily) {
        dateSet.add(d.date);
      }
    }
    const sortedDates = Array.from(dateSet).sort();

    // If targetDate is specified, filter dates or retain targetDate first
    const datesToEvaluate = targetDate
      ? sortedDates.filter((d) => d.startsWith(targetDate))
      : sortedDates;

    const evaluatedDates = datesToEvaluate.length > 0 ? datesToEvaluate : sortedDates;
    const consensusDays: DailyConsensus[] = [];

    for (const date of evaluatedDates) {
      const dayConsensus = this.evaluateDay(date, forecasts);
      consensusDays.push(dayConsensus);
    }

    // Compute overall metrics across evaluated days
    const overallScore =
      consensusDays.length > 0
        ? Math.round(
            consensusDays.reduce((sum, d) => sum + d.agreementScore, 0) /
              consensusDays.length
          )
        : 0;

    const overallConfidence = this.scoreToConfidence(overallScore);
    const summaryNotes = this.generateSummaryNotes(
      consensusDays,
      modelsUsed,
      overallConfidence,
      overallScore
    );

    const report: ModelConsensusReport = {
      location,
      targetDate,
      modelsUsed,
      modelDetails,
      consensusDays,
      overallAgreementScore: overallScore,
      overallConfidence,
      summaryNotes,
      evaluatedAt: new Date().toISOString(),
      provenance:
        provenance.length > 0
          ? provenance
          : [
              {
                provider: "open-meteo-nwp",
                retrievedAt: new Date().toISOString(),
                dataType: "forecast",
              },
            ],
    };

    const validated = modelConsensusReportSchema.safeParse(report);
    if (!validated.success) {
      throw new Error(`Model consensus report validation failed: ${validated.error.message}`);
    }

    return validated.data as ModelConsensusReport;
  }

  /**
   * Evaluate multi-model consensus for a single day.
   */
  private evaluateDay(date: string, forecasts: ModelForecast[]): DailyConsensus {
    const tempHighs: { modelId: NwpModelId; value: number }[] = [];
    const tempLows: { modelId: NwpModelId; value: number }[] = [];
    const precipSums: { modelId: NwpModelId; value: number }[] = [];
    const windSpeeds: { modelId: NwpModelId; value: number }[] = [];
    const conditions: { modelId: NwpModelId; condition: WeatherCondition }[] = [];

    for (const f of forecasts) {
      const d = f.daily.find((day) => day.date === date);
      if (d) {
        tempHighs.push({ modelId: f.modelId, value: d.temperatureHigh });
        tempLows.push({ modelId: f.modelId, value: d.temperatureLow });
        precipSums.push({ modelId: f.modelId, value: d.precipitationSum });
        windSpeeds.push({ modelId: f.modelId, value: d.windSpeedMax });
        conditions.push({ modelId: f.modelId, condition: d.condition });
      }
    }

    const tempHighConsensus = this.computeMetricConsensus(
      "High Temperature",
      "°C",
      tempHighs,
      (spread) => (spread <= 2.0 ? "high" : spread <= 4.0 ? "moderate" : "divergent")
    );

    const tempLowConsensus = this.computeMetricConsensus(
      "Low Temperature",
      "°C",
      tempLows,
      (spread) => (spread <= 2.0 ? "high" : spread <= 4.0 ? "moderate" : "divergent")
    );

    const precipSumConsensus = this.computeMetricConsensus(
      "Precipitation Sum",
      "mm",
      precipSums,
      (spread, values) => {
        const allDry = values.every((v) => v < 1.0);
        if (allDry) return "high";
        return spread <= 5.0 ? "high" : spread <= 15.0 ? "moderate" : "divergent";
      }
    );

    const windSpeedConsensus = this.computeMetricConsensus(
      "Wind Speed Max",
      "km/h",
      windSpeeds,
      (spread) => (spread <= 8.0 ? "high" : spread <= 16.0 ? "moderate" : "divergent")
    );

    // Evaluate condition consensus via majority vote
    const conditionCounts = new Map<WeatherCondition, number>();
    const modelConditions: Partial<Record<NwpModelId, WeatherCondition>> = {};

    for (const c of conditions) {
      modelConditions[c.modelId] = c.condition;
      conditionCounts.set(c.condition, (conditionCounts.get(c.condition) || 0) + 1);
    }

    let consensusCondition: WeatherCondition = "partly-cloudy";
    let maxCount = 0;
    for (const [cond, count] of conditionCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        consensusCondition = cond;
      }
    }

    const conditionAgreementPercent =
      conditions.length > 0 ? Math.round((maxCount / conditions.length) * 100) : 0;

    // Detect model divergence items
    const divergentModels: ModelDivergenceItem[] = [];
    this.detectOutliers(tempHighConsensus, "High Temperature", "°C", 2.5, divergentModels);
    this.detectOutliers(precipSumConsensus, "Precipitation", "mm", 7.0, divergentModels);
    this.detectOutliers(windSpeedConsensus, "Wind Speed", "km/h", 12.0, divergentModels);

    // Compute day agreement score (0–100%)
    const tempScore = this.agreementLevelToScore(tempHighConsensus.agreementLevel);
    const precipScore = this.agreementLevelToScore(precipSumConsensus.agreementLevel);
    const windScore = this.agreementLevelToScore(windSpeedConsensus.agreementLevel);
    const condScore = conditionAgreementPercent;

    const agreementScore = Math.round(
      tempScore * 0.35 + precipScore * 0.35 + condScore * 0.2 + windScore * 0.1
    );

    const confidence = this.scoreToConfidence(agreementScore);

    return {
      date,
      temperatureHigh: tempHighConsensus,
      temperatureLow: tempLowConsensus,
      precipitationSum: precipSumConsensus,
      windSpeedMax: windSpeedConsensus,
      consensusCondition,
      conditionAgreementPercent,
      agreementScore,
      confidence,
      divergentModels,
      modelConditions,
    };
  }

  /**
   * Compute statistical distribution for a single metric.
   */
  private computeMetricConsensus(
    metric: string,
    unit: string,
    entries: { modelId: NwpModelId; value: number }[],
    classifyAgreement: (spread: number, values: number[]) => MetricAgreementLevel
  ): MetricConsensus {
    if (entries.length === 0) {
      return {
        metric,
        unit,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        spread: 0,
        standardDeviation: 0,
        agreementLevel: "divergent",
        valuesByModel: {},
      };
    }

    const values = entries.map((e) => e.value);
    const valuesByModel: Partial<Record<NwpModelId, number>> = {};
    for (const e of entries) {
      valuesByModel[e.modelId] = e.value;
    }

    const sum = values.reduce((acc, v) => acc + v, 0);
    const mean = Math.round((sum / values.length) * 10) / 10;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]!
        : Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;

    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    const spread = Math.round((max - min) * 10) / 10;

    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const standardDeviation = Math.round(Math.sqrt(variance) * 100) / 100;

    const agreementLevel = classifyAgreement(spread, values);

    return {
      metric,
      unit,
      mean,
      median,
      min,
      max,
      spread,
      standardDeviation,
      agreementLevel,
      valuesByModel,
    };
  }

  /**
   * Flag outliers where an individual model strongly deviates from the group median.
   */
  private detectOutliers(
    metricConsensus: MetricConsensus,
    label: string,
    unit: string,
    thresholdDiff: number,
    outliers: ModelDivergenceItem[]
  ): void {
    const median = metricConsensus.median;

    for (const [mId, val] of Object.entries(metricConsensus.valuesByModel)) {
      if (val === undefined) continue;
      const modelId = mId as NwpModelId;
      const diff = val - median;
      if (Math.abs(diff) >= thresholdDiff) {
        const direction = diff > 0 ? "higher" : "lower";
        const modelName = NWP_MODEL_CONFIGS[modelId]?.name || modelId.toUpperCase();
        outliers.push({
          modelId,
          metric: metricConsensus.metric,
          deviation: Math.round(Math.abs(diff) * 10) / 10,
          direction,
          explanation: `${modelName} forecasts ${label} ${Math.abs(Math.round(diff * 10) / 10)}${unit} ${direction} than group consensus median (${median}${unit}).`,
        });
      }
    }
  }

  private agreementLevelToScore(level: MetricAgreementLevel): number {
    switch (level) {
      case "high":
        return 95;
      case "moderate":
        return 70;
      case "divergent":
        return 40;
    }
  }

  private scoreToConfidence(score: number): ConsensusConfidence {
    if (score >= 80) return "high";
    if (score >= 60) return "moderate";
    return "low";
  }

  /**
   * Generate human-readable, grounded synthesis summary notes.
   */
  private generateSummaryNotes(
    consensusDays: DailyConsensus[],
    modelsUsed: NwpModelId[],
    overallConfidence: ConsensusConfidence,
    overallScore: number
  ): string {
    const modelNames = modelsUsed
      .map((m) => NWP_MODEL_CONFIGS[m]?.name || m.toUpperCase())
      .join(", ");

    const firstDay = consensusDays[0];
    if (!firstDay) {
      return `NWP Consensus evaluated across ${modelNames}.`;
    }

    const tempSpread = firstDay.temperatureHigh.spread;
    const precipMean = firstDay.precipitationSum.mean;

    let confidencePhrase = "";
    if (overallConfidence === "high") {
      confidencePhrase = `High model agreement (${overallScore}% consensus index).`;
    } else if (overallConfidence === "moderate") {
      confidencePhrase = `Moderate model consensus (${overallScore}% agreement index) with minor variations in intensity.`;
    } else {
      confidencePhrase = `Elevated model divergence detected (${overallScore}% consensus index) across primary global solvers.`;
    }

    const details: string[] = [
      confidencePhrase,
      `High temperature spread is ±${tempSpread}°C across ${modelsUsed.length} models (${modelNames}).`,
    ];

    if (firstDay.precipitationSum.agreementLevel === "high") {
      if (precipMean < 1.0) {
        details.push("All models agree on dry/negligible precipitation conditions.");
      } else {
        details.push(`Models agree on precipitation averaging ${precipMean} mm.`);
      }
    } else if (firstDay.precipitationSum.agreementLevel === "divergent") {
      details.push(
        `Precipitation volume diverges significantly (spread: ${firstDay.precipitationSum.spread} mm).`
      );
    }

    if (firstDay.divergentModels.length > 0) {
      const topOutlier = firstDay.divergentModels[0]!;
      details.push(`Note: ${topOutlier.explanation}`);
    }

    return details.join(" ");
  }
}

export const globalConsensusEngine = new ConsensusEngine();
