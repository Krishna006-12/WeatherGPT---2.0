/**
 * get_weather_risk tool.
 *
 * Deterministic evidence-based weather risk assessment for outdoor work,
 * travel, and extreme meteorological hazards based strictly on verified data.
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { WeatherSnapshot, DailyWeather } from "@/types/weather";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const getWeatherRiskInputSchema = z.object({
  weather: z.custom<WeatherSnapshot>((val) => typeof val === "object" && val !== null),
  temporalTarget: z.string().optional().default("today"),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityType: z.enum(["outdoor_work", "travel", "general"]).optional().default("outdoor_work"),
});

export type GetWeatherRiskInput = z.input<typeof getWeatherRiskInputSchema>;

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type RiskConfidence = "high" | "moderate" | "low" | "insufficient_evidence";
export type ActivityStatus = "favorable" | "caution" | "unfavorable";

export interface WeatherHazardItem {
  category: string;
  severity: RiskLevel;
  description: string;
  value?: string | number;
}

export interface WeatherRiskAssessment {
  riskLevel: RiskLevel;
  confidence: RiskConfidence;
  primaryHazard?: string;
  hazards: WeatherHazardItem[];
  activitySuitability: {
    activity: string;
    status: ActivityStatus;
    advisory: string;
  };
  recommendation: string;
  evidence: string[];
}

export class GetWeatherRiskTool implements WeatherIntelligenceTool<GetWeatherRiskInput, WeatherRiskAssessment> {
  readonly name = "get_weather_risk" as const;
  readonly description = "Evaluate deterministic weather risk, hazardous conditions, and activity suitability for outdoor work or travel.";
  readonly schema = getWeatherRiskInputSchema;

  async execute(input: GetWeatherRiskInput): Promise<Result<WeatherRiskAssessment>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_weather_risk parameters: ${parsed.error.message}`),
      };
    }

    const { weather, targetDate, activityType } = parsed.data;

    if (!weather || !weather.current) {
      return {
        success: false,
        error: new Error("Missing verified weather snapshot for risk assessment"),
      };
    }

    // Identify target daily forecast if date provided
    let targetDay: DailyWeather | undefined;
    if (targetDate && weather.daily) {
      targetDay = weather.daily.find((d) => d.date === targetDate);
    }
    if (!targetDay && weather.daily && weather.daily.length > 0) {
      targetDay = weather.daily[0];
    }

    const current = weather.current;
    const hazards: WeatherHazardItem[] = [];
    const evidence: string[] = [];

    // 1. Official Weather Alerts Check
    if (weather.alerts && weather.alerts.length > 0) {
      for (const alert of weather.alerts) {
        const severity: RiskLevel =
          alert.severity === "extreme" || alert.severity === "severe" ? "high" : "moderate";
        hazards.push({
          category: alert.title || "weather_alert",
          severity,
          description: `Official alert: ${alert.title} — ${alert.description}`,
        });
        evidence.push(`Official warning in effect: [${alert.severity.toUpperCase()}] ${alert.title}`);
      }
    }

    // 2. Precipitation / Rain Risk
    const precipRate = current.precipitation || 0;
    const precipSum = targetDay ? targetDay.precipitationSum : 0;
    const precipProb = targetDay ? targetDay.precipitationProbability : 0;
    const isThunderstorm = current.condition === "thunderstorm" || (targetDay?.condition === "thunderstorm");
    const isHeavyRain = current.condition === "heavy-rain" || (targetDay?.condition === "heavy-rain");

    if (isThunderstorm) {
      hazards.push({
        category: "thunderstorm",
        severity: "high",
        description: "Active or forecasted thunderstorm hazard with lightning and heavy rain.",
      });
      evidence.push("Thunderstorm conditions detected in meteorological data.");
    } else if (isHeavyRain || precipRate > 5.0 || precipSum > 25.0 || precipProb >= 80) {
      hazards.push({
        category: "heavy_rain",
        severity: "high",
        description: `Heavy precipitation hazard (Precipitation: ${precipRate} mm/h, Daily sum: ${precipSum} mm, Rain probability: ${precipProb}%).`,
        value: `${precipSum}mm`,
      });
      evidence.push(`Significant rainfall expected: ${precipSum} mm total (${precipProb}% chance).`);
    } else if (precipRate > 1.0 || precipSum > 5.0 || precipProb >= 40) {
      hazards.push({
        category: "rain",
        severity: "moderate",
        description: `Moderate rain expected (Rain probability: ${precipProb}%, Daily sum: ${precipSum} mm).`,
        value: `${precipSum}mm`,
      });
      evidence.push(`Moderate precipitation: ${precipSum} mm (${precipProb}% probability).`);
    }

    // 3. Thermal Risk (Extreme Heat / Extreme Cold)
    const tempHigh = targetDay ? targetDay.temperatureHigh : current.temperature;
    const tempLow = targetDay ? targetDay.temperatureLow : current.temperature;

    if (tempHigh >= 40.0 || current.temperature >= 40.0) {
      hazards.push({
        category: "extreme_heat",
        severity: "critical",
        description: `Extreme heat advisory: Maximum temperature reaches ${tempHigh}°C. Severe risk of heat exhaustion.`,
        value: `${tempHigh}°C`,
      });
      evidence.push(`Extreme temperature observed/forecasted: ${tempHigh}°C.`);
    } else if (tempHigh >= 35.0 || current.temperature >= 35.0) {
      hazards.push({
        category: "heat",
        severity: "moderate",
        description: `Elevated temperature: ${tempHigh}°C. Heat stress precautions advised during peak hours.`,
        value: `${tempHigh}°C`,
      });
      evidence.push(`High temperature: ${tempHigh}°C.`);
    } else if (tempLow <= 0.0 || current.temperature <= 0.0) {
      hazards.push({
        category: "freezing",
        severity: "high",
        description: `Sub-zero temperature hazard: Minimum temperature drops to ${tempLow}°C. Frost and ice risk.`,
        value: `${tempLow}°C`,
      });
      evidence.push(`Freezing temperatures: minimum ${tempLow}°C.`);
    } else if (tempLow <= 5.0 || current.temperature <= 5.0) {
      hazards.push({
        category: "cold",
        severity: "moderate",
        description: `Cold temperature advisory: Minimum temperature ${tempLow}°C. Thermal protection recommended.`,
        value: `${tempLow}°C`,
      });
      evidence.push(`Low temperatures: minimum ${tempLow}°C.`);
    }

    // 4. Wind Hazard
    const windSpeed = current.windSpeed || 0;
    if (windSpeed >= 50.0) {
      hazards.push({
        category: "high_wind",
        severity: "high",
        description: `High wind warning: Wind speeds reaching ${windSpeed} km/h. Structural and scaffolding risk.`,
        value: `${windSpeed} km/h`,
      });
      evidence.push(`Gale-force wind speeds: ${windSpeed} km/h.`);
    } else if (windSpeed >= 35.0) {
      hazards.push({
        category: "wind",
        severity: "moderate",
        description: `Elevated wind speeds: ${windSpeed} km/h. Caution advised for height work or light equipment.`,
        value: `${windSpeed} km/h`,
      });
      evidence.push(`Strong winds: ${windSpeed} km/h.`);
    }

    // 5. Aggregate Overall Risk Level
    let overallRisk: RiskLevel = "low";
    if (hazards.some((h) => h.severity === "critical")) {
      overallRisk = "critical";
    } else if (hazards.some((h) => h.severity === "high")) {
      overallRisk = "high";
    } else if (hazards.some((h) => h.severity === "moderate")) {
      overallRisk = "moderate";
    }

    const primaryHazard = hazards[0]?.category;

    // 6. Activity Suitability Calculation
    let activityStatus: ActivityStatus = "favorable";
    let advisory = "";

    if (activityType === "travel") {
      if (overallRisk === "critical" || overallRisk === "high") {
        activityStatus = "unfavorable";
        advisory = `Travel is not recommended due to ${primaryHazard?.replace(/_/g, " ") || "hazardous weather"}. Expect major route disruptions or reduced visibility.`;
      } else if (overallRisk === "moderate") {
        activityStatus = "caution";
        advisory = `Travel with caution. Allow extra transit time and check road surface conditions before departure.`;
      } else {
        activityStatus = "favorable";
        advisory = "Normal travel conditions. No significant meteorological transit hazards observed.";
      }
    } else {
      // Default: outdoor_work
      if (overallRisk === "critical" || overallRisk === "high") {
        activityStatus = "unfavorable";
        advisory = `Outdoor work is not recommended due to ${primaryHazard?.replace(/_/g, " ") || "severe conditions"}. High safety risk for outdoor labor and exposed equipment.`;
      } else if (overallRisk === "moderate") {
        activityStatus = "caution";
        advisory = `Outdoor work requires caution. Ensure protective equipment, hydration, or waterproof coverings are prepared.`;
      } else {
        activityStatus = "favorable";
        advisory = "Weather conditions are favorable for outdoor activities and construction/fieldwork.";
      }
    }

    // Overall recommendation summary
    const recommendation =
      activityStatus === "unfavorable"
        ? `Advisory: Unfavorable weather conditions (${overallRisk} risk). Suspend or reschedule hazardous outdoor tasks.`
        : activityStatus === "caution"
        ? `Advisory: Moderate weather risk. Proceed with safety protocols and monitor live updates.`
        : `Advisory: Low weather risk. General conditions are clear and suitable.`;

    const confidence: RiskConfidence =
      weather.provenance.length > 0 ? "high" : "moderate";

    return {
      success: true,
      data: {
        riskLevel: overallRisk,
        confidence,
        primaryHazard,
        hazards,
        activitySuitability: {
          activity: activityType,
          status: activityStatus,
          advisory,
        },
        recommendation,
        evidence: evidence.length > 0 ? evidence : ["All meteorological parameters are within benign baseline thresholds."],
      },
    };
  }
}
