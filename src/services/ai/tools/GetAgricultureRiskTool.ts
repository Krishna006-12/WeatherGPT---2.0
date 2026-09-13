/**
 * GetAgricultureRiskTool — Deterministic Agriculture Risk Evaluation Tool.
 *
 * Implements Phase 9 Agriculture Intelligence MVP specifications:
 * - Uses verified weather/forecast data strictly (Open-Meteo).
 * - Accepts: location, crop (optional), activity (optional), temporal target.
 * - Outputs deterministic factors:
 *   - precipitation probability
 *   - rainfall
 *   - temperature
 *   - humidity
 *   - wind
 *   - thunderstorm risk
 *   - relevant weather risk
 *   - activity suitability (irrigation, spraying, sowing, harvesting, outdoor_field_work)
 * - Grounding guarantee: Distinguishes weather fact -> deterministic interpretation -> recommendation.
 * - If no reliable crop-specific rule exists, returns:
 *   "Crop-specific evidence is insufficient; recommendation is based on verified weather conditions."
 */

import { z } from "zod";
import type { Result, Coordinates } from "@/types/common";
import type {
  CropType,
  AgricultureActivityType,
  AgricultureActivity,
  RiskLevel,
  AgricultureHazard,
  AgricultureForecastSummary,
  AgricultureAssessment,
} from "@/types/agriculture";
import type { WeatherSnapshot, DataProvenance } from "@/types/weather";
import type { AICitation } from "@/types/ai";
import { cropTypeSchema, agricultureActivityTypeSchema } from "@/schemas/agriculture";
import { coordinatesSchema } from "@/schemas/weather";
import type { WeatherIntelligenceTool } from "./tool-interface";
import { LocationService } from "@/services/location/location-service";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { getCropProfile } from "@/services/agriculture/crop-profiles";
import {
  calculateForecastWindows,
  detectThunderstormRisk,
  evaluateIrrigationActivity,
  evaluateSprayingActivity,
  evaluateHarvestingActivity,
  evaluateSowingActivity,
  evaluateOutdoorFieldWorkActivity,
  evaluateFieldOperationsActivity,
  evaluateCropHazards,
  aggregateRiskLevel,
} from "@/services/agriculture/agriculture-rules";
import { generateDeterministicHash } from "@/lib/deduplicator";

const DISCLAIMER_TEXT =
  "Weather-based advisory derived from atmospheric observations and forecasts. Local soil, crop, pest, and disease conditions are not directly measured.";

export const getAgricultureRiskInputSchema = z.object({
  location: z
    .union([
      z.string(),
      coordinatesSchema,
      z.object({
        name: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        timezone: z.string().optional(),
        coordinates: coordinatesSchema.optional(),
      }),
    ])
    .optional(),
  coordinates: coordinatesSchema.optional(),
  crop: cropTypeSchema.optional().nullable(),
  activity: agricultureActivityTypeSchema.optional().nullable(),
  temporalTarget: z.string().optional().default("today"),
  targetDate: z
    .string()
    .optional()
    .transform((val) => (val && /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : undefined)),
  timezone: z.string().optional(),
  weather: z.custom<WeatherSnapshot>((val) => typeof val === "object" && val !== null).optional(),
});

export type GetAgricultureRiskInput = z.input<typeof getAgricultureRiskInputSchema>;

export interface AgricultureIntelligenceFactors {
  precipitationProbability: number;
  rainfall: number;
  temperature: {
    current?: number;
    max: number;
    min: number;
  };
  humidity: number;
  wind: {
    current?: number;
    max: number;
  };
  thunderstormRisk: boolean;
  condition: string;
}

export interface AgricultureRiskToolOutput extends AgricultureAssessment {
  period?: string;
  factors: AgricultureIntelligenceFactors;
  relevantWeatherRisk: {
    riskLevel: RiskLevel;
    primaryHazard?: string;
    hazards: AgricultureHazard[];
  };
  activitySuitability: {
    irrigation: AgricultureActivity;
    spraying: AgricultureActivity;
    sowing: AgricultureActivity;
    harvesting: AgricultureActivity;
    outdoor_field_work: AgricultureActivity;
  };
  requestedActivity?: AgricultureActivityType;
  primaryActivitySuitability?: AgricultureActivity;
  recommendation: string;
  reason: string;
  confidence: "high" | "moderate" | "low" | "insufficient_evidence";
  citations: AICitation[];
}

export class GetAgricultureRiskTool
  implements WeatherIntelligenceTool<GetAgricultureRiskInput, AgricultureRiskToolOutput>
{
  readonly name = "get_agriculture_risk" as const;
  readonly description =
    "Evaluate deterministic weather risks, hazard thresholds, and activity suitability (irrigation, spraying, sowing, harvesting, outdoor field work) for agriculture.";
  readonly schema = getAgricultureRiskInputSchema;

  private locationService: LocationService;
  private weatherService: WeatherService;

  constructor(services?: {
    locationService?: LocationService;
    weatherService?: WeatherService;
  }) {
    this.locationService = services?.locationService || new LocationService();
    this.weatherService =
      services?.weatherService || new WeatherService(new OpenMeteoProvider());
  }

  async execute(input: GetAgricultureRiskInput): Promise<Result<AgricultureRiskToolOutput>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_agriculture_risk parameters: ${parsed.error.message}`),
      };
    }

    const {
      location,
      coordinates: directCoords,
      crop: rawCrop,
      activity: rawActivity,
      temporalTarget = "today",
      targetDate,
      timezone: inputTimezone,
      weather: preFetchedWeather,
    } = parsed.data;

    // 1. Resolve Coordinates & Location Name
    let resolvedCoords: Coordinates | undefined = directCoords;
    let resolvedLocationName = "Target Location";
    let resolvedTimezone = inputTimezone || "UTC";

    if (location) {
      if (typeof location === "string") {
        resolvedLocationName = location;
        if (!resolvedCoords) {
          const locRes = await this.locationService.search(location);
          if (locRes.success && locRes.data.length > 0) {
            const first = locRes.data[0];
            if (first) {
              resolvedCoords = { latitude: first.latitude, longitude: first.longitude };
              resolvedLocationName = first.displayName || location;
              resolvedTimezone = first.timezone || resolvedTimezone;
            }
          }
        }
      } else if ("latitude" in location && "longitude" in location && typeof location.latitude === "number" && typeof location.longitude === "number") {
        resolvedCoords = { latitude: location.latitude, longitude: location.longitude };
        if ("name" in location && location.name) resolvedLocationName = location.name;
        if ("timezone" in location && location.timezone) resolvedTimezone = location.timezone;
      } else if ("lat" in location && "lon" in location && typeof location.lat === "number" && typeof location.lon === "number") {
        resolvedCoords = { latitude: location.lat, longitude: location.lon };
        if ("name" in location && location.name) resolvedLocationName = location.name;
        if ("timezone" in location && location.timezone) resolvedTimezone = location.timezone;
      } else if ("coordinates" in location && location.coordinates) {
        resolvedCoords = location.coordinates;
        if ("name" in location && location.name) resolvedLocationName = location.name;
        if ("timezone" in location && location.timezone) resolvedTimezone = location.timezone;
      }
    }

    // If pre-fetched weather is provided, reuse its coordinates and location name
    if (preFetchedWeather) {
      if (!resolvedCoords && preFetchedWeather.location.coordinates) {
        resolvedCoords = preFetchedWeather.location.coordinates;
      }
      if (resolvedLocationName === "Target Location" && preFetchedWeather.location.name) {
        resolvedLocationName = preFetchedWeather.location.name;
      }
      if (!inputTimezone && preFetchedWeather.location.timezone) {
        resolvedTimezone = preFetchedWeather.location.timezone;
      }
    }

    if (!resolvedCoords) {
      return {
        success: false,
        error: new Error("Unable to resolve coordinates for agricultural assessment"),
      };
    }

    // 2. Fetch or reuse verified weather snapshot
    let weather: WeatherSnapshot;
    if (preFetchedWeather) {
      weather = preFetchedWeather;
    } else {
      const wRes = await this.weatherService.getWeather(resolvedCoords, resolvedTimezone);
      if (!wRes.success) {
        return {
          success: false,
          error: new Error(`Failed to retrieve verified weather: ${wRes.error.message}`),
        };
      }
      weather = wRes.data;
    }

    const assessedAt = new Date().toISOString();

    // 3. Crop handling: Never assume wheat. If not provided or generic, flag insufficient crop-specific evidence.
    const crop = rawCrop || undefined;
    const isGenericOrMissing = !crop || crop === "generic";
    const effectiveCrop: CropType = crop && crop !== "generic" ? crop : "generic";
    const cropProfile = getCropProfile(effectiveCrop);
    const cropDisplayName = isGenericOrMissing ? "Not specified / Generic" : cropProfile.displayName;

    const cropEvidenceNote = isGenericOrMissing
      ? "Crop-specific evidence is insufficient; recommendation is based on verified weather conditions."
      : undefined;

    // 4. Calculate meteorological windows & thunderstorm risk
    const windows = calculateForecastWindows(weather);
    const thunderstormRisk = detectThunderstormRisk(weather);

    // Identify target daily forecast if specific targetDate or tomorrow
    let targetDay = weather.daily && weather.daily.length > 0 ? weather.daily[0] : undefined;
    if (targetDate && weather.daily) {
      const matched = weather.daily.find((d) => d.date === targetDate);
      if (matched) {
        targetDay = matched;
      } else if (
        (temporalTarget === "tomorrow" ||
          temporalTarget === "kal" ||
          temporalTarget.startsWith("tomorrow_")) &&
        weather.daily.length > 1
      ) {
        targetDay = weather.daily[1];
      }
    } else if (
      (temporalTarget === "tomorrow" ||
        temporalTarget === "kal" ||
        temporalTarget.startsWith("tomorrow_")) &&
      weather.daily &&
      weather.daily.length > 1
    ) {
      targetDay = weather.daily[1];
    }

    // Factors: for comprehensive 24h risk evaluation, consider both the target day and the 24h forecast window
    const precipProb = targetDay
      ? Math.max(targetDay.precipitationProbability, windows.max24hPrecipProbPct)
      : windows.max24hPrecipProbPct;
    const rainfall = targetDay
      ? Math.max(targetDay.precipitationSum, windows.next24hPrecipMm)
      : windows.next24hPrecipMm;
    const maxTemp = targetDay ? targetDay.temperatureHigh : windows.maxTemperatureC;
    const minTemp = targetDay ? targetDay.temperatureLow : windows.minTemperatureC;
    const maxWind = windows.maxWindSpeedKmh;
    const currentWind = weather.current.windSpeed;
    const humidity = windows.averageHumidityPct;
    const condition = targetDay?.condition || weather.current.condition || "Clear";

    const factors: AgricultureIntelligenceFactors = {
      precipitationProbability: precipProb,
      rainfall,
      temperature: {
        current: weather.current.temperature,
        max: maxTemp,
        min: minTemp,
      },
      humidity,
      wind: {
        current: currentWind,
        max: maxWind,
      },
      thunderstormRisk,
      condition,
    };

    // 5. Evaluate Controlled Activities
    const irrigation = evaluateIrrigationActivity(
      windows,
      cropProfile.precipitation.moderate24hRainMm
    );

    const spraying = evaluateSprayingActivity(
      currentWind,
      windows.max24hWindSpeedKmh,
      rainfall,
      weather.current.precipitation,
      cropProfile.wind.sprayingWindLimitKmh,
      thunderstormRisk
    );

    const sowing = evaluateSowingActivity(windows, thunderstormRisk);
    const harvesting = evaluateHarvestingActivity(rainfall, precipProb, thunderstormRisk);
    const outdoorFieldWork = evaluateOutdoorFieldWorkActivity(windows, thunderstormRisk);
    const fieldOperations = evaluateFieldOperationsActivity(
      rainfall,
      windows.next48hPrecipMm,
      maxWind,
      cropProfile.precipitation.heavy24hRainMm
    );

    const activitySuitability = {
      irrigation,
      spraying,
      sowing,
      harvesting,
      outdoor_field_work: outdoorFieldWork,
    };

    // 6. Hazards & Overall Risk Level
    const { hazards, evidence } = evaluateCropHazards(effectiveCrop, windows, thunderstormRisk);
    const { level: overallRiskLevel, primaryHazard } = aggregateRiskLevel(hazards);

    // 7. Activity-Specific Recommendation and Reasoning
    const requestedActivity = rawActivity || undefined;
    let primaryActivitySuitability: AgricultureActivity | undefined;

    if (requestedActivity) {
      if (requestedActivity === "irrigation") primaryActivitySuitability = irrigation;
      else if (requestedActivity === "spraying") primaryActivitySuitability = spraying;
      else if (requestedActivity === "sowing") primaryActivitySuitability = sowing;
      else if (requestedActivity === "harvesting") primaryActivitySuitability = harvesting;
      else if (requestedActivity === "outdoor_field_work") primaryActivitySuitability = outdoorFieldWork;
    }

    let recommendation = "";
    let reason = "";

    if (requestedActivity && primaryActivitySuitability) {
      recommendation = primaryActivitySuitability.advisory;
      reason = primaryActivitySuitability.reason;
    } else {
      // General farm recommendation based on dominant risk and activity suitabilities
      if (thunderstormRisk) {
        recommendation = "Postpone outdoor field operations and chemical spraying due to thunderstorm and lightning hazard.";
        reason = "Convective storm conditions create high personal safety risks and render pesticide spraying ineffective.";
      } else if (rainfall >= 10 || precipProb >= 70) {
        recommendation = "Pause scheduled irrigation and postpone pesticide spraying or harvesting.";
        reason = `Forecast rainfall (${rainfall} mm with ${precipProb}% probability) provides sufficient moisture but risks spray wash-off and harvest produce dampness.`;
      } else if (maxWind >= cropProfile.wind.sprayingWindLimitKmh) {
        recommendation = "Avoid pesticide spraying due to wind drift; normal dry field work may proceed.";
        reason = `Wind speeds (up to ${maxWind} km/h) exceed the safe spraying threshold (${cropProfile.wind.sprayingWindLimitKmh} km/h).`;
      } else {
        recommendation = "Weather conditions are generally favorable for scheduled field operations, spraying, and farm management.";
        reason = `Calm winds (${currentWind} km/h) and dry weather (< 5 mm rain expected) provide suitable working conditions.`;
      }
    }

    const confidence: "high" | "moderate" | "low" | "insufficient_evidence" =
      weather.hourly && weather.hourly.length > 0 ? "high" : "moderate";

    // Build Citations
    const citations: AICitation[] = [];
    if (weather.provenance && weather.provenance.length > 0) {
      for (const prov of weather.provenance) {
        const displayProv = !prov.provider || prov.provider.toLowerCase() === "open-meteo" ? "Open-Meteo" : prov.provider;
        citations.push({
          title: `Verified Atmospheric Observation & Forecast for ${weather.location.name}`,
          source: displayProv,
          publishedAt: prov.retrievedAt || weather.observedAt,
        });
      }
    } else {
      citations.push({
        title: `Verified Meteorological Forecast for ${weather.location.name}`,
        source: "Open-Meteo",
        publishedAt: weather.observedAt,
      });
    }

    const hashPayload = `${effectiveCrop}_${weather.location.name}_${weather.observedAt}_${overallRiskLevel}_${requestedActivity || "all"}`;
    const id = `agr_${generateDeterministicHash(hashPayload)}`;

    const forecastSummary: AgricultureForecastSummary = {
      next24hPrecipMm: windows.next24hPrecipMm,
      next48hPrecipMm: windows.next48hPrecipMm,
      sevenDayPrecipSumMm: windows.sevenDayPrecipSumMm,
      maxTemperatureC: windows.maxTemperatureC,
      minTemperatureC: windows.minTemperatureC,
      maxWindSpeedKmh: windows.maxWindSpeedKmh,
      averageHumidityPct: windows.averageHumidityPct,
    };

    const provenance: DataProvenance[] = weather.provenance || [
      {
        provider: "open-meteo",
        retrievedAt: assessedAt,
        dataType: "forecast",
      },
    ];

    return {
      success: true,
      data: {
        id,
        crop: crop && crop !== "generic" ? crop : undefined,
        cropDisplayName,
        period: targetDate || temporalTarget || "today",
        location: {
          name: weather.location.name || resolvedLocationName,
          coordinates: resolvedCoords,
        },
        assessedAt,
        overallRiskLevel,
        primaryHazard,
        activities: {
          irrigation,
          spraying,
          fieldOperations,
          sowing,
          harvesting,
          outdoorFieldWork,
        },
        hazards,
        forecastSummary,
        evidence,
        cropEvidenceNote,
        disclaimer: DISCLAIMER_TEXT,
        provenance,
        factors,
        relevantWeatherRisk: {
          riskLevel: overallRiskLevel,
          primaryHazard,
          hazards,
        },
        activitySuitability,
        requestedActivity,
        primaryActivitySuitability,
        recommendation,
        reason,
        confidence,
        citations,
      },
    };
  }
}
