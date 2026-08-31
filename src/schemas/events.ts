/**
 * Zod schemas for weather event validation.
 * Validates event data at the boundary before it enters storage/API.
 */

import { z } from "zod";
import { coordinatesSchema, dataProvenanceSchema } from "./weather";
import { sourceTierSchema, newsSourceCategorySchema } from "./news";

export const eventCategorySchema = z.enum([
  "flood",
  "flash_flood",
  "cyclone",
  "tropical_storm",
  "severe_storm",
  "heavy_rain",
  "thunderstorm",
  "lightning",
  "heatwave",
  "cold_wave",
  "drought",
  "wildfire",
  "landslide",
  "avalanche",
  "dust_storm",
  "earthquake",
  "tsunami",
  "volcanic",
  "other",
]);

export const hazardTypeSchema = eventCategorySchema;

export const severitySchema = z.enum(["low", "moderate", "high", "extreme"]);

export const eventStatusSchema = z.enum([
  "monitoring",
  "active",
  "resolved",
  "archived",
]);

export const impactStatusSchema = z.enum([
  "confirmed",
  "likely",
  "possible",
  "monitoring",
  "unlikely",
  "unknown",
]);

export const eventLocationSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  region: z.string().optional(),
  city: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
  timezone: z.string().optional(),
});

export const eventRegionSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  coordinates: coordinatesSchema.optional(),
});

export const eventSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  publishedAt: z.string().min(1),
  category: newsSourceCategorySchema,
  tier: sourceTierSchema,
});

export const regionalImpactSchema = z.object({
  region: eventRegionSchema,
  status: impactStatusSchema,
  severity: severitySchema,
  description: z.string().optional(),
});

export const weatherEventSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  category: eventCategorySchema,
  hazard: eventCategorySchema,
  severity: severitySchema,
  status: eventStatusSchema,
  description: z.string().min(1),
  summary: z.string().optional(),
  location: eventLocationSchema,
  locations: z.array(eventLocationSchema).default([]),
  affectedRegions: z.array(eventRegionSchema).default([]),
  firstSeenAt: z.string().min(1),
  lastUpdatedAt: z.string().min(1),
  confidence: z.number().min(0).max(1),
  sourceArticleIds: z.array(z.string()).default([]),
  sources: z.array(eventSourceSchema).min(1),
  impacts: z.array(regionalImpactSchema).default([]),
  provenance: z.array(dataProvenanceSchema).min(1),
});

export type WeatherEventInput = z.input<typeof weatherEventSchema>;
