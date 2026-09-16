/**
 * Zod schemas for Context Event validation.
 *
 * Enforces strict boundary validation on incoming news/event data
 * before it enters the application services or AI orchestrator.
 */

import { z } from "zod";
import { coordinatesSchema, dataProvenanceSchema } from "./weather";
import { newsSourceSchema } from "./news";

export const contextEventCategorySchema = z.enum([
  "flood",
  "heatwave",
  "cyclone",
  "storm",
  "heavy_rain",
  "cold_wave",
  "drought",
  "wildfire",
  "landslide",
  "advisory",
  "other",
]);

export const proximityTierSchema = z.enum([
  "immediate",
  "near",
  "moderate",
  "distant",
  "unknown",
]);

export const contextEventLocationSchema = z.object({
  name: z.string().min(1),
  country: z.string().optional(),
  region: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
});

export const locationRelevanceSchema = z.object({
  score: z.number().min(0).max(1),
  distanceKm: z.number().nonnegative().optional(),
  proximity: proximityTierSchema,
  reasons: z.array(z.string()),
});

const isoDateTimeRegex =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const isoDateStringSchema = z
  .string()
  .regex(isoDateTimeRegex, "Invalid ISO datetime string");

export const contextEventSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().optional(),
  source: newsSourceSchema,
  timestamp: isoDateStringSchema,
  category: contextEventCategorySchema,
  location: contextEventLocationSchema,
  locationRelevance: locationRelevanceSchema.optional(),
  score: z.number().min(0).max(1).optional(),
  url: z.string().url().optional().or(z.literal("")),
  provenance: dataProvenanceSchema,
});

export type ContextEventInput = z.input<typeof contextEventSchema>;
export type ContextEventOutput = z.infer<typeof contextEventSchema>;
