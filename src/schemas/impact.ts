/**
 * Zod validation schemas for Impact Engine contracts.
 */

import { z } from "zod";
import { eventCategorySchema, eventLocationSchema, indiaImpactAssessmentSchema } from "./events";
import { dataProvenanceSchema } from "./weather";

export const impactLevelSchema = z.enum([
  "none",
  "low",
  "moderate",
  "high",
  "extreme",
]);

export const relevanceStatusSchema = z.enum([
  "confirmed",
  "likely",
  "possible",
  "monitoring",
  "unlikely",
  "unknown",
]);

export const evidenceTypeSchema = z.enum([
  "explicit_city_match",
  "explicit_region_match",
  "explicit_country_match",
  "geographic_proximity",
  "official_authority_citation",
  "weather_condition_aligned",
  "weather_condition_neutral",
  "downstream_unestablished",
  "no_evidence_available",
]);

export const evidenceItemSchema = z.object({
  type: evidenceTypeSchema,
  description: z.string().min(1),
  weight: z.enum(["supporting", "neutral", "refuting"]),
  source: z.string().optional(),
});

export const impactAssessmentSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  targetLocation: eventLocationSchema,
  hazard: eventCategorySchema,
  impactLevel: impactLevelSchema,
  relevanceStatus: relevanceStatusSchema,
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1)),
  evidence: z.array(evidenceItemSchema).min(1),
  assessedAt: z.string().min(1),
  methodology: z.string().min(1),
  provenance: z.array(dataProvenanceSchema).min(1),
  eventFact: z.string().optional(),
  geographicRelevance: z.string().optional(),
  actualHazardImpact: z.string().optional(),
  advisory: z.string().optional(),
  indiaImpact: indiaImpactAssessmentSchema.optional(),
});

export const impactQuerySchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

export type ImpactAssessmentInput = z.input<typeof impactAssessmentSchema>;
export type ImpactQueryInput = z.infer<typeof impactQuerySchema>;
