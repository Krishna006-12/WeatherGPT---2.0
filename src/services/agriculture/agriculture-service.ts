/**
 * Agriculture Service — WeatherGPT 2.0.
 *
 * Orchestrates agricultural decision intelligence by consuming the existing WeatherService
 * and running deterministic crop weather evaluation rules.
 *
 * Architecture boundary:
 *   UI / API Route / Copilot Tool → AgricultureService → WeatherService → WeatherSnapshot → Rules Engine
 */

import type { Coordinates, Result } from "@/types/common";
import type { CropType, AgricultureAssessment } from "@/types/agriculture";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { evaluateAgricultureRisk } from "./agriculture-rules";
import { AppError } from "@/lib/errors";

export interface AgricultureServiceConfig {
  weatherService?: WeatherService;
}

export class AgricultureService {
  private weatherService: WeatherService;

  constructor(config: AgricultureServiceConfig = {}) {
    this.weatherService =
      config.weatherService || new WeatherService(new OpenMeteoProvider());
  }

  /**
   * Assess agricultural weather risk and activity feasibility for a specific crop and location.
   */
  async assessCropRisk(
    coordinates: Coordinates,
    crop?: CropType,
    timezone?: string
  ): Promise<Result<AgricultureAssessment>> {
    // 1. Fetch verified weather snapshot from existing WeatherService
    const weatherResult = await this.weatherService.getWeather(coordinates, timezone);

    if (!weatherResult.success) {
      return {
        success: false,
        error:
          weatherResult.error instanceof AppError
            ? weatherResult.error
            : new AppError(
                "WEATHER_PROVIDER_UNAVAILABLE",
                weatherResult.error.message,
                502
              ),
      };
    }

    const weather = weatherResult.data;

    // 2. Evaluate deterministic crop risk
    try {
      const assessment = evaluateAgricultureRisk(crop, weather);
      return {
        success: true,
        data: assessment,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: new AppError(
          "UNKNOWN_ERROR",
          err instanceof Error ? err.message : "Failed to evaluate agricultural risk",
          500
        ),
      };
    }
  }
}

// Global singleton instance for app route and tools
export const globalAgricultureService = new AgricultureService();
