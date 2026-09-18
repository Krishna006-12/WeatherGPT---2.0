/**
 * Zod validation schemas for Evaluation Metrics and Telemetry ingestion.
 */

import { z } from "zod";

export const telemetrySourceSchema = z.enum(["seed", "live"]);

export const taskCompletionStatusSchema = z.enum([
  "direct_answer",
  "degraded_fallback",
  "provider_error",
  "user_cancelled",
]);

export const coarsenedCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const queryLatencyRecordSchema = z.object({
  traceId: z.string().min(1),
  endpoint: z.string().min(1),
  latencyMs: z.number().nonnegative(),
  statusCode: z.number().int().min(100).max(599),
  taskCompletion: taskCompletionStatusSchema,
  persona: z.enum(["general_public", "farmer", "disaster_manager"]),
  language: z.enum(["en", "hi", "pa", "hi-en"]),
  timestamp: z.string().datetime(),
  cacheHit: z.boolean(),
  source: telemetrySourceSchema.default("live"),
});

export const forecastAccuracyRecordSchema = z.object({
  recordId: z.string().min(1),
  locationName: z.string().min(1),
  coarsenedCoordinates: coarsenedCoordinatesSchema.optional(),
  forecastGeneratedTime: z.string().datetime(),
  forecastTargetTime: z.string().datetime(),
  leadTimeHours: z.number().nonnegative(),
  forecasted: z.object({
    temperature: z.number(),
    precipitationSum: z.number().optional(),
    windSpeed: z.number().optional(),
    condition: z.string().optional(),
  }),
  observed: z
    .object({
      temperature: z.number(),
      precipitationSum: z.number().optional(),
      windSpeed: z.number().optional(),
      condition: z.string().optional(),
    })
    .optional(),
  tempErrorAbs: z.number().nonnegative().optional(),
  precipErrorAbs: z.number().nonnegative().optional(),
  windErrorAbs: z.number().nonnegative().optional(),
  verifiedAt: z.string().datetime().optional(),
  source: telemetrySourceSchema.default("live"),
});

export const metricsIngestPayloadSchema = z.object({
  endpoint: z.string().min(1),
  latencyMs: z.number().nonnegative(),
  statusCode: z.number().int().default(200),
  taskCompletion: taskCompletionStatusSchema.default("direct_answer"),
  persona: z.enum(["general_public", "farmer", "disaster_manager"]).default("general_public"),
  language: z.enum(["en", "hi", "pa", "hi-en"]).default("en"),
  cacheHit: z.boolean().default(false),
  source: telemetrySourceSchema.default("live"),
});

export type MetricsIngestPayload = z.infer<typeof metricsIngestPayloadSchema>;
