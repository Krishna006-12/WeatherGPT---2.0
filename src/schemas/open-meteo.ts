import { z } from "zod";

export const openMeteoCurrentSchema = z.object({
  time: z.string(),
  interval: z.number(),
  temperature_2m: z.number(),
  relative_humidity_2m: z.number(),
  apparent_temperature: z.number(),
  precipitation: z.number(),
  weather_code: z.number(),
  wind_speed_10m: z.number(),
  wind_direction_10m: z.number(),
  wind_gusts_10m: z.number().optional(),
  surface_pressure: z.number().optional(),
  cloud_cover: z.number().optional(),
});

export const openMeteoHourlySchema = z.object({
  time: z.array(z.string()),
  temperature_2m: z.array(z.number()),
  precipitation: z.array(z.number()),
  precipitation_probability: z.array(z.number()),
  weather_code: z.array(z.number()),
  wind_speed_10m: z.array(z.number()),
});

export const openMeteoDailySchema = z.object({
  time: z.array(z.string()),
  temperature_2m_max: z.array(z.number()),
  temperature_2m_min: z.array(z.number()),
  precipitation_sum: z.array(z.number()),
  precipitation_probability_max: z.array(z.number()),
  weather_code: z.array(z.number()),
  sunrise: z.array(z.string()),
  sunset: z.array(z.string()),
});

export const openMeteoForecastResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number(),
  utc_offset_seconds: z.number(),
  timezone: z.string(),
  timezone_abbreviation: z.string(),
  elevation: z.number(),
  current_units: z.record(z.string(), z.string()).optional(),
  current: openMeteoCurrentSchema,
  hourly: openMeteoHourlySchema,
  daily: openMeteoDailySchema,
});

export const openMeteoGeocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  feature_code: z.string().optional(),
  country_code: z.string().optional(),
  admin1_id: z.number().optional(),
  timezone: z.string().optional(),
  population: z.number().optional(),
  country: z.string().optional(),
  admin1: z.string().optional(),
  admin2: z.string().optional(),
});

export const openMeteoGeocodingResponseSchema = z.object({
  results: z.array(openMeteoGeocodingResultSchema).optional(),
});

export type OpenMeteoCurrent = z.infer<typeof openMeteoCurrentSchema>;
export type OpenMeteoHourly = z.infer<typeof openMeteoHourlySchema>;
export type OpenMeteoDaily = z.infer<typeof openMeteoDailySchema>;
export type OpenMeteoForecastResponse = z.infer<typeof openMeteoForecastResponseSchema>;
export type OpenMeteoGeocodingResult = z.infer<typeof openMeteoGeocodingResultSchema>;
export type OpenMeteoGeocodingResponse = z.infer<typeof openMeteoGeocodingResponseSchema>;
