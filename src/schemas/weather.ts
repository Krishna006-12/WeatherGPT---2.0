/**
 * Zod schemas for weather data validation.
 * These schemas validate data at the external boundary
 * (provider adapter output) before it enters the application.
 *
 * Flow: External data → Zod validation → normalized typed model
 */

import { z } from 'zod';

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const locationInfoSchema = z.object({
  name: z.string().min(1),
  region: z.string(),
  country: z.string(),
  coordinates: coordinatesSchema,
  timezone: z.string().min(1),
});

const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const isoDateStringSchema = z.string().regex(isoDateTimeRegex, 'Invalid ISO datetime string');

const dataProvenanceSchema = z.object({
  provider: z.string().min(1),
  retrievedAt: isoDateStringSchema,
  expiresAt: isoDateStringSchema.optional(),
  observedAt: isoDateStringSchema.optional(),
  modelRunAt: isoDateStringSchema.optional(),
  timezone: z.string().optional(),
  dataType: z.enum(['observation', 'current', 'forecast']).optional(),
});

const weatherConditionSchema = z.enum([
  'clear',
  'partly-cloudy',
  'cloudy',
  'overcast',
  'mist',
  'fog',
  'drizzle',
  'rain',
  'heavy-rain',
  'thunderstorm',
  'snow',
  'sleet',
  'hail',
  'dust',
  'smoke',
  'tornado',
  'unknown',
]);

const currentWeatherSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number().min(0).max(100),
  precipitation: z.number().min(0),
  precipitationProbability: z.number().min(0).max(100).optional(),
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  windGust: z.number().min(0).optional(),
  pressure: z.number().min(0),
  visibility: z.number().min(0).optional(),
  uvIndex: z.number().min(0).optional(),
  cloudCover: z.number().min(0).max(100),
  condition: weatherConditionSchema,
  description: z.string().optional(),
  observedAt: isoDateStringSchema,
});

const hourlyWeatherSchema = z.object({
  time: isoDateStringSchema,
  temperature: z.number(),
  precipitation: z.number().min(0),
  feelsLike: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  windSpeed: z.number().min(0),
  condition: weatherConditionSchema,
  precipitationProbability: z.number().min(0).max(100),
  description: z.string().optional(),
});

const dailyWeatherSchema = z.object({
  date: isoDateStringSchema,
  temperatureHigh: z.number(),
  temperatureLow: z.number(),
  humidity: z.number().min(0).max(100).optional(),
  windSpeed: z.number().min(0).optional(),
  condition: weatherConditionSchema,
  precipitationProbability: z.number().min(0).max(100),
  precipitationSum: z.number().min(0),
  sunrise: isoDateStringSchema,
  sunset: isoDateStringSchema,
  description: z.string().optional(),
});

const alertSeveritySchema = z.enum(['minor', 'moderate', 'severe', 'extreme']);

const weatherAlertSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: alertSeveritySchema,
  description: z.string(),
  source: z.string().min(1),
  effectiveAt: isoDateStringSchema,
  expiresAt: isoDateStringSchema,
});

export const weatherSnapshotSchema = z.object({
  location: locationInfoSchema,
  observedAt: isoDateStringSchema,
  current: currentWeatherSchema,
  hourly: z.array(hourlyWeatherSchema),
  daily: z.array(dailyWeatherSchema),
  alerts: z.array(weatherAlertSchema),
  provenance: z.array(dataProvenanceSchema).min(1),
});

export type WeatherSnapshotInput = z.input<typeof weatherSnapshotSchema>;

export {
  coordinatesSchema,
  locationInfoSchema,
  dataProvenanceSchema,
  weatherConditionSchema,
  currentWeatherSchema,
  hourlyWeatherSchema,
  dailyWeatherSchema,
  alertSeveritySchema,
  weatherAlertSchema,
};
