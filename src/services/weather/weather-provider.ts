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

import type { Coordinates } from '@/types/common';
import type { WeatherSnapshot } from '@/types/weather';

/**
 * Configuration for a weather provider adapter.
 */
export interface WeatherProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * The adapter contract that every weather provider must implement.
 * Returns raw data in the normalized WeatherSnapshot shape.
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
  ): Promise<WeatherSnapshot>;
}
