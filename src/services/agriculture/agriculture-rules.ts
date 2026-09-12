/**
 * Deterministic Agriculture Rules Engine for WeatherGPT 2.0.
 *
 * Implements pure, deterministic evaluation of agricultural weather risks,
 * activity feasibility (irrigation, spraying, field operations), and evidence aggregation.
 *
 * Grounding guarantees:
 * - Pure functions with ZERO external API calls, LLM hallucinations, or mock values.
 * - Inspects exclusively verified atmospheric parameters from the WeatherSnapshot contract.
 * - Never claims soil status, disease presence, or stage-specific telemetry.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type {
  CropType,
  RiskLevel,
  AgricultureActivity,
  AgricultureHazard,
  AgricultureEvidence,
  AgricultureForecastSummary,
  AgricultureAssessment,
} from "@/types/agriculture";
import { getCropProfile } from "./crop-profiles";
import { generateDeterministicHash } from "@/lib/deduplicator";

const DISCLAIMER_TEXT =
  "Weather-based advisory derived from atmospheric observations and forecasts. Local soil, crop, pest, and disease conditions are not directly measured.";

export interface WindowCalculations {
  next24hPrecipMm: number;
  next48hPrecipMm: number;
  sevenDayPrecipSumMm: number;
  maxTemperatureC: number;
  minTemperatureC: number;
  maxWindSpeedKmh: number;
  averageHumidityPct: number;
  max24hWindSpeedKmh: number;
  max24hPrecipProbPct: number;
  isOvercastOrRainy: boolean;
}

/**
 * Deterministically compute forecast metrics across key agronomic planning windows.
 */
export function calculateForecastWindows(weather: WeatherSnapshot): WindowCalculations {
  const current = weather.current;
  const hourly = weather.hourly || [];
  const daily = weather.daily || [];

  // --- Next 24h Metrics ---
  const next24Hourly = hourly.slice(0, 24);
  let next24hPrecip = 0;
  let max24hWind = current.windSpeed || 0;
  let max24hPrecipProb = 0;

  for (const h of next24Hourly) {
    next24hPrecip += h.precipitation || 0;
    if (h.windSpeed > max24hWind) max24hWind = h.windSpeed;
    if (h.precipitationProbability > max24hPrecipProb) max24hPrecipProb = h.precipitationProbability;
  }

  // Fallback to daily[0] if hourly is sparse or empty
  if (next24Hourly.length === 0 && daily.length > 0) {
    const firstDay = daily[0];
    if (firstDay) {
      next24hPrecip = firstDay.precipitationSum || 0;
      max24hPrecipProb = firstDay.precipitationProbability || 0;
    }
  } else if (daily.length > 0) {
    const firstDay = daily[0];
    if (firstDay) {
      next24hPrecip = Math.max(next24hPrecip, firstDay.precipitationSum || 0);
      max24hPrecipProb = Math.max(max24hPrecipProb, firstDay.precipitationProbability || 0);
    }
  }

  // --- Next 48h Metrics ---
  const next48Hourly = hourly.slice(0, 48);
  let next48hPrecip = 0;
  for (const h of next48Hourly) {
    next48hPrecip += h.precipitation || 0;
  }
  if (next48Hourly.length < 48 && daily.length >= 2) {
    const day1 = daily[0];
    const day2 = daily[1];
    next48hPrecip = Math.max(
      next48hPrecip,
      (day1?.precipitationSum || 0) + (day2?.precipitationSum || 0)
    );
  }

  // --- 7-Day Window Metrics ---
  let sevenDayPrecip = 0;
  let maxTemp = current.temperature;
  let minTemp = current.temperature;
  let maxWind = max24hWind;

  if (daily.length > 0) {
    maxTemp = -Infinity;
    minTemp = Infinity;
    for (const d of daily) {
      sevenDayPrecip += d.precipitationSum || 0;
      if (d.temperatureHigh > maxTemp) maxTemp = d.temperatureHigh;
      if (d.temperatureLow < minTemp) minTemp = d.temperatureLow;
      if (d.windSpeed && d.windSpeed > maxWind) maxWind = d.windSpeed;
    }
  } else {
    // If daily not available, compute from hourly or current
    for (const h of hourly) {
      sevenDayPrecip += h.precipitation || 0;
      if (h.temperature > maxTemp) maxTemp = h.temperature;
      if (h.temperature < minTemp) minTemp = h.temperature;
      if (h.windSpeed > maxWind) maxWind = h.windSpeed;
    }
  }

  // Safety clamps if daily array was completely empty
  if (maxTemp === -Infinity) maxTemp = current.temperature;
  if (minTemp === Infinity) minTemp = current.temperature;

  // Average humidity
  const avgHumidity = current.humidity || 50;

  // Overcast or rainy condition flag
  const isOvercast =
    current.cloudCover >= 70 ||
    current.condition === "cloudy" ||
    current.condition === "overcast" ||
    current.condition === "rain" ||
    current.condition === "drizzle";

  return {
    next24hPrecipMm: Number(next24hPrecip.toFixed(1)),
    next48hPrecipMm: Number(next48hPrecip.toFixed(1)),
    sevenDayPrecipSumMm: Number(sevenDayPrecip.toFixed(1)),
    maxTemperatureC: Number(maxTemp.toFixed(1)),
    minTemperatureC: Number(minTemp.toFixed(1)),
    maxWindSpeedKmh: Number(maxWind.toFixed(1)),
    averageHumidityPct: Number(avgHumidity.toFixed(0)),
    max24hWindSpeedKmh: Number(max24hWind.toFixed(1)),
    max24hPrecipProbPct: Number(max24hPrecipProb.toFixed(0)),
    isOvercastOrRainy: isOvercast,
  };
}

/**
 * Deterministically evaluate Irrigation suitability based on precipitation forecasts.
 */
export function evaluateIrrigationActivity(
  windows: WindowCalculations,
  moderateRainThreshold: number
): AgricultureActivity {
  // 1. Unfavorable: Heavy or significant rain forecast soon
  if (windows.next24hPrecipMm >= moderateRainThreshold || (windows.next24hPrecipMm >= 5 && windows.max24hPrecipProbPct >= 70) || windows.max24hPrecipProbPct >= 85) {
    return {
      status: "unfavorable",
      advisory: "Rainfall is expected, which may affect field moisture and irrigation needs. Check local field conditions before proceeding.",
      reason: `Rainfall (${windows.next24hPrecipMm} mm) is forecast in the next 24h with ${windows.max24hPrecipProbPct}% probability; natural precipitation is expected to supply moisture.`,
    };
  }

  // 2. Caution: Light to moderate rain possibility
  if (windows.next24hPrecipMm >= 4 || windows.next48hPrecipMm >= moderateRainThreshold || windows.max24hPrecipProbPct >= 50) {
    return {
      status: "caution",
      advisory: "Rainfall is possible, which may affect field moisture conditions. Check local field conditions before proceeding.",
      reason: `Moderate rain probability (${windows.max24hPrecipProbPct}%, ~${windows.next24hPrecipMm} mm in 24h) is forecast; field moisture may vary.`,
    };
  }

  // 3. Favorable: Dry weather ahead
  return {
    status: "favorable",
    advisory: "Dry weather conditions are optimal for scheduled irrigation.",
    reason: `Dry conditions with little to no precipitation (${windows.next24hPrecipMm} mm) forecast over the next 24-48 hours ensure irrigation is fully effective.`,
  };
}

/**
 * Detect convective thunderstorm risk from observations, forecasts, or alerts.
 */
export function detectThunderstormRisk(weather: WeatherSnapshot): boolean {
  const current = weather.current;
  const cond = (current.condition || "").toLowerCase();
  const desc = (current.description || "").toLowerCase();
  if (cond.includes("thunder") || desc.includes("thunder") || desc.includes("lightning")) {
    return true;
  }
  if (weather.alerts && weather.alerts.some((a) => `${a.title} ${a.description}`.toLowerCase().includes("thunder"))) {
    return true;
  }
  if (weather.daily && weather.daily.slice(0, 2).some((d) => (d.condition || "").toLowerCase().includes("thunder"))) {
    return true;
  }
  if (weather.hourly && weather.hourly.slice(0, 24).some((h) => (h.condition || "").toLowerCase().includes("thunder"))) {
    return true;
  }
  return false;
}

/**
 * Deterministically evaluate Spraying feasibility (pesticides, foliar sprays).
 */
export function evaluateSprayingActivity(
  currentWindKmh: number,
  max24hWindKmh: number,
  next24hPrecipMm: number,
  currentPrecipRate: number,
  sprayingWindLimitKmh: number,
  isThunderstorm: boolean = false
): AgricultureActivity {
  // 1. Unfavorable: Thunderstorm
  if (isThunderstorm) {
    return {
      status: "unfavorable",
      advisory: "Thunderstorm activity detected; chemical spraying is unfavorable due to severe wash-off and operator safety risks. Check local conditions before proceeding.",
      reason: "Thunderstorm conditions and convective rainfall cause immediate chemical wash-off and pose field safety hazards.",
    };
  }

  // 2. Unfavorable: Rain active or heavy rain imminent, OR strong wind causing drift
  if (currentPrecipRate > 0 || next24hPrecipMm >= 4.0) {
    return {
      status: "unfavorable",
      advisory: "Rainfall is forecast, which may cause wash-off and affect outdoor spraying conditions. Check local field conditions before proceeding.",
      reason: `Active or forecast rainfall (${next24hPrecipMm} mm in 24h) causes chemical wash-off and diminishes spray efficacy.`,
    };
  }

  if (currentWindKmh > sprayingWindLimitKmh || max24hWindKmh > sprayingWindLimitKmh + 5.0) {
    return {
      status: "unfavorable",
      advisory: "Elevated wind speeds pose a risk of drift during spraying operations. Check local wind conditions before proceeding.",
      reason: `Wind speeds (${currentWindKmh} km/h current, up to ${max24hWindKmh} km/h forecast) exceed the safe spraying threshold (${sprayingWindLimitKmh} km/h), posing high drift risk.`,
    };
  }

  // 3. Caution: Borderline winds
  if (currentWindKmh >= sprayingWindLimitKmh - 3.0 || max24hWindKmh >= sprayingWindLimitKmh) {
    return {
      status: "caution",
      advisory: "Wind speeds are near typical drift thresholds. Calmer periods may offer better spraying conditions. Check local conditions before proceeding.",
      reason: `Wind speeds (${currentWindKmh} km/h) are near the safe drift limit (${sprayingWindLimitKmh} km/h); choose low-pressure nozzles and calm morning hours.`,
    };
  }

  // 4. Favorable: Dry foliage, calm winds
  return {
    status: "favorable",
    advisory: "Weather conditions are calm and dry with low risk of wind drift or wash-off.",
    reason: `Calm wind (${currentWindKmh} km/h) and dry weather (< 4 mm rain in 24h) provide optimal spraying conditions with minimal drift or wash-off risk.`,
  };
}

/**
 * Deterministically evaluate Harvesting feasibility.
 */
export function evaluateHarvestingActivity(
  next24hPrecipMm: number,
  max24hPrecipProbPct: number,
  isThunderstorm: boolean = false
): AgricultureActivity {
  // 1. Unfavorable: Thunderstorm
  if (isThunderstorm) {
    return {
      status: "unfavorable",
      advisory: "Thunderstorm risk is present; harvesting operations are unfavorable due to lightning safety hazards and grain damage.",
      reason: "Thunderstorm conditions create direct physical hazards for machinery and high moisture damage risk for cut produce.",
    };
  }

  // 2. Unfavorable: High rain probability or significant rainfall
  if (next24hPrecipMm >= 4.0 || max24hPrecipProbPct >= 60) {
    return {
      status: "unfavorable",
      advisory: "Rainfall is forecast; harvesting operations are unfavorable due to moisture damage and mold risk. Check local conditions before proceeding.",
      reason: `Forecast rainfall (${next24hPrecipMm} mm) with ${max24hPrecipProbPct}% probability increases grain moisture, risking spoilage and delayed drying.`,
    };
  }

  // 3. Caution: Passing showers or moderate probability
  if (next24hPrecipMm >= 2.0 || max24hPrecipProbPct >= 35) {
    return {
      status: "caution",
      advisory: "Passing showers or moderate rain chances are possible; monitor skies and protect harvested produce.",
      reason: `Moderate rain probability (${max24hPrecipProbPct}%, ~${next24hPrecipMm} mm) could cause surface dampness on standing or harvested crop.`,
    };
  }

  // 4. Favorable: Dry weather
  return {
    status: "favorable",
    advisory: "Weather conditions are dry and favorable for harvesting and crop handling.",
    reason: `Dry weather (${next24hPrecipMm} mm rain expected) and low precipitation probability favor clean harvesting and grain moisture control.`,
  };
}

/**
 * Deterministically evaluate Sowing feasibility.
 */
export function evaluateSowingActivity(
  windows: WindowCalculations,
  isThunderstorm: boolean = false
): AgricultureActivity {
  if (isThunderstorm) {
    return {
      status: "unfavorable",
      advisory: "Thunderstorm activity detected; field sowing is unfavorable due to severe convective downpours and safety risks.",
      reason: "Convective storm winds and intense downpours displace newly sown seeds and erode seed beds.",
    };
  }

  if (windows.next24hPrecipMm >= 25.0) {
    return {
      status: "unfavorable",
      advisory: "Heavy downpours forecast; sowing is unfavorable due to waterlogging and seed rot hazards.",
      reason: `Excessive rainfall (${windows.next24hPrecipMm} mm in 24h) causes soil waterlogging, seed asphyxiation, and crust formation.`,
    };
  }

  if (windows.minTemperatureC <= 2.0 || windows.maxTemperatureC >= 40.0) {
    return {
      status: "unfavorable",
      advisory: "Temperature extremes forecast; sowing conditions are unfavorable.",
      reason: `Thermal extremes (Min: ${windows.minTemperatureC}°C, Max: ${windows.maxTemperatureC}°C) severely impair seed germination and early seedling survival.`,
    };
  }

  if (windows.next24hPrecipMm >= 8.0) {
    return {
      status: "caution",
      advisory: "Moderate rainfall forecast; ensure seed bed is sufficiently drained before planting.",
      reason: `Rainfall (${windows.next24hPrecipMm} mm) will wet topsoil; verify field workability to avoid soil compaction.`,
    };
  }

  return {
    status: "favorable",
    advisory: "Weather conditions are mild and favorable for sowing operations.",
    reason: "Moderate temperatures and manageable moisture forecast support uniform seed placement and germination.",
  };
}

/**
 * Deterministically evaluate Outdoor Field Work suitability.
 */
export function evaluateOutdoorFieldWorkActivity(
  windows: WindowCalculations,
  isThunderstorm: boolean = false
): AgricultureActivity {
  if (isThunderstorm) {
    return {
      status: "unfavorable",
      advisory: "Thunderstorm risk present: outdoor field work has high safety risk. Cease outdoor operations.",
      reason: "Convective thunderstorm activity, cloud-to-ground lightning, and gusty winds pose high safety risks for outdoor field work.",
    };
  }

  if (windows.next24hPrecipMm >= 25.0 || windows.maxWindSpeedKmh >= 45.0 || windows.maxTemperatureC >= 42.0) {
    return {
      status: "unfavorable",
      advisory: "Severe weather conditions forecast; outdoor field labor is unfavorable.",
      reason: `Dangerous meteorological conditions (Wind: ${windows.maxWindSpeedKmh} km/h, Rain: ${windows.next24hPrecipMm} mm, Max Temp: ${windows.maxTemperatureC}°C) impede field safety.`,
    };
  }

  if (windows.maxTemperatureC >= 36.0 || windows.next24hPrecipMm >= 6.0 || windows.maxWindSpeedKmh >= 30.0) {
    return {
      status: "caution",
      advisory: "Elevated heat, wind, or light rain; proceed with field operations using appropriate precautions.",
      reason: `Warm conditions (${windows.maxTemperatureC}°C) or gusty winds (${windows.maxWindSpeedKmh} km/h) require hydration breaks and careful equipment handling.`,
    };
  }

  return {
    status: "favorable",
    advisory: "Weather conditions are mild and suitable for regular outdoor field work.",
    reason: `Dry weather (${windows.next24hPrecipMm} mm rain expected) and moderate winds allow safe and efficient outdoor farm activities.`,
  };
}

/**
 * Deterministically evaluate Field Operations & Harvesting feasibility (backward compatibility).
 */
export function evaluateFieldOperationsActivity(
  next24hPrecipMm: number,
  next48hPrecipMm: number,
  maxWindSpeedKmh: number,
  heavyRainThreshold: number
): AgricultureActivity {
  // 1. Unfavorable: Heavy downpours making soil inaccessible or damaging harvested grain
  if (next24hPrecipMm >= heavyRainThreshold || next48hPrecipMm >= heavyRainThreshold * 1.5) {
    return {
      status: "unfavorable",
      advisory: "Substantial rainfall is forecast, so field operations and harvesting may be affected. Check local field conditions before proceeding.",
      reason: `Substantial rainfall (${next24hPrecipMm} mm in 24h) is forecast, which may make field operations difficult and risk post-harvest produce dampness.`,
    };
  }

  // 2. Caution: Intermittent rain or strong gusts
  if (next24hPrecipMm >= 8.0 || maxWindSpeedKmh >= 35.0) {
    return {
      status: "caution",
      advisory: "Light rainfall or gusty winds are expected; field operations may be affected. Check local field conditions before proceeding.",
      reason: `Moderate rain (${next24hPrecipMm} mm) or gusty winds (${maxWindSpeedKmh} km/h) may cause minor delays or slippery field tracks.`,
    };
  }

  // 3. Favorable: Dry and workable conditions
  return {
    status: "favorable",
    advisory: "Weather conditions are dry and suitable for routine field operations.",
    reason: `Dry weather (${next24hPrecipMm} mm expected in 24h) and moderate wind (${maxWindSpeedKmh} km/h max) favor smooth field traffic and harvest logistics.`,
  };
}

/**
 * Deterministically evaluate crop-specific meteorological hazards.
 */
export function evaluateCropHazards(
  crop: CropType,
  windows: WindowCalculations,
  isThunderstorm: boolean = false
): { hazards: AgricultureHazard[]; evidence: AgricultureEvidence[] } {
  const profile = getCropProfile(crop);
  const hazards: AgricultureHazard[] = [];
  const evidence: AgricultureEvidence[] = [];

  // --- Thunderstorm Convective Hazard ---
  if (isThunderstorm) {
    hazards.push({
      type: "thunderstorm_hazard",
      severity: "high",
      description: "Thunderstorm warning: Convective storm activity detected; field activities carry elevated safety risk.",
      triggerMetric: "Thunderstorm condition detected",
      evidence: "Atmospheric instability and convective thunderstorm conditions detected in local weather.",
    });
    evidence.push({
      parameter: "Thunderstorm Activity",
      observationOrForecast: "Thunderstorm detected",
      impactOnCrop: "High winds, convective downpours, and lightning hazard across open fields.",
    });
  }

  // --- 1. Temperature Extremes: Frost / Cold Stress ---
  if (windows.minTemperatureC <= profile.temperature.frostThresholdC) {
    hazards.push({
      type: "frost_damage",
      severity: "critical",
      description: `Severe frost hazard: Minimum temperature forecast to drop to ${windows.minTemperatureC}°C (frost threshold <= ${profile.temperature.frostThresholdC}°C).`,
      triggerMetric: `Min Temp: ${windows.minTemperatureC}°C`,
      evidence: `Forecast minimum of ${windows.minTemperatureC}°C falls at or below critical freeze threshold (${profile.temperature.frostThresholdC}°C).`,
    });
    evidence.push({
      parameter: "Minimum Temperature",
      observationOrForecast: `${windows.minTemperatureC}°C`,
      impactOnCrop: `High risk of cellular freezing, blossom drop, or foliage necrosis in ${profile.displayName}.`,
    });
  } else if (windows.minTemperatureC <= profile.temperature.coldChillingThresholdC) {
    hazards.push({
      type: "cold_stress",
      severity: "moderate",
      description: `Cold weather advisory: Minimum temperature (${windows.minTemperatureC}°C) is below the optimal threshold (${profile.temperature.coldChillingThresholdC}°C).`,
      triggerMetric: `Min Temp: ${windows.minTemperatureC}°C`,
      evidence: `Night temperatures dipping to ${windows.minTemperatureC}°C.`,
    });
    evidence.push({
      parameter: "Minimum Temperature",
      observationOrForecast: `${windows.minTemperatureC}°C`,
      impactOnCrop: `Slowed vegetative growth or prolonged ripening in ${profile.displayName}.`,
    });
  }

  // --- 2. Temperature Extremes: Heat Stress ---
  if (windows.maxTemperatureC >= profile.temperature.extremeHeatThresholdC) {
    hazards.push({
      type: "extreme_heat_stress",
      severity: "critical",
      description: `Extreme heat stress: Maximum temperature forecast to reach ${windows.maxTemperatureC}°C (extreme threshold >= ${profile.temperature.extremeHeatThresholdC}°C).`,
      triggerMetric: `Max Temp: ${windows.maxTemperatureC}°C`,
      evidence: `Peak temperatures forecast at ${windows.maxTemperatureC}°C.`,
    });
    evidence.push({
      parameter: "Maximum Temperature",
      observationOrForecast: `${windows.maxTemperatureC}°C`,
      impactOnCrop: `Severe thermal shock, desiccation, or impaired pollination in ${profile.displayName}.`,
    });
  } else if (windows.maxTemperatureC >= profile.temperature.heatStressThresholdC) {
    hazards.push({
      type: "heat_stress",
      severity: "high",
      description: `Elevated heat stress: Maximum temperature forecast to reach ${windows.maxTemperatureC}°C (stress threshold >= ${profile.temperature.heatStressThresholdC}°C).`,
      triggerMetric: `Max Temp: ${windows.maxTemperatureC}°C`,
      evidence: `Peak temperatures reaching ${windows.maxTemperatureC}°C.`,
    });
    evidence.push({
      parameter: "Maximum Temperature",
      observationOrForecast: `${windows.maxTemperatureC}°C`,
      impactOnCrop: `Accelerated forced maturity or moisture stress in ${profile.displayName}.`,
    });
  }

  // --- 3. Precipitation: Excessive Rain & Waterlogging Risk ---
  if (windows.next24hPrecipMm >= profile.precipitation.heavy24hRainMm) {
    hazards.push({
      type: "heavy_rainfall",
      severity: "high",
      description: `Heavy rainfall warning: ${windows.next24hPrecipMm} mm forecast within 24h (heavy rain threshold >= ${profile.precipitation.heavy24hRainMm} mm).`,
      triggerMetric: `24h Precip: ${windows.next24hPrecipMm} mm`,
      evidence: `Forecast downpour of ${windows.next24hPrecipMm} mm in 24 hours.`,
    });
    evidence.push({
      parameter: "24h Precipitation",
      observationOrForecast: `${windows.next24hPrecipMm} mm`,
      impactOnCrop: `Potential water accumulation and root aeration disruption in ${profile.displayName}.`,
    });
  } else if (windows.next24hPrecipMm >= profile.precipitation.moderate24hRainMm) {
    hazards.push({
      type: "moderate_rainfall",
      severity: "moderate",
      description: `Moderate rainfall anticipated: ${windows.next24hPrecipMm} mm in the next 24h.`,
      triggerMetric: `24h Precip: ${windows.next24hPrecipMm} mm`,
      evidence: `Rainfall forecast totaling ${windows.next24hPrecipMm} mm in 24 hours.`,
    });
    evidence.push({
      parameter: "24h Precipitation",
      observationOrForecast: `${windows.next24hPrecipMm} mm`,
      impactOnCrop: `Supplements crop water demand; may delay field spraying or harvest.`,
    });
  }

  // --- 4. High Wind & Lodging Risk ---
  if (windows.maxWindSpeedKmh >= profile.wind.lodgingWindRiskKmh) {
    hazards.push({
      type: "wind_lodging_risk",
      severity: "high",
      description: `Strong wind warning: Forecast wind gusts of ${windows.maxWindSpeedKmh} km/h exceed the mechanical lodging threshold (${profile.wind.lodgingWindRiskKmh} km/h).`,
      triggerMetric: `Max Wind: ${windows.maxWindSpeedKmh} km/h`,
      evidence: `Wind speeds forecast to reach ${windows.maxWindSpeedKmh} km/h.`,
    });
    evidence.push({
      parameter: "Wind Speed",
      observationOrForecast: `${windows.maxWindSpeedKmh} km/h`,
      impactOnCrop: `Increased risk of stem bending or mechanical lodging in ${profile.displayName}.`,
    });
  }

  // --- 5. Crop-Specific Humid / Pathogen-Favorable Weather Conditions ---
  if (
    crop === "potato" &&
    windows.averageHumidityPct >= profile.humidity.highHumidityThresholdPct &&
    windows.minTemperatureC >= 10.0 &&
    windows.maxTemperatureC <= 24.0 &&
    (windows.next48hPrecipMm >= 5.0 || windows.isOvercastOrRainy)
  ) {
    hazards.push({
      type: "blight_favorable_weather",
      severity: "high",
      description: `Weather conditions (high humidity ${windows.averageHumidityPct}%, moderate temperatures 10–24°C, and rain) are favorable for conditions associated with increased late-blight risk; field inspection is recommended.`,
      triggerMetric: `Humidity: ${windows.averageHumidityPct}%, Temp: ${windows.minTemperatureC}-${windows.maxTemperatureC}°C, 48h Rain: ${windows.next48hPrecipMm} mm`,
      evidence: `Atmospheric humidity at ${windows.averageHumidityPct}% coinciding with wet foliage and temperate thermal range.`,
    });
    evidence.push({
      parameter: "Humidity & Rain Coincidence",
      observationOrForecast: `${windows.averageHumidityPct}% RH with ${windows.next48hPrecipMm} mm rain`,
      impactOnCrop: `Foliar moisture duration creates an environment favorable for fungal spore germination in potato fields.`,
    });
  } else if (
    crop === "mustard" &&
    windows.averageHumidityPct >= profile.humidity.highHumidityThresholdPct &&
    windows.isOvercastOrRainy
  ) {
    hazards.push({
      type: "pest_favorable_weather",
      severity: "moderate",
      description: `Prolonged overcast skies and high humidity (${windows.averageHumidityPct}%) favor weather conditions associated with increased aphid and white rust activity.`,
      triggerMetric: `Humidity: ${windows.averageHumidityPct}%, Overcast/Rainy`,
      evidence: `Persistent cloud cover and atmospheric humidity above ${profile.humidity.highHumidityThresholdPct}%.`,
    });
    evidence.push({
      parameter: "Cloud Cover & Humidity",
      observationOrForecast: `${windows.averageHumidityPct}% RH with overcast skies`,
      impactOnCrop: `Atmospheric dampness supports microclimates favored by aphid multiplication on mustard blooms.`,
    });
  } else if (
    crop === "rice" &&
    windows.averageHumidityPct >= profile.humidity.highHumidityThresholdPct &&
    windows.next48hPrecipMm >= 15.0
  ) {
    hazards.push({
      type: "disease_favorable_weather",
      severity: "moderate",
      description: `High atmospheric humidity (${windows.averageHumidityPct}%) and persistent rainfall favor conditions associated with increased foliar disease activity.`,
      triggerMetric: `Humidity: ${windows.averageHumidityPct}%, 48h Rain: ${windows.next48hPrecipMm} mm`,
      evidence: `Relative humidity at ${windows.averageHumidityPct}% with consecutive rain showers.`,
    });
  } else if (
    crop === "wheat" &&
    windows.averageHumidityPct >= profile.humidity.highHumidityThresholdPct &&
    windows.next24hPrecipMm >= 10.0
  ) {
    hazards.push({
      type: "rust_favorable_weather",
      severity: "moderate",
      description: `Persistent dampness and high humidity (${windows.averageHumidityPct}%) favor weather conditions associated with foliar rust development.`,
      triggerMetric: `Humidity: ${windows.averageHumidityPct}%, 24h Rain: ${windows.next24hPrecipMm} mm`,
      evidence: `Elevated humidity coinciding with rainfall events.`,
    });
  }

  return { hazards, evidence };
}

/**
 * Deterministic Risk Aggregation Hierarchy:
 * - 1+ critical hazards -> "critical"
 * - 2+ high hazards -> "high"
 * - 1 high hazard -> "high"
 * - 1+ moderate hazards -> "moderate"
 * - 0 hazards -> "low"
 */
export function aggregateRiskLevel(hazards: AgricultureHazard[]): {
  level: RiskLevel;
  primaryHazard?: string;
} {
  if (hazards.length === 0) {
    return { level: "low" };
  }

  const criticals = hazards.filter((h) => h.severity === "critical");
  if (criticals.length > 0) {
    return {
      level: "critical",
      primaryHazard: criticals[0]?.description || "Critical weather hazard",
    };
  }

  const highs = hazards.filter((h) => h.severity === "high");
  if (highs.length > 0) {
    return {
      level: "high",
      primaryHazard: highs[0]?.description || "High weather hazard",
    };
  }

  const moderates = hazards.filter((h) => h.severity === "moderate");
  if (moderates.length > 0) {
    return {
      level: "moderate",
      primaryHazard: moderates[0]?.description || "Moderate weather hazard",
    };
  }

  return {
    level: "low",
    primaryHazard: hazards[0]?.description,
  };
}

/**
 * Main Pure Function: Evaluates Agriculture Risk deterministically from WeatherSnapshot.
 */
export function evaluateAgricultureRisk(
  crop: CropType | undefined,
  weather: WeatherSnapshot
): AgricultureAssessment {
  const assessedAt = new Date().toISOString();
  const isGenericOrMissing = !crop || crop === "generic";
  const effectiveCrop: CropType = crop && crop !== "generic" ? crop : "generic";
  const profile = getCropProfile(effectiveCrop);
  const windows = calculateForecastWindows(weather);
  const isThunderstorm = detectThunderstormRisk(weather);

  // 1. Evaluate Activities
  const irrigation = evaluateIrrigationActivity(
    windows,
    profile.precipitation.moderate24hRainMm
  );

  const spraying = evaluateSprayingActivity(
    weather.current.windSpeed,
    windows.max24hWindSpeedKmh,
    windows.next24hPrecipMm,
    weather.current.precipitation,
    profile.wind.sprayingWindLimitKmh,
    isThunderstorm
  );

  const fieldOperations = evaluateFieldOperationsActivity(
    windows.next24hPrecipMm,
    windows.next48hPrecipMm,
    windows.maxWindSpeedKmh,
    profile.precipitation.heavy24hRainMm
  );

  const sowing = evaluateSowingActivity(windows, isThunderstorm);
  const harvesting = evaluateHarvestingActivity(
    windows.next24hPrecipMm,
    windows.max24hPrecipProbPct,
    isThunderstorm
  );
  const outdoorFieldWork = evaluateOutdoorFieldWorkActivity(windows, isThunderstorm);

  // 2. Evaluate Hazards & Evidence
  const { hazards, evidence } = evaluateCropHazards(effectiveCrop, windows, isThunderstorm);

  // 3. Aggregate Overall Risk
  const { level: overallRiskLevel, primaryHazard } = aggregateRiskLevel(hazards);

  // 4. Deterministic ID Hash
  const hashPayload = `${effectiveCrop}_${weather.location.name}_${weather.observedAt}_${overallRiskLevel}`;
  const id = `agr_${generateDeterministicHash(hashPayload)}`;

  const cropEvidenceNote = isGenericOrMissing
    ? "Crop-specific evidence is insufficient; recommendation is based on verified weather conditions."
    : undefined;

  const cropDisplayName = isGenericOrMissing
    ? "Not specified / Generic"
    : profile.displayName;

  const forecastSummary: AgricultureForecastSummary = {
    next24hPrecipMm: windows.next24hPrecipMm,
    next48hPrecipMm: windows.next48hPrecipMm,
    sevenDayPrecipSumMm: windows.sevenDayPrecipSumMm,
    maxTemperatureC: windows.maxTemperatureC,
    minTemperatureC: windows.minTemperatureC,
    maxWindSpeedKmh: windows.maxWindSpeedKmh,
    averageHumidityPct: windows.averageHumidityPct,
  };

  return {
    id,
    crop: crop && crop !== "generic" ? crop : undefined,
    cropDisplayName,
    location: {
      name: weather.location.name,
      coordinates: weather.location.coordinates,
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
    provenance: weather.provenance || [
      {
        provider: "open-meteo",
        retrievedAt: assessedAt,
        dataType: "forecast",
      },
    ],
  };
}
