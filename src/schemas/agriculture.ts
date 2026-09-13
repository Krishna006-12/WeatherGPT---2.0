/**
 * Zod schemas for Agriculture Intelligence validation.
 * Validates external requests and internal assessment outputs at boundaries.
 */

import { z } from "zod";
import { coordinatesSchema, dataProvenanceSchema } from "./weather";

export const cropTypeSchema = z.enum([
  "wheat",
  "rice",
  "maize",
  "potato",
  "mustard",
  "cotton",
  "sugarcane",
  "chickpea",
  "soybean",
  "groundnut",
  "tomato",
  "onion",
  "chili",
  "tea",
  "coffee",
  "barley",
  "sorghum",
  "pearl_millet",
  "pigeon_pea",
  "lentil",
  "garlic",
  "jute",
  "mango",
  "banana",
  "generic",
]);

export const agricultureActivityTypeSchema = z.enum([
  "irrigation",
  "spraying",
  "sowing",
  "harvesting",
  "outdoor_field_work",
]);

export const riskLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "critical",
]);

export const activityStatusSchema = z.enum([
  "favorable",
  "caution",
  "unfavorable",
]);

export const agricultureQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  lon: z.coerce
    .number()
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
  crop: cropTypeSchema,
  timezone: z.string().optional(),
});

export const agricultureActivitySchema = z.object({
  status: activityStatusSchema,
  advisory: z.string().min(1),
  reason: z.string().min(1),
});

export const agricultureHazardSchema = z.object({
  type: z.string().min(1),
  severity: riskLevelSchema,
  description: z.string().min(1),
  triggerMetric: z.string().min(1),
  evidence: z.string().min(1),
});

export const agricultureEvidenceSchema = z.object({
  parameter: z.string().min(1),
  observationOrForecast: z.string().min(1),
  impactOnCrop: z.string().min(1),
});

export const agricultureForecastSummarySchema = z.object({
  next24hPrecipMm: z.number().nonnegative(),
  next48hPrecipMm: z.number().nonnegative(),
  sevenDayPrecipSumMm: z.number().nonnegative(),
  maxTemperatureC: z.number(),
  minTemperatureC: z.number(),
  maxWindSpeedKmh: z.number().nonnegative(),
  averageHumidityPct: z.number().min(0).max(100),
});

export const diseaseRiskAssessmentSchema = z.object({
  diseaseName: z.string().min(1),
  cropTarget: z.string().min(1),
  riskLevel: riskLevelSchema,
  temperatureOptimalMet: z.boolean(),
  humiditySustainedMet: z.boolean(),
  leafWetnessHoursEstimated: z.number().nonnegative(),
  pathogen: z.string().min(1),
  preventativeAdvisory: z.string().min(1),
  icarCitation: z.string().min(1),
});

export const evapotranspirationEstimateSchema = z.object({
  et0MmDay: z.number().nonnegative(),
  cropEtMmDay: z.number().nonnegative(),
  cropCoefficientKc: z.number().positive(),
  rainfall24hMm: z.number().nonnegative(),
  irrigationDeficitMm: z.number(),
  recommendedWaterLitersPerM2: z.number().nonnegative(),
  method: z.string().min(1),
});

export const soilHealthProfileSchema = z.object({
  soilType: z.enum(["alluvial", "black", "red", "laterite", "sandy_loam", "clay_loam"]),
  displayName: z.string().min(1),
  texture: z.string().min(1),
  drainage: z.enum(["poor", "moderate", "well_drained", "excessive"]),
  phRange: z.string().min(1),
  organicCarbonPct: z.number().nonnegative(),
  fieldCapacityPct: z.number().nonnegative(),
  wiltingPointPct: z.number().nonnegative(),
  source: z.string().min(1),
});

export const agricultureAssessmentSchema = z.object({
  id: z.string().min(1),
  crop: cropTypeSchema.optional(),
  cropDisplayName: z.string().min(1),
  location: z.object({
    name: z.string().min(1),
    coordinates: coordinatesSchema.optional(),
  }),
  assessedAt: z.string().min(1),
  overallRiskLevel: riskLevelSchema,
  primaryHazard: z.string().optional(),
  activities: z.object({
    irrigation: agricultureActivitySchema,
    spraying: agricultureActivitySchema,
    fieldOperations: agricultureActivitySchema,
    sowing: agricultureActivitySchema.optional(),
    harvesting: agricultureActivitySchema.optional(),
    outdoorFieldWork: agricultureActivitySchema.optional(),
  }),
  hazards: z.array(agricultureHazardSchema),
  forecastSummary: agricultureForecastSummarySchema,
  evidence: z.array(agricultureEvidenceSchema),
  diseaseRisks: z.array(diseaseRiskAssessmentSchema).optional(),
  evapotranspiration: evapotranspirationEstimateSchema.optional(),
  soilProfile: soilHealthProfileSchema.optional(),
  cropEvidenceNote: z.string().optional(),
  disclaimer: z.string().min(1),
  provenance: z.array(dataProvenanceSchema),
});

export type AgricultureQueryInput = z.input<typeof agricultureQuerySchema>;
export type AgricultureAssessmentOutput = z.infer<typeof agricultureAssessmentSchema>;
