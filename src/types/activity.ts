/**
 * Core type definitions for Phase 11 Activity Suitability & Decision Intelligence.
 * Strictly deterministic, evidence-based suitability for travel, commute, outdoor work, school, and sports.
 */

import type { ISOTimestamp } from "./common";
import type { LocationInfo, DataProvenance } from "./weather";

/** Supported activity types for weather decision intelligence. */
export type ActivityType =
  | "commute"
  | "travel_road"
  | "outdoor_work"
  | "school_sports"
  | "running_cycling"
  | "outdoor_events";

/** Qualitative safety and favorability level. */
export type ActivitySafetyLevel = "optimal" | "acceptable" | "caution" | "unsafe";

/** A specific weather constraint that degrades an activity's suitability score. */
export interface LimitingFactor {
  code: string;
  severity: "minor" | "moderate" | "severe";
  description: string;
  impact: string;
}

/** Weather metrics evaluated during a specific hour. */
export interface ActivityHourMetrics {
  temperature: number;
  feelsLike?: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  condition: string;
}

/** Hourly activity suitability breakdown. */
export interface ActivityHourlyWindow {
  time: ISOTimestamp;
  hour: number;
  score: number; // 0 to 100
  safetyLevel: ActivitySafetyLevel;
  limitingFactors: LimitingFactor[];
  metrics: ActivityHourMetrics;
  advisory: string;
}

/** Aggregated time window (e.g. best or worst window). */
export interface ActivityTimeWindow {
  startHour: string; // e.g. "06:00"
  endHour: string; // e.g. "09:00"
  averageScore: number;
  safetyLevel: ActivitySafetyLevel;
  summary: string;
}

/** Comprehensive daily evaluation for a single activity. */
export interface DailyActivitySuitability {
  activity: ActivityType;
  activityName: string;
  targetDate: string; // YYYY-MM-DD
  overallScore: number; // 0 to 100
  overallSafetyLevel: ActivitySafetyLevel;
  bestWindow: ActivityTimeWindow | null;
  worstWindow: ActivityTimeWindow | null;
  limitingFactors: LimitingFactor[];
  hourlyWindows: ActivityHourlyWindow[];
  recommendation: string;
  evidenceSummary: string;
}

/** Full response report encompassing multiple or specific activities. */
export interface ActivitySuitabilityReport {
  location: LocationInfo;
  generatedAt: ISOTimestamp;
  targetDate: string;
  requestedActivity?: ActivityType;
  activities: Record<ActivityType, DailyActivitySuitability>;
  provenance: DataProvenance;
}
