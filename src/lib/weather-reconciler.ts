/**
 * Weather Condition Reconciler
 *
 * Reconciles discrete WMO numerical weather codes (such as those from Open-Meteo)
 * with continuous physical telemetry (actual precipitation rate, cloud cover fraction,
 * and precipitation probability) to eliminate false rain displays when trace moisture
 * or low-probability condensation occurs under partly sunny or scattered cloud skies.
 */

export interface ReconciledCondition {
  /** The effective condition for UI presentation (e.g. 'partly-cloudy', 'clear', 'cloudy', 'drizzle', 'rain', 'thunderstorm', 'snow', 'fog') */
  effectiveCondition: string;
  /** Translation key for i18n lookup */
  labelKey: string;
  /** English fallback display label */
  defaultLabel: string;
  /** Ambient theme accent */
  theme: "cyan" | "amber" | "rose" | "slate";
  /** True if the raw code was reconciled away from rain/drizzle due to negligible trace moisture */
  isReconciledFromTrace: boolean;
}

export function reconcileWeatherCondition(params: {
  condition: string;
  precipitation?: number;
  precipitationProbability?: number;
  cloudCover?: number;
  humidity?: number;
}): ReconciledCondition {
  const rawCond = (params.condition || "").toLowerCase().trim();
  const precip = params.precipitation ?? 0;
  const prob = params.precipitationProbability;
  const cloud = params.cloudCover ?? 0;
  const humidity = params.humidity ?? 50;

  // 1. Severe Weather Preserved (Thunderstorms / Hail / Squalls)
  if (rawCond.includes("thunder") || rawCond.includes("storm") || rawCond.includes("hail")) {
    return {
      effectiveCondition: "thunderstorm",
      labelKey: "condition.thunderstorm",
      defaultLabel: "Thunderstorm",
      theme: "rose",
      isReconciledFromTrace: false,
    };
  }

  // 2. Snow / Winter Weather Preserved
  if (rawCond.includes("snow") || rawCond.includes("sleet") || rawCond.includes("blizzard")) {
    return {
      effectiveCondition: "snow",
      labelKey: "condition.snow",
      defaultLabel: "Snow",
      theme: "cyan",
      isReconciledFromTrace: false,
    };
  }

  // 3. Heavy Rain Preserved
  if (rawCond.includes("heavy") && rawCond.includes("rain")) {
    return {
      effectiveCondition: "heavy-rain",
      labelKey: "condition.heavy_rain",
      defaultLabel: "Heavy Rain",
      theme: "cyan",
      isReconciledFromTrace: false,
    };
  }

  // 4. Drizzle & Trace Rain Reconciliation
  // If the model reports drizzle or rain, but precipitation is negligible (<= 0.25 mm/h)
  // and rain probability is low (< 30%) or humidity is non-saturated (< 80%)
  const isLightPrecip = rawCond.includes("drizzle") || rawCond.includes("rain");
  const isTracePrecip = precip <= 0.25 && (prob !== undefined ? prob <= 30 : humidity < 80);

  if (isLightPrecip && isTracePrecip) {
    // If clouds dominate (>= 75%), classify as Cloudy
    if (cloud >= 75) {
      return {
        effectiveCondition: "cloudy",
        labelKey: "condition.cloudy",
        defaultLabel: "Cloudy",
        theme: "slate",
        isReconciledFromTrace: true,
      };
    }
    // If clouds are partial (20% to 74%), classify as Partly Cloudy
    if (cloud >= 20) {
      return {
        effectiveCondition: "partly-cloudy",
        labelKey: "condition.partly_cloudy",
        defaultLabel: "Partly Cloudy",
        theme: "amber",
        isReconciledFromTrace: true,
      };
    }
    // If sky is mostly clear (< 20% clouds)
    return {
      effectiveCondition: "clear",
      labelKey: "condition.clear",
      defaultLabel: "Clear",
      theme: "amber",
      isReconciledFromTrace: true,
    };
  }

  // 5. Genuine Drizzle (Measurable precipitation > 0.25mm or high humidity & high prob)
  if (rawCond.includes("drizzle")) {
    return {
      effectiveCondition: "drizzle",
      labelKey: "condition.drizzle",
      defaultLabel: "Light Drizzle",
      theme: "cyan",
      isReconciledFromTrace: false,
    };
  }

  // 6. Genuine Rain (Measurable precipitation)
  if (rawCond.includes("rain") || rawCond.includes("shower")) {
    return {
      effectiveCondition: "rain",
      labelKey: "condition.rain",
      defaultLabel: "Rain",
      theme: "cyan",
      isReconciledFromTrace: false,
    };
  }

  // 7. Fog / Mist / Haze
  if (rawCond.includes("fog") || rawCond.includes("mist") || rawCond.includes("haze")) {
    return {
      effectiveCondition: "fog",
      labelKey: "condition.fog",
      defaultLabel: "Fog",
      theme: "slate",
      isReconciledFromTrace: false,
    };
  }

  // 8. Clouds & Clear Sky
  if (rawCond.includes("partly") || (cloud >= 25 && cloud < 75)) {
    return {
      effectiveCondition: "partly-cloudy",
      labelKey: "condition.partly_cloudy",
      defaultLabel: "Partly Cloudy",
      theme: "amber",
      isReconciledFromTrace: false,
    };
  }

  if (rawCond.includes("cloud") || rawCond.includes("overcast") || cloud >= 75) {
    return {
      effectiveCondition: "cloudy",
      labelKey: "condition.cloudy",
      defaultLabel: "Cloudy",
      theme: "slate",
      isReconciledFromTrace: false,
    };
  }

  return {
    effectiveCondition: "clear",
    labelKey: "condition.clear",
    defaultLabel: "Clear",
    theme: "amber",
    isReconciledFromTrace: false,
  };
}
