/**
 * Core Activity Suitability Engine.
 * Evaluates weather snapshots deterministically to produce comprehensive ActivitySuitabilityReports.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type {
  ActivityType,
  ActivitySuitabilityReport,
  DailyActivitySuitability,
} from "@/types/activity";
import {
  evaluateHourlySuitability,
  evaluateDailySuitability,
} from "./activity-rules";

const ALL_ACTIVITIES: ActivityType[] = [
  "commute",
  "travel_road",
  "outdoor_work",
  "school_sports",
  "running_cycling",
  "outdoor_events",
];

export interface EvaluateActivityOptions {
  activity?: ActivityType;
  targetDate?: string;
}

/**
 * Pure deterministic function to evaluate weather snapshot for activity suitability.
 */
export function evaluateActivitySuitability(
  weather: WeatherSnapshot,
  options?: EvaluateActivityOptions
): ActivitySuitabilityReport {
  // 1. Determine target date (YYYY-MM-DD)
  let targetDate = options?.targetDate;
  if (!targetDate) {
    if (weather.daily.length > 0 && weather.daily[0]?.date) {
      targetDate = weather.daily[0].date.split("T")[0];
    } else {
      targetDate = new Date().toISOString().split("T")[0];
    }
  }

  // 2. Filter hourly weather data for the target date
  let dayHours = weather.hourly.filter((h) => h.time.startsWith(targetDate!));

  // Fallback if no matching date in hourly (e.g. timezone mismatch): take first 24 hours
  if (dayHours.length === 0 && weather.hourly.length > 0) {
    dayHours = weather.hourly.slice(0, 24);
  }

  // 3. Evaluate each activity deterministically
  const activities = {} as Record<ActivityType, DailyActivitySuitability>;

  for (const act of ALL_ACTIVITIES) {
    const hourlyWindows = dayHours.map((hourWeather) =>
      evaluateHourlySuitability(hourWeather, act)
    );
    activities[act] = evaluateDailySuitability(hourlyWindows, act, targetDate!);
  }

  const provenance = weather.provenance[0] ?? {
    provider: "open-meteo",
    retrievedAt: new Date().toISOString(),
    dataType: "forecast" as const,
  };

  return {
    location: weather.location,
    generatedAt: new Date().toISOString(),
    targetDate: targetDate!,
    requestedActivity: options?.activity,
    activities,
    provenance,
  };
}
