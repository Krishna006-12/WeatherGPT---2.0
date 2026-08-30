/**
 * Zod schemas for weather event validation.
 * Validates event data at the external boundary before
 * it enters the normalized event pipeline.
 */

import { z } from 'zod';
import { coordinatesSchema, dataProvenanceSchema } from './weather';

const hazardTypeSchema = z.enum([
  'flood',
  'cyclone',
  'storm',
  'heatwave',
  'coldwave',
  'landslide',
  'drought',
  'wildfire',
  'avalanche',
  'earthquake',
  'other',
]);

const severitySchema = z.enum(['low', 'moderate', 'high', 'extreme']);

const impactStatusSchema = z.enum([
  'confirmed',
  'likely',
  'possible',
  'monitoring',
  'unlikely',
  'unknown',
]);

const eventLocationSchema = z.object({
  name: z.string().min(1),
  coordinates: coordinatesSchema.optional(),
  country: z.string().min(1),
  region: z.string().optional(),
});

const eventRegionSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  coordinates: coordinatesSchema.optional(),
});

const sourceCategory = z.enum([
  'official',
  'government',
  'wire',
  'news',
  'other',
]);

const eventSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  publishedAt: z.string().datetime(),
  category: sourceCategory,
});

const regionalImpactSchema = z.object({
  region: eventRegionSchema,
  status: impactStatusSchema,
  severity: severitySchema,
  description: z.string().optional(),
});

export const weatherEventSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  hazard: hazardTypeSchema,
  severity: severitySchema,
  summary: z.string().min(1),
  startedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
  location: eventLocationSchema,
  affectedRegions: z.array(eventRegionSchema),
  sources: z.array(eventSourceSchema).min(1),
  confidence: z.number().min(0).max(1),
  impacts: z.array(regionalImpactSchema),
  provenance: z.array(dataProvenanceSchema).min(1),
});

export type WeatherEventInput = z.input<typeof weatherEventSchema>;

export {
  hazardTypeSchema,
  severitySchema,
  impactStatusSchema,
  eventLocationSchema,
  eventRegionSchema,
  eventSourceSchema,
  regionalImpactSchema,
};
