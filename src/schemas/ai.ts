/**
 * Zod validation schemas for AI layer contracts.
 */

import { z } from "zod";

export const intentCategorySchema = z.enum([
  "weather",
  "forecast",
  "weather_event",
  "impact",
  "general",
]);

export const groundingStatusSchema = z.enum([
  "grounded",
  "partially_grounded",
  "general_knowledge",
  "insufficient_evidence",
]);

export const aiCitationSchema = z.object({
  title: z.string().min(1),
  source: z.string().min(1),
  url: z.string().url().optional().or(z.literal("")),
  publishedAt: z.string().optional(),
});

export const aiResponseMetadataSchema = z.object({
  locationName: z.string().optional(),
  selectedLocationName: z.string().optional(),
  queryLocationName: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  relevanceStatus: z.string().optional(),
  impactLevel: z.string().optional(),
  isFallback: z.boolean().optional(),
  fallbackReason: z.string().optional(),
});

export const aiResponseSchema = z.object({
  id: z.string().min(1),
  answer: z.string().min(1),
  intent: intentCategorySchema,
  groundingStatus: groundingStatusSchema,
  citations: z.array(aiCitationSchema),
  generatedAt: z.string().min(1),
  model: z.string().optional(),
  uncertainty: z.string().optional(),
  metadata: aiResponseMetadataSchema.optional(),
});

export const chatLocationSchema = z.object({
  name: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long (max 1000 chars)"),
  location: chatLocationSchema.optional(),
});

export type AIResponseInput = z.input<typeof aiResponseSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
