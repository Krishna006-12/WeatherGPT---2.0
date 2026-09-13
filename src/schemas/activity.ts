/**
 * Zod validation schemas for Phase 11 Activity Suitability & Decision Intelligence.
 */

import { z } from "zod";
import { locationInfoSchema, dataProvenanceSchema } from "./weather";

export const activityTypeSchema = z.enum([
  "commute",
  "travel_road",
  "outdoor_work",
  "school_sports",
  "running_cycling",
  "outdoor_events",
]);

export const activitySafetyLevelSchema = z.enum([
  "optimal",
  "acceptable",
  "caution",
  "unsafe",
]);

export const limitingFactorSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["minor", "moderate", "severe"]),
  description: z.string().min(1),
  impact: z.string().min(1),
});

export const activityHourMetricsSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number().optional(),
  precipitation: z.number(),
  precipitationProbability: z.number(),
  windSpeed: z.number(),
  condition: z.string(),
});

export const activityHourlyWindowSchema = z.object({
  time: z.string().min(1),
  hour: z.number().int().min(0).max(23),
  score: z.number().min(0).max(100),
  safetyLevel: activitySafetyLevelSchema,
  limitingFactors: z.array(limitingFactorSchema),
  metrics: activityHourMetricsSchema,
  advisory: z.string(),
});

export const activityTimeWindowSchema = z.object({
  startHour: z.string().min(1),
  endHour: z.string().min(1),
  averageScore: z.number().min(0).max(100),
  safetyLevel: activitySafetyLevelSchema,
  summary: z.string(),
});

export const dailyActivitySuitabilitySchema = z.object({
  activity: activityTypeSchema,
  activityName: z.string().min(1),
  targetDate: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  overallSafetyLevel: activitySafetyLevelSchema,
  bestWindow: activityTimeWindowSchema.nullable(),
  worstWindow: activityTimeWindowSchema.nullable(),
  limitingFactors: z.array(limitingFactorSchema),
  hourlyWindows: z.array(activityHourlyWindowSchema),
  recommendation: z.string(),
  evidenceSummary: z.string(),
});

export const activitySuitabilityReportSchema = z.object({
  location: locationInfoSchema,
  generatedAt: z.string().min(1),
  targetDate: z.string().min(1),
  requestedActivity: activityTypeSchema.optional(),
  activities: z.record(activityTypeSchema, dailyActivitySuitabilitySchema),
  provenance: dataProvenanceSchema,
});

export const activityQuerySchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
  activity: activityTypeSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  timezone: z.string().optional(),
});
