/**
 * Deterministic rules and threshold evaluation for Activity Decision Intelligence.
 * 100% evidence-based calculations without hallucination or LLM guessing.
 */

import type { HourlyWeather, WeatherCondition } from "@/types/weather";
import type {
  ActivityType,
  ActivitySafetyLevel,
  LimitingFactor,
  ActivityHourlyWindow,
  DailyActivitySuitability,
  ActivityTimeWindow,
} from "@/types/activity";

export const ACTIVITY_NAMES: Record<ActivityType, string> = {
  commute: "Daily Commute & Local Travel",
  travel_road: "Highway & Road Travel",
  outdoor_work: "Outdoor Construction & Field Work",
  school_sports: "School Outdoor Sports & Play",
  running_cycling: "Running, Jogging & Cycling",
  outdoor_events: "Outdoor Gatherings & Events",
};

/**
 * Evaluates a single hour for a specific activity against deterministic meteorological rules.
 */
export function evaluateHourlySuitability(
  hourWeather: HourlyWeather,
  activity: ActivityType
): ActivityHourlyWindow {
  const hourMatch = hourWeather.time.match(/T(\d{2}):/);
  const hour = hourMatch
    ? parseInt(hourMatch[1]!, 10)
    : new Date(hourWeather.time).getUTCHours();

  const temp = hourWeather.temperature;
  const feelsLike = hourWeather.feelsLike ?? temp;
  const precip = hourWeather.precipitation;
  const precipProb = hourWeather.precipitationProbability;
  const wind = hourWeather.windSpeed;
  const condition = hourWeather.condition;

  const limitingFactors: LimitingFactor[] = [];
  let score = 100;
  let forceUnsafe = false;

  // 1. Severe Convective & Atmospheric Hazards (Universal)
  if (condition === "thunderstorm" || condition === "tornado") {
    limitingFactors.push({
      code: "thunderstorm_lightning",
      severity: "severe",
      description: "Active thunderstorm and lightning risk detected.",
      impact: "Zero outdoor tolerance. Seek grounded indoor shelter immediately.",
    });
    score -= 75;
    forceUnsafe = true;
  }

  // 2. Visibility & Fog / Dust
  if (condition === "fog" || condition === "smoke" || condition === "dust") {
    if (activity === "commute" || activity === "travel_road") {
      limitingFactors.push({
        code: "impaired_visibility",
        severity: "severe",
        description: `Dense ${condition} reducing road visibility.`,
        impact: "Severe hazard for vehicles and high-speed highway travel.",
      });
      score -= 45;
    } else if (activity === "school_sports" || activity === "running_cycling") {
      limitingFactors.push({
        code: "air_respiratory_strain",
        severity: "moderate",
        description: `Atmospheric ${condition} causing respiratory irritation.`,
        impact: "Vigorous outdoor aerobic exercise is not advised.",
      });
      score -= 30;
    }
  }

  // 3. Precipitation & Rain Impact
  if (precip >= 10 || condition === "heavy-rain") {
    const factor: LimitingFactor = {
      code: "torrential_rainfall",
      severity: "severe",
      description: `Heavy rainfall (${precip.toFixed(1)} mm) with waterlogging potential.`,
      impact:
        activity === "travel_road" || activity === "commute"
          ? "High hydroplaning and localized urban waterlogging risk."
          : "Work stoppages, washed-out grounds, and equipment hazards.",
    };
    limitingFactors.push(factor);
    score -= 65;
    forceUnsafe = true;
  } else if (precip >= 3.0 || condition === "rain") {
    limitingFactors.push({
      code: "steady_rainfall",
      severity: "moderate",
      description: `Steady rain (${precip.toFixed(1)} mm).`,
      impact:
        activity === "outdoor_events"
          ? "Outdoor gatherings require waterproof marquee/tents."
          : activity === "travel_road" || activity === "commute"
          ? "Wet tarmac, increased braking distance, and traffic congestion."
          : "Slippery surfaces and wet conditions.",
    });
    score -= 35;
  } else if (precip >= 0.8 || condition === "drizzle") {
    limitingFactors.push({
      code: "light_precipitation",
      severity: "minor",
      description: `Light rain or drizzle (${precip.toFixed(1)} mm).`,
      impact: "Damp conditions; rain protection or waterproof gear advised.",
    });
    score -= 18;
  } else if (precipProb >= 70 && precip === 0) {
    limitingFactors.push({
      code: "elevated_rain_threat",
      severity: "minor",
      description: `High precipitation probability (${precipProb}%) despite no current accumulation.`,
      impact: "Sudden rain showers possible; have contingency cover.",
    });
    score -= 15;
  }

  // 4. Heat Stress & Thermal Comfort
  if (feelsLike >= 42) {
    const factor: LimitingFactor = {
      code: "extreme_heat_danger",
      severity: "severe",
      description: `Dangerous heat index (${feelsLike.toFixed(1)}°C feels-like).`,
      impact:
        activity === "school_sports"
          ? "Children heat exhaustion risk. All outdoor physical exertion must be suspended."
          : activity === "outdoor_work"
          ? "Extreme occupational heat stress. Mandatory cooling breaks and shaded rest."
          : "Rapid dehydration and heat cramps during outdoor exertion.",
    };
    limitingFactors.push(factor);
    score -= 60;
    if (activity === "school_sports" || activity === "outdoor_work" || activity === "running_cycling") {
      forceUnsafe = true;
    }
  } else if (feelsLike >= 37) {
    limitingFactors.push({
      code: "high_heat_index",
      severity: "moderate",
      description: `Elevated heat index (${feelsLike.toFixed(1)}°C).`,
      impact: "High perspiration. Frequent hydration and sun protection mandatory.",
    });
    score -= 30;
  } else if (feelsLike >= 33) {
    limitingFactors.push({
      code: "warm_humid_discomfort",
      severity: "minor",
      description: `Warm conditions (${feelsLike.toFixed(1)}°C feels-like).`,
      impact: "Mild fatigue during sustained outdoor exertion.",
    });
    score -= 12;
  }

  // 5. Cold Stress
  if (feelsLike <= 2) {
    limitingFactors.push({
      code: "severe_cold_chill",
      severity: "moderate",
      description: `Freezing chill (${feelsLike.toFixed(1)}°C feels-like).`,
      impact: "Risk of numbness and hypothermia without thermal layering.",
    });
    score -= 35;
  } else if (feelsLike <= 8) {
    limitingFactors.push({
      code: "cold_weather",
      severity: "minor",
      description: `Cold temperature (${feelsLike.toFixed(1)}°C).`,
      impact: "Warm clothing recommended.",
    });
    score -= 15;
  }

  // 6. Wind Speed & Gust Hazards
  if (wind >= 55) {
    const factor: LimitingFactor = {
      code: "gale_force_winds",
      severity: "severe",
      description: `Strong winds (${wind.toFixed(0)} km/h).`,
      impact:
        activity === "travel_road" || activity === "commute"
          ? "Hazardous crosswinds for two-wheelers, buses, and high-sided trucks."
          : activity === "outdoor_work"
          ? "Scaffolding, crane operation, and roof work must cease immediately."
          : activity === "outdoor_events"
          ? "Severe risk of tent, marquee, and canopy structural damage."
          : "Hazardous flying debris and severe headwind resistance.",
    };
    limitingFactors.push(factor);
    score -= 55;
    forceUnsafe = true;
  } else if (wind >= 35) {
    limitingFactors.push({
      code: "gusty_winds",
      severity: "moderate",
      description: `Brisk winds (${wind.toFixed(0)} km/h).`,
      impact: "Difficulty handling lightweight structures and two-wheelers.",
    });
    score -= 22;
  }

  // Clamp score to [0, 100]
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine safety level
  let safetyLevel: ActivitySafetyLevel;
  if (forceUnsafe || score < 40) {
    safetyLevel = "unsafe";
  } else if (score < 65) {
    safetyLevel = "caution";
  } else if (score < 85) {
    safetyLevel = "acceptable";
  } else {
    safetyLevel = "optimal";
  }

  // Formulate concise advisory
  let advisory: string;
  if (safetyLevel === "optimal") {
    advisory = "Favorable conditions. Ideal weather window for outdoor activity.";
  } else if (safetyLevel === "acceptable") {
    advisory = "Acceptable conditions. Minor weather factors present but manageable.";
  } else if (safetyLevel === "caution") {
    advisory = `Caution advised. Primary factor: ${limitingFactors[0]?.description ?? "Unfavorable weather variation."}`;
  } else {
    advisory = `Unsafe conditions. Severe restriction due to ${limitingFactors[0]?.description ?? "hazardous weather."}`;
  }

  return {
    time: hourWeather.time,
    hour,
    score,
    safetyLevel,
    limitingFactors,
    metrics: {
      temperature: temp,
      feelsLike,
      precipitation: precip,
      precipitationProbability: precipProb,
      windSpeed: wind,
      condition,
    },
    advisory,
  };
}

/**
 * Aggregates 24 hourly windows into a cohesive daily activity suitability evaluation.
 */
export function evaluateDailySuitability(
  hourlyWindows: ActivityHourlyWindow[],
  activity: ActivityType,
  targetDate: string
): DailyActivitySuitability {
  if (hourlyWindows.length === 0) {
    return {
      activity,
      activityName: ACTIVITY_NAMES[activity],
      targetDate,
      overallScore: 50,
      overallSafetyLevel: "caution",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      hourlyWindows: [],
      recommendation: "Insufficient hourly data to evaluate activity suitability.",
      evidenceSummary: "No hourly weather points available.",
    };
  }

  // Calculate day-long average score
  const totalScore = hourlyWindows.reduce((sum, h) => sum + h.score, 0);
  const avgScore = Math.round(totalScore / hourlyWindows.length);

  // Collect unique limiting factors across the day
  const factorMap = new Map<string, LimitingFactor>();
  for (const h of hourlyWindows) {
    for (const factor of h.limitingFactors) {
      if (!factorMap.has(factor.code) || factor.severity === "severe") {
        factorMap.set(factor.code, factor);
      }
    }
  }
  const allLimitingFactors = Array.from(factorMap.values());

  // Find 3-hour sliding best and worst windows during active hours (06:00 to 21:00)
  const activeHours = hourlyWindows.filter((h) => h.hour >= 6 && h.hour <= 21);
  const evaluationPool = activeHours.length >= 3 ? activeHours : hourlyWindows;

  let bestWindow: ActivityTimeWindow | null = null;
  let worstWindow: ActivityTimeWindow | null = null;

  let maxWindowScore = -1;
  let bestMaxSingleScore = -1;
  let minWindowScore = 101;
  let worstSevereCount = -1;
  let worstMinSingleScore = 101;

  for (let i = 0; i <= evaluationPool.length - 3; i++) {
    const windowSlice = evaluationPool.slice(i, i + 3);
    const first = windowSlice[0];
    const last = windowSlice[windowSlice.length - 1];
    if (!first || !last) continue;

    const winAvg = Math.round(
      windowSlice.reduce((sum, h) => sum + h.score, 0) / windowSlice.length
    );
    const startHourStr = `${String(first.hour).padStart(2, "0")}:00`;
    const endHourStr = `${String(last.hour + 1).padStart(2, "0")}:00`;

    const maxSingleScore = Math.max(...windowSlice.map((h) => h.score));
    const minSingleScore = Math.min(...windowSlice.map((h) => h.score));
    const severeCount = windowSlice.reduce(
      (sum, h) =>
        sum + h.limitingFactors.filter((f) => f.severity === "severe").length,
      0
    );

    // Best window selection (higher average, or higher peak single-hour score on tie)
    if (
      winAvg > maxWindowScore ||
      (winAvg === maxWindowScore && maxSingleScore > bestMaxSingleScore)
    ) {
      maxWindowScore = winAvg;
      bestMaxSingleScore = maxSingleScore;
      bestWindow = {
        startHour: startHourStr,
        endHour: endHourStr,
        averageScore: winAvg,
        safetyLevel:
          winAvg >= 85
            ? "optimal"
            : winAvg >= 65
            ? "acceptable"
            : winAvg >= 40
            ? "caution"
            : "unsafe",
        summary: `Peak favorability between ${startHourStr} and ${endHourStr} (Score: ${winAvg}/100).`,
      };
    }

    // Worst window selection (lower average, or more severe factors/lower minimum single-hour on tie)
    if (
      winAvg < minWindowScore ||
      (winAvg === minWindowScore &&
        (severeCount > worstSevereCount ||
          (severeCount === worstSevereCount && minSingleScore < worstMinSingleScore)))
    ) {
      minWindowScore = winAvg;
      worstSevereCount = severeCount;
      worstMinSingleScore = minSingleScore;
      worstWindow = {
        startHour: startHourStr,
        endHour: endHourStr,
        averageScore: winAvg,
        safetyLevel:
          winAvg >= 85
            ? "optimal"
            : winAvg >= 65
            ? "acceptable"
            : winAvg >= 40
            ? "caution"
            : "unsafe",
        summary: `Most challenging window between ${startHourStr} and ${endHourStr} (Score: ${winAvg}/100).`,
      };
    }
  }

  // Overall Safety Level
  const hasSevereFactor = allLimitingFactors.some((f) => f.severity === "severe");
  let overallSafetyLevel: ActivitySafetyLevel;
  if (hasSevereFactor && avgScore < 50) {
    overallSafetyLevel = "unsafe";
  } else if (avgScore < 40) {
    overallSafetyLevel = "unsafe";
  } else if (avgScore < 65 || hasSevereFactor) {
    overallSafetyLevel = "caution";
  } else if (avgScore < 85) {
    overallSafetyLevel = "acceptable";
  } else {
    overallSafetyLevel = "optimal";
  }

  // Construct recommendation
  let recommendation: string;
  if (overallSafetyLevel === "optimal") {
    recommendation = `Optimal day for ${ACTIVITY_NAMES[activity]}. Conditions are calm and clear. ${bestWindow ? `Best window: ${bestWindow.startHour} - ${bestWindow.endHour}.` : ""}`;
  } else if (overallSafetyLevel === "acceptable") {
    recommendation = `Good day overall for ${ACTIVITY_NAMES[activity]}. Proceed normally with standard awareness. ${bestWindow ? `Target ${bestWindow.startHour} - ${bestWindow.endHour} for best weather.` : ""}`;
  } else if (overallSafetyLevel === "caution") {
    recommendation = `Caution recommended for ${ACTIVITY_NAMES[activity]}. ${allLimitingFactors[0]?.impact ?? "Expect adverse weather."} ${bestWindow ? `If essential, schedule between ${bestWindow.startHour} - ${bestWindow.endHour}.` : ""}`;
  } else {
    recommendation = `Unsafe conditions detected for ${ACTIVITY_NAMES[activity]}. ${allLimitingFactors[0]?.description ?? "Severe weather hazards active."} Rescheduling or indoor alternative strongly advised.`;
  }

  const evidenceSummary = `Evaluated 24 hourly periods. Overall suitability score ${avgScore}/100 (${overallSafetyLevel}). Primary constraints: ${allLimitingFactors.map((f) => f.code).join(", ") || "None"}.`;

  return {
    activity,
    activityName: ACTIVITY_NAMES[activity],
    targetDate,
    overallScore: avgScore,
    overallSafetyLevel,
    bestWindow,
    worstWindow,
    limitingFactors: allLimitingFactors,
    hourlyWindows,
    recommendation,
    evidenceSummary,
  };
}
