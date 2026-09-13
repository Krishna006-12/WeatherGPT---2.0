/**
 * Zod validation schemas for Unified Weather Risk Center contracts.
 */

import { z } from "zod";
import { locationInfoSchema, dataProvenanceSchema } from "./weather";

export const riskCategorySchema = z.enum([
  "heat",
  "heavy_rain",
  "thunderstorm",
  "wind",
  "uv",
  "flood",
  "drought",
  "cyclone",
]);

export const riskSeveritySchema = z.enum([
  "low",
  "moderate",
  "high",
  "extreme",
  "no_evidence",
  "unavailable",
]);

export const riskConfidenceSchema = z.enum([
  "low",
  "moderate",
  "high",
]);

export const riskStatusSchema = z.enum([
  "available",
  "insufficient_evidence",
  "unavailable",
  "no_evidence",
]);

export const riskEvidenceItemSchema = z.object({
  metric: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  source: z.string().min(1),
  timestamp: z.string().min(1),
});

export const riskAssessmentSchema = z.object({
  type: riskCategorySchema,
  severity: riskSeveritySchema,
  confidence: riskConfidenceSchema,
  evidence: z.array(riskEvidenceItemSchema),
  timeWindow: z.string().min(1),
  recommendation: z.string().min(1),
  status: riskStatusSchema,
  reason: z.string().optional(),
  provenance: z.array(dataProvenanceSchema).optional(),
});

export const weatherRiskReportSchema = z.object({
  location: locationInfoSchema,
  period: z.string().min(1),
  targetDate: z.string().optional(),
  overallSeverity: riskSeveritySchema,
  assessments: z.array(riskAssessmentSchema),
  evaluatedAt: z.string().min(1),
  provenance: z.array(dataProvenanceSchema),
});

/** Query validation for GET /api/risk */
export const riskQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (data) => (data.lat !== undefined || data.latitude !== undefined) && (data.lon !== undefined || data.longitude !== undefined),
  { message: "Either (lat, lon) or (latitude, longitude) must be provided" }
).transform((data) => ({
  latitude: data.latitude ?? data.lat!,
  longitude: data.longitude ?? data.lon!,
  timezone: data.timezone,
  targetDate: data.targetDate,
}));

export type RiskQueryInput = z.input<typeof riskQuerySchema>;
export type RiskQuery = z.infer<typeof riskQuerySchema>;
