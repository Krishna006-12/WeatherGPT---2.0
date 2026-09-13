/**
 * Zod validation schemas for NWP Model Intelligence & Model Consensus contracts.
 */

import { z } from "zod";
import { locationInfoSchema, dataProvenanceSchema, weatherConditionSchema } from "./weather";

export const nwpModelIdSchema = z.enum([
  "ecmwf",
  "gfs",
  "icon",
  "gem",
  "meteofrance",
]);

export const metricAgreementLevelSchema = z.enum([
  "high",
  "moderate",
  "divergent",
]);

export const consensusConfidenceSchema = z.enum([
  "high",
  "moderate",
  "low",
]);

export const modelDailyForecastSchema = z.object({
  date: z.string().min(1),
  temperatureHigh: z.number(),
  temperatureLow: z.number(),
  precipitationSum: z.number().min(0),
  precipitationProbability: z.number().min(0).max(100),
  windSpeedMax: z.number().min(0),
  condition: weatherConditionSchema,
  description: z.string(),
});

export const modelForecastSchema = z.object({
  modelId: nwpModelIdSchema,
  modelName: z.string().min(1),
  organization: z.string().min(1),
  resolutionKm: z.number().positive(),
  runTimestamp: z.string().optional(),
  daily: z.array(modelDailyForecastSchema),
});

export const metricConsensusSchema = z.object({
  metric: z.string().min(1),
  unit: z.string(),
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
  spread: z.number(),
  standardDeviation: z.number(),
  agreementLevel: metricAgreementLevelSchema,
  valuesByModel: z.record(z.string(), z.number()),
});

export const modelDivergenceItemSchema = z.object({
  modelId: nwpModelIdSchema,
  metric: z.string().min(1),
  deviation: z.number(),
  direction: z.enum(["higher", "lower"]),
  explanation: z.string().min(1),
});

export const dailyConsensusSchema = z.object({
  date: z.string().min(1),
  temperatureHigh: metricConsensusSchema,
  temperatureLow: metricConsensusSchema,
  precipitationSum: metricConsensusSchema,
  windSpeedMax: metricConsensusSchema,
  consensusCondition: weatherConditionSchema,
  conditionAgreementPercent: z.number().min(0).max(100),
  agreementScore: z.number().min(0).max(100),
  confidence: consensusConfidenceSchema,
  divergentModels: z.array(modelDivergenceItemSchema),
  modelConditions: z.record(z.string(), weatherConditionSchema),
});

export const modelConsensusReportSchema = z.object({
  location: locationInfoSchema,
  targetDate: z.string().optional(),
  modelsUsed: z.array(nwpModelIdSchema).min(1),
  modelDetails: z.array(
    z.object({
      modelId: nwpModelIdSchema,
      name: z.string().min(1),
      organization: z.string().min(1),
      resolutionKm: z.number().positive(),
    })
  ),
  consensusDays: z.array(dailyConsensusSchema),
  overallAgreementScore: z.number().min(0).max(100),
  overallConfidence: consensusConfidenceSchema,
  summaryNotes: z.string().min(1),
  evaluatedAt: z.string().min(1),
  provenance: z.array(dataProvenanceSchema),
});

/** Query validation schema for GET /api/consensus */
export const consensusQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    timezone: z.string().optional(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    models: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.lat !== undefined || data.latitude !== undefined) &&
      (data.lon !== undefined || data.longitude !== undefined),
    { message: "Either (lat, lon) or (latitude, longitude) must be provided" }
  )
  .transform((data) => ({
    latitude: data.latitude ?? data.lat!,
    longitude: data.longitude ?? data.lon!,
    timezone: data.timezone,
    targetDate: data.targetDate,
    models: data.models,
  }));

export type ConsensusQueryInput = z.input<typeof consensusQuerySchema>;
export type ConsensusQuery = z.infer<typeof consensusQuerySchema>;
