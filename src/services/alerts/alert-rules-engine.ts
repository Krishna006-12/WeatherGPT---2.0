/**
 * Deterministic Alert Rules Engine — WeatherGPT 2.0.
 *
 * Evaluates verified meteorological snapshot observations against physical thresholds
 * to produce typed Alert objects.
 *
 * CRITICAL RULE:
 * Alerts NEVER depend on an LLM call or prompt to fire.
 * All thresholds are deterministic, transparent, and tested against boundary values.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type { Alert, AlertSeverity, AlertEvaluationOptions } from "@/types/alert";
import { generateDeterministicHash } from "@/lib/deduplicator";

export const ALERT_THRESHOLDS = {
  HEAT: {
    EXTREME_TEMP_C: 42.0,
    EXTREME_FEELS_LIKE_C: 45.0,
    SEVERE_TEMP_C: 38.0,
    SEVERE_FEELS_LIKE_C: 40.0,
  },
  RAIN: {
    EXTREME_DAILY_MM: 70.0,
    EXTREME_RATE_MM_H: 20.0,
    SEVERE_DAILY_MM: 30.0,
    SEVERE_RATE_MM_H: 7.5,
  },
  WIND: {
    EXTREME_GUST_KMH: 80.0,
    EXTREME_SPEED_KMH: 65.0,
    SEVERE_GUST_KMH: 55.0,
    SEVERE_SPEED_KMH: 40.0,
  },
  CYCLONE: {
    PRESSURE_CEILING_HPA: 990.0,
    MIN_WIND_KMH: 65.0,
  },
  COLD: {
    EXTREME_TEMP_C: 0.0,
    SEVERE_TEMP_C: 4.0,
  },
};

export class AlertRulesEngine {
  /**
   * Evaluate a WeatherSnapshot against all deterministic alert rules.
   */
  evaluate(weather: WeatherSnapshot, options?: AlertEvaluationOptions): Alert[] {
    const alerts: Alert[] = [];
    const locationName = options?.locationName || weather.location.name || "Target Location";
    const evaluatedAt = options?.evaluatedAt || weather.observedAt || new Date().toISOString();
    const effectiveAt = evaluatedAt;

    // Default 24-hour expiration window for active alerts
    const expiresDate = new Date(evaluatedAt);
    expiresDate.setHours(expiresDate.getHours() + 24);
    const expiresAt = expiresDate.toISOString();

    const current = weather.current;
    const todayDaily = weather.daily && weather.daily.length > 0 ? weather.daily[0] : undefined;

    // 1. Extreme & Severe Heat Evaluation
    const maxTemp = Math.max(
      current.temperature,
      todayDaily?.temperatureHigh ?? current.temperature
    );
    const feelsLike = current.feelsLike ?? current.temperature;

    if (
      maxTemp >= ALERT_THRESHOLDS.HEAT.EXTREME_TEMP_C ||
      feelsLike >= ALERT_THRESHOLDS.HEAT.EXTREME_FEELS_LIKE_C
    ) {
      alerts.push({
        id: `alert_heat_${generateDeterministicHash(`${locationName}_${maxTemp}_extreme`)}`,
        category: "heat",
        severity: "extreme",
        headline: `Extreme Heat Warning for ${locationName}`,
        description: `Dangerous extreme heat detected with temperatures reaching ${maxTemp}°C (heat index ${feelsLike}°C). Elevated risk of heat hyperthermia and heat stroke.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "temperature_celsius",
        observedValue: maxTemp,
        thresholdValue: ALERT_THRESHOLDS.HEAT.EXTREME_TEMP_C,
        affectedLocation: locationName,
      });
    } else if (
      maxTemp >= ALERT_THRESHOLDS.HEAT.SEVERE_TEMP_C ||
      feelsLike >= ALERT_THRESHOLDS.HEAT.SEVERE_FEELS_LIKE_C
    ) {
      alerts.push({
        id: `alert_heat_${generateDeterministicHash(`${locationName}_${maxTemp}_severe`)}`,
        category: "heat",
        severity: "severe",
        headline: `Severe Heat Advisory for ${locationName}`,
        description: `High heat conditions with temperatures at ${maxTemp}°C (feels like ${feelsLike}°C). Limit direct sun exposure and maintain hydration.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "temperature_celsius",
        observedValue: maxTemp,
        thresholdValue: ALERT_THRESHOLDS.HEAT.SEVERE_TEMP_C,
        affectedLocation: locationName,
      });
    }

    // 2. Heavy & Extreme Rainfall Evaluation
    const dailyRain = todayDaily?.precipitationSum ?? current.precipitation ?? 0;
    const rainRate = current.precipitation ?? 0;

    if (
      dailyRain >= ALERT_THRESHOLDS.RAIN.EXTREME_DAILY_MM ||
      rainRate >= ALERT_THRESHOLDS.RAIN.EXTREME_RATE_MM_H
    ) {
      alerts.push({
        id: `alert_rain_${generateDeterministicHash(`${locationName}_${dailyRain}_extreme`)}`,
        category: "heavy_rain",
        severity: "extreme",
        headline: `Extreme Rainfall Warning for ${locationName}`,
        description: `Torrential rainfall observed/projected: ${dailyRain} mm/day (rate: ${rainRate} mm/h). Significant flash flood and waterlogging threat.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "precipitation_sum_mm",
        observedValue: dailyRain,
        thresholdValue: ALERT_THRESHOLDS.RAIN.EXTREME_DAILY_MM,
        affectedLocation: locationName,
      });
    } else if (
      dailyRain >= ALERT_THRESHOLDS.RAIN.SEVERE_DAILY_MM ||
      rainRate >= ALERT_THRESHOLDS.RAIN.SEVERE_RATE_MM_H
    ) {
      alerts.push({
        id: `alert_rain_${generateDeterministicHash(`${locationName}_${dailyRain}_severe`)}`,
        category: "heavy_rain",
        severity: "severe",
        headline: `Heavy Rainfall Advisory for ${locationName}`,
        description: `Substantial rainfall accumulation of ${dailyRain} mm expected. Localized low-lying ponding and transport disruption possible.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "precipitation_sum_mm",
        observedValue: dailyRain,
        thresholdValue: ALERT_THRESHOLDS.RAIN.SEVERE_DAILY_MM,
        affectedLocation: locationName,
      });
    }

    // 3. Damaging & Extreme Wind Evaluation
    const maxWindSpeed = Math.max(
      current.windSpeed,
      todayDaily?.windSpeed ?? current.windSpeed
    );
    const maxWindGust = Math.max(
      current.windGust ?? current.windSpeed,
      todayDaily?.windSpeed ?? current.windGust ?? current.windSpeed
    );

    if (
      maxWindGust >= ALERT_THRESHOLDS.WIND.EXTREME_GUST_KMH ||
      maxWindSpeed >= ALERT_THRESHOLDS.WIND.EXTREME_SPEED_KMH
    ) {
      alerts.push({
        id: `alert_wind_${generateDeterministicHash(`${locationName}_${maxWindGust}_extreme`)}`,
        category: "wind",
        severity: "extreme",
        headline: `Extreme Wind / Gale Warning for ${locationName}`,
        description: `Dangerous gale-force wind gusts up to ${maxWindGust} km/h (sustained ${maxWindSpeed} km/h). Structural hazard, falling trees, and flying debris danger.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "wind_gust_kmh",
        observedValue: maxWindGust,
        thresholdValue: ALERT_THRESHOLDS.WIND.EXTREME_GUST_KMH,
        affectedLocation: locationName,
      });
    } else if (
      maxWindGust >= ALERT_THRESHOLDS.WIND.SEVERE_GUST_KMH ||
      maxWindSpeed >= ALERT_THRESHOLDS.WIND.SEVERE_SPEED_KMH
    ) {
      alerts.push({
        id: `alert_wind_${generateDeterministicHash(`${locationName}_${maxWindGust}_severe`)}`,
        category: "wind",
        severity: "severe",
        headline: `High Wind Advisory for ${locationName}`,
        description: `Elevated wind speeds of ${maxWindSpeed} km/h with gusts up to ${maxWindGust} km/h. Secure loose items and exercise caution when driving.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "wind_gust_kmh",
        observedValue: maxWindGust,
        thresholdValue: ALERT_THRESHOLDS.WIND.SEVERE_GUST_KMH,
        affectedLocation: locationName,
      });
    }

    // 4. Cyclone Evaluation (Depression / Deep Depression / Tropical Storm)
    if (
      current.pressure <= ALERT_THRESHOLDS.CYCLONE.PRESSURE_CEILING_HPA &&
      (maxWindSpeed >= ALERT_THRESHOLDS.CYCLONE.MIN_WIND_KMH || maxWindGust >= ALERT_THRESHOLDS.WIND.EXTREME_GUST_KMH)
    ) {
      alerts.push({
        id: `alert_cyclone_${generateDeterministicHash(`${locationName}_${current.pressure}`)}`,
        category: "cyclone",
        severity: "extreme",
        headline: `Tropical Cyclone Danger Alert for ${locationName}`,
        description: `Atmospheric depression reaching ${current.pressure} hPa with destructive wind speeds exceeding ${maxWindSpeed} km/h. Immediate storm safety protocols advised.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "pressure_hpa",
        observedValue: current.pressure,
        thresholdValue: ALERT_THRESHOLDS.CYCLONE.PRESSURE_CEILING_HPA,
        affectedLocation: locationName,
      });
    }

    // 5. Thunderstorm Evaluation
    const isThunderstorm =
      current.condition === "thunderstorm" ||
      current.condition === "hail" ||
      (current.description?.toLowerCase().includes("thunderstorm") ?? false);

    if (isThunderstorm) {
      const isSevereOrHail = current.condition === "hail" || maxWindGust >= 70.0;
      alerts.push({
        id: `alert_thunderstorm_${generateDeterministicHash(`${locationName}_${current.condition}_${evaluatedAt}`)}`,
        category: "thunderstorm",
        severity: isSevereOrHail ? "extreme" : "severe",
        headline: isSevereOrHail
          ? `Severe Thunderstorm & Hail Warning for ${locationName}`
          : `Thunderstorm Warning for ${locationName}`,
        description: `Active convective thunderstorm with lightning hazard and gusty winds up to ${maxWindGust} km/h. Seek indoor shelter.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "condition",
        observedValue: current.condition,
        thresholdValue: "thunderstorm",
        affectedLocation: locationName,
      });
    }

    // 6. Cold Wave Evaluation
    const minTemp = Math.min(
      current.temperature,
      todayDaily?.temperatureLow ?? current.temperature
    );
    if (minTemp <= ALERT_THRESHOLDS.COLD.EXTREME_TEMP_C) {
      alerts.push({
        id: `alert_cold_${generateDeterministicHash(`${locationName}_${minTemp}_extreme`)}`,
        category: "cold_wave",
        severity: "extreme",
        headline: `Freezing Conditions & Cold Wave Warning for ${locationName}`,
        description: `Sub-zero freezing temperatures of ${minTemp}°C observed. Severe frost and icing hazard.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "temperature_celsius",
        observedValue: minTemp,
        thresholdValue: ALERT_THRESHOLDS.COLD.EXTREME_TEMP_C,
        affectedLocation: locationName,
      });
    } else if (minTemp <= ALERT_THRESHOLDS.COLD.SEVERE_TEMP_C) {
      alerts.push({
        id: `alert_cold_${generateDeterministicHash(`${locationName}_${minTemp}_severe`)}`,
        category: "cold_wave",
        severity: "severe",
        headline: `Severe Cold Wave Advisory for ${locationName}`,
        description: `Biting cold temperatures dropping to ${minTemp}°C. Protect sensitive crops, livestock, and vulnerable populations.`,
        source: "Deterministic Physics Rules Engine",
        effectiveAt,
        expiresAt,
        thresholdMetric: "temperature_celsius",
        observedValue: minTemp,
        thresholdValue: ALERT_THRESHOLDS.COLD.SEVERE_TEMP_C,
        affectedLocation: locationName,
      });
    }

    // Sort alerts: extreme first, then severe, then moderate, then minor
    const severityRank: Record<AlertSeverity, number> = {
      extreme: 4,
      severe: 3,
      moderate: 2,
      minor: 1,
    };

    return alerts.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  }
}

export const globalAlertRulesEngine = new AlertRulesEngine();
