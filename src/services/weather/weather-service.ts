/**
 * Weather service — the single entry point for weather data.
 *
 * This service accepts a WeatherProvider adapter and validates
 * its output through Zod before returning typed data to consumers.
 *
 * Architecture boundary:
 *   UI → API route → WeatherService → WeatherProvider → External API
 *
 * The UI and API routes never call providers directly.
 */

import type { Coordinates } from '@/types/common';
import type { Result } from '@/types/common';
import type { WeatherSnapshot } from '@/types/weather';
import { weatherSnapshotSchema } from '@/schemas/weather';
import type { WeatherProvider } from './weather-provider';

export class WeatherService {
  private provider: WeatherProvider;

  constructor(provider: WeatherProvider) {
    this.provider = provider;
  }

  /**
   * Fetch and validate weather data for the given coordinates.
   * Provider output is validated through Zod — external data
   * is never trusted directly.
   */
  async getWeather(
    coordinates: Coordinates
  ): Promise<Result<WeatherSnapshot>> {
    try {
      const rawData = await this.provider.getWeather(coordinates);
      const parsed = weatherSnapshotSchema.safeParse(rawData);

      if (!parsed.success) {
        return {
          success: false,
          error: new Error(
            `Weather data validation failed: ${parsed.error.message}`
          ),
        };
      }

      return { success: true, data: parsed.data as WeatherSnapshot };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error('Unknown error fetching weather data'),
      };
    }
  }
}
