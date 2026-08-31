/**
 * Weather correlation utility for the Impact Engine.
 * Evaluates whether local WeatherSnapshot conditions align with or contradict
 * the meteorological hazard reported in an event.
 *
 * NOTE: Weather alignment is treated as supporting evidence, NOT standalone proof of causation.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type { EventCategory } from "@/types/events";
import type { EvidenceItem } from "@/types/impact";

export interface WeatherCorrelationResult {
  isAligned: boolean;
  evidence: EvidenceItem;
  reason: string;
}

/**
 * Correlate target location's live weather snapshot with a reported hazard event.
 */
export function correlateWeatherWithHazard(
  hazard: EventCategory,
  weather: WeatherSnapshot
): WeatherCorrelationResult {
  const current = weather.current;
  const temp = current.temperature;
  const precip = current.precipitation;
  const windSpeed = current.windSpeed;
  const condition = current.condition;

  // Rain / Flood / Storm hazards
  if (
    hazard === "heavy_rain" ||
    hazard === "flood" ||
    hazard === "flash_flood" ||
    hazard === "thunderstorm" ||
    hazard === "severe_storm"
  ) {
    const isRaining =
      precip > 2.0 ||
      condition === "rain" ||
      condition === "heavy-rain" ||
      condition === "thunderstorm";

    if (isRaining) {
      return {
        isAligned: true,
        evidence: {
          type: "weather_condition_aligned",
          description: `Local weather reports active rainfall (${precip} mm/h, condition: ${condition}), aligning with reported ${hazard} conditions.`,
          weight: "supporting",
          source: weather.provenance[0]?.provider || "WeatherEngine",
        },
        reason: `Local weather stations observe active precipitation (${precip} mm/h) consistent with ${hazard.replace(/_/g, " ")}.`,
      };
    }

    return {
      isAligned: false,
      evidence: {
        type: "weather_condition_neutral",
        description: `Local weather currently indicates no heavy rainfall (${precip} mm/h, condition: ${condition}).`,
        weight: "neutral",
        source: weather.provenance[0]?.provider || "WeatherEngine",
      },
      reason: `Current local weather observations show dry/moderate conditions (${condition}).`,
    };
  }

  // Heatwave
  if (hazard === "heatwave") {
    if (temp >= 38.0) {
      return {
        isAligned: true,
        evidence: {
          type: "weather_condition_aligned",
          description: `Local temperature is elevated at ${temp}°C, aligning with reported heatwave advisory.`,
          weight: "supporting",
          source: weather.provenance[0]?.provider || "WeatherEngine",
        },
        reason: `Local temperature observation (${temp}°C) aligns with extreme heat conditions.`,
      };
    }

    return {
      isAligned: false,
      evidence: {
        type: "weather_condition_neutral",
        description: `Local temperature is ${temp}°C, which is below extreme heat thresholds.`,
        weight: "neutral",
        source: weather.provenance[0]?.provider || "WeatherEngine",
      },
      reason: `Local temperature (${temp}°C) is below typical heatwave thresholds.`,
    };
  }

  // Cold wave
  if (hazard === "cold_wave") {
    if (temp <= 8.0) {
      return {
        isAligned: true,
        evidence: {
          type: "weather_condition_aligned",
          description: `Local temperature is low at ${temp}°C, aligning with cold wave advisory.`,
          weight: "supporting",
          source: weather.provenance[0]?.provider || "WeatherEngine",
        },
        reason: `Local temperature observation (${temp}°C) aligns with cold wave conditions.`,
      };
    }

    return {
      isAligned: false,
      evidence: {
        type: "weather_condition_neutral",
        description: `Local temperature is ${temp}°C, above typical cold wave thresholds.`,
        weight: "neutral",
        source: weather.provenance[0]?.provider || "WeatherEngine",
      },
      reason: `Local temperature (${temp}°C) does not show severe cold wave conditions.`,
    };
  }

  // Cyclone / High Wind
  if (hazard === "cyclone" || hazard === "tropical_storm") {
    if (windSpeed >= 40.0) {
      return {
        isAligned: true,
        evidence: {
          type: "weather_condition_aligned",
          description: `Local wind speeds are elevated at ${windSpeed} km/h, aligning with storm/cyclonic activity.`,
          weight: "supporting",
          source: weather.provenance[0]?.provider || "WeatherEngine",
        },
        reason: `High local wind speeds (${windSpeed} km/h) align with cyclonic/storm impact.`,
      };
    }

    return {
      isAligned: false,
      evidence: {
        type: "weather_condition_neutral",
        description: `Local wind speeds are moderate at ${windSpeed} km/h.`,
        weight: "neutral",
        source: weather.provenance[0]?.provider || "WeatherEngine",
      },
      reason: `Local wind speeds (${windSpeed} km/h) are within normal ranges.`,
    };
  }

  // Default fallback for other hazards
  return {
    isAligned: false,
    evidence: {
      type: "weather_condition_neutral",
      description: `Local weather observations show ${condition} at ${temp}°C.`,
      weight: "neutral",
      source: weather.provenance[0]?.provider || "WeatherEngine",
    },
    reason: `Local meteorological conditions are normal (${condition}).`,
  };
}
