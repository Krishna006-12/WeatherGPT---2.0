/**
 * Zod schemas for news article validation.
 * Validates external feed entries at the ingestion boundary.
 */

import { z } from "zod";
import { dataProvenanceSchema } from "./weather";

export const sourceTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const newsSourceCategorySchema = z.enum([
  "official",
  "government",
  "wire",
  "news",
  "other",
]);

export const newsSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  category: newsSourceCategorySchema,
  tier: sourceTierSchema,
});

export const newsArticleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  source: newsSourceSchema,
  publishedAt: z.string().min(1),
  fetchedAt: z.string().min(1),
  summary: z.string().optional(),
  content: z.string().optional(),
  language: z.string().optional(),
  sourceTier: sourceTierSchema,
  provenance: dataProvenanceSchema,
  imageUrl: z.string().url().optional(),
});

export const rawFeedItemSchema = z.object({
  title: z.string().min(1),
  link: z.string().min(1),
  pubDate: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  author: z.string().optional(),
  categories: z.array(z.string()).optional(),
  guid: z.string().optional(),
});

export type NewsArticleInput = z.input<typeof newsArticleSchema>;
export type RawFeedItemInput = z.input<typeof rawFeedItemSchema>;
