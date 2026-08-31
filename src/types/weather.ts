/**
 * Normalized weather data contracts.
 * Derived from docs/ARCHITECTURE.md Section 4.
 *
 * All weather consumers (dashboard, forecast, AI, alerts, etc.)
 * use these types. Provider-specific shapes are never exposed
 * beyond the adapter boundary.
 */

import type { Coordinates, ISOTimestamp } from './common';

/**
 * Location metadata attached to every weather snapshot.
 */
export interface LocationInfo {
  name: string;
  region: string;
  country: string;
  coordinates: Coordinates;
  timezone: string;
}

/**
 * Tracks which provider produced a piece of data and when.
 */
export interface DataProvenance {
  provider: string;
  retrievedAt: ISOTimestamp;
  expiresAt?: ISOTimestamp;
  observedAt?: ISOTimestamp;
  modelRunAt?: ISOTimestamp;
  timezone?: string;
  dataType?: 'observation' | 'current' | 'forecast';
}

/** Weather condition code — extensible union. */
export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'overcast'
  | 'mist'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'thunderstorm'
  | 'snow'
  | 'sleet'
  | 'hail'
  | 'dust'
  | 'smoke'
  | 'tornado'
  | 'unknown';

/**
 * Current observed weather.
 */
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  precipitationProbability?: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  pressure: number;
  visibility?: number;
  uvIndex?: number;
  cloudCover: number;
  condition: WeatherCondition;
  description?: string;
  observedAt: ISOTimestamp;
}

/**
 * Single hour forecast entry.
 */
export interface HourlyWeather {
  time: ISOTimestamp;
  temperature: number;
  precipitation: number;
  feelsLike?: number;
  humidity?: number;
  windSpeed: number;
  condition: WeatherCondition;
  precipitationProbability: number;
  description?: string;
}

/**
 * Single day forecast entry.
 */
export interface DailyWeather {
  date: ISOTimestamp;
  temperatureHigh: number;
  temperatureLow: number;
  humidity?: number;
  windSpeed?: number;
  condition: WeatherCondition;
  precipitationProbability: number;
  precipitationSum: number;
  sunrise: ISOTimestamp;
  sunset: ISOTimestamp;
  description?: string;
}

/** Alert severity levels. */
export type AlertSeverity = 'minor' | 'moderate' | 'severe' | 'extreme';

/**
 * Weather alert/warning from an official source.
 */
export interface WeatherAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  description: string;
  source: string;
  effectiveAt: ISOTimestamp;
  expiresAt: ISOTimestamp;
}

/**
 * The normalized weather snapshot — the single contract
 * that the entire application consumes.
 */
export interface WeatherSnapshot {
  location: LocationInfo;
  observedAt: ISOTimestamp;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  alerts: WeatherAlert[];
  provenance: DataProvenance[];
}
