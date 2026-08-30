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
  country: z.string().min(1),
  coordinates: coordinatesSchema,
  timezone: z.string().min(1),
});

const dataProvenanceSchema = z.object({
  provider: z.string().min(1),
  retrievedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
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
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  pressure: z.number().min(0),
  visibility: z.number().min(0),
  uvIndex: z.number().min(0),
  condition: weatherConditionSchema,
  description: z.string(),
  observedAt: z.string().datetime(),
});

const hourlyWeatherSchema = z.object({
  time: z.string().datetime(),
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0),
  condition: weatherConditionSchema,
  precipitationProbability: z.number().min(0).max(100),
  description: z.string(),
});

const dailyWeatherSchema = z.object({
  date: z.string().datetime(),
  temperatureHigh: z.number(),
  temperatureLow: z.number(),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0),
  condition: weatherConditionSchema,
  precipitationProbability: z.number().min(0).max(100),
  sunrise: z.string().datetime(),
  sunset: z.string().datetime(),
  description: z.string(),
});

const alertSeveritySchema = z.enum(['minor', 'moderate', 'severe', 'extreme']);

const weatherAlertSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: alertSeveritySchema,
  description: z.string(),
  source: z.string().min(1),
  effectiveAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const weatherSnapshotSchema = z.object({
  location: locationInfoSchema,
  observedAt: z.string().datetime(),
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
