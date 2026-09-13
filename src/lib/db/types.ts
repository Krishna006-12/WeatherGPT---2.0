/**
 * Type definitions and Zod schemas for WeatherGPT 2.0 database persistence layer.
 */

import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable().optional(),
  name: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isGuest: z.boolean().default(false),
  role: z.enum(["user", "farmer", "admin", "analyst"]).default("user"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const UserPreferencesSchema = z.object({
  userId: z.string(),
  language: z.enum(["en", "hi", "pa"]).default("en"),
  temperatureUnit: z.enum(["C", "F"]).default("C"),
  windSpeedUnit: z.enum(["km/h", "mph", "m/s"]).default("km/h"),
  precipitationUnit: z.enum(["mm", "inch"]).default("mm"),
  pressureUnit: z.enum(["hPa", "inHg"]).default("hPa"),
  highContrast: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  hapticFeedback: z.boolean().default(true),
  theme: z.enum(["dark", "light", "system"]).default("dark"),
  updatedAt: z.string().datetime().optional(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const SavedLocationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string(),
  region: z.string().optional(),
  timezone: z.string().default("UTC"),
  displayName: z.string(),
  isPinned: z.boolean().default(false),
  label: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type SavedLocation = z.infer<typeof SavedLocationSchema>;

export const RecentLocationSchema = z.object({
  id: z.string(),
  userIdOrSession: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string(),
  region: z.string().optional(),
  timezone: z.string().default("UTC"),
  displayName: z.string(),
  viewedAt: z.string().datetime(),
});

export type RecentLocation = z.infer<typeof RecentLocationSchema>;

export const AlertSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  radiusKm: z.number().default(50),
  minSeverity: z.enum(["minor", "moderate", "severe", "extreme"]).default("moderate"),
  categories: z.array(z.string()).default(["flood", "heatwave", "storm", "cyclone", "frost"]),
  channels: z.array(z.enum(["in_app", "web_push", "sms"])).default(["in_app"]),
  active: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AlertSubscription = z.infer<typeof AlertSubscriptionSchema>;

export const AlertLogSchema = z.object({
  id: z.string(),
  subscriptionId: z.string().nullable().optional(),
  eventId: z.string(),
  severity: z.string(),
  category: z.string(),
  channel: z.string(),
  recipientTarget: z.string().nullable().optional(),
  headline: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["delivered", "failed", "suppressed"]).default("delivered"),
  sentAt: z.string().datetime(),
});

export type AlertLog = z.infer<typeof AlertLogSchema>;

export const ChatHistorySchema = z.object({
  id: z.string(),
  userIdOrSession: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  locationContext: z.record(z.string(), z.unknown()).optional(),
  toolCalls: z.array(z.record(z.string(), z.unknown())).optional(),
  tokensUsed: z.number().default(0),
  createdAt: z.string().datetime(),
});

export type ChatHistory = z.infer<typeof ChatHistorySchema>;

export const AgricultureQueryHistorySchema = z.object({
  id: z.string(),
  userIdOrSession: z.string(),
  cropId: z.string(),
  cropName: z.string(),
  growthStage: z.string(),
  soilType: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  et0MmDay: z.number().optional(),
  spraySuitability: z.string().optional(),
  irrigationAdvice: z.string().optional(),
  diseaseRisks: z.array(z.unknown()).default([]),
  queriedAt: z.string().datetime(),
});

export type AgricultureQueryHistory = z.infer<typeof AgricultureQueryHistorySchema>;
