/**
 * Weather provider adapter interface.
 *
 * Each weather data source (e.g., OpenWeatherMap, WeatherAPI,
 * Tomorrow.io) implements this interface. The WeatherService
 * consumes providers through this boundary — the rest of the
 * application never sees provider-specific data shapes.
 *
 * Flow: Provider API → Adapter (implements WeatherProvider) → WeatherSnapshot
 */

import type { Coordinates, Result } from '@/types/common';
import type { CurrentWeather, WeatherSnapshot } from '@/types/weather';

/**
 * Configuration for a weather provider adapter.
 */
export interface WeatherProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Query options for fetching current weather conditions.
 */
export interface CurrentWeatherQuery {
  timezone?: string;
}

/**
 * Time range parameters for forecast queries.
 */
export interface ForecastTimeRange {
  startDate?: string;
  endDate?: string;
  days?: number;
}

/**
 * Query options for fetching weather forecast.
 */
export interface ForecastWeatherQuery extends ForecastTimeRange {
  timezone?: string;
  hourly?: boolean;
}

/**
 * The adapter contract that every weather provider must implement.
 * Returns raw data in the normalized WeatherSnapshot shape (or wrapped in a Result).
 * The WeatherService validates this output through Zod before
 * passing it to the rest of the application.
 */
export interface WeatherProvider {
  /** Unique identifier for this provider (e.g., 'open-meteo'). */
  readonly name: string;

  /**
   * Fetch a complete weather snapshot for the given coordinates.
   * The adapter is responsible for transforming the provider's
   * native response into the normalized WeatherSnapshot shape.
   */
  getWeather(
    coordinates: Coordinates,
    timezone?: string
  ): Promise<WeatherSnapshot | Result<WeatherSnapshot>>;

  /**
   * Fetch current weather conditions for the given coordinates.
   */
  getCurrentConditions?(
    coordinates: Coordinates,
    query?: CurrentWeatherQuery
  ): Promise<CurrentWeather | Result<CurrentWeather>>;

  /**
   * Fetch weather forecast for the given coordinates parameterized by time range.
   */
  getForecast?(
    coordinates: Coordinates,
    query?: ForecastWeatherQuery
  ): Promise<WeatherSnapshot | Result<WeatherSnapshot>>;
}
