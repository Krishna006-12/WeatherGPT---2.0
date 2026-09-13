/**
 * Open-Meteo Multi-Model NWP Provider.
 *
 * Implements NwpProvider by fetching multi-model weather forecasts
 * from Open-Meteo's multi-model forecast API endpoint.
 *
 * Models queried: ECMWF IFS, GFS, ICON (and optionally GEM, Météo-France).
 */

import type { Coordinates } from "@/types/common";
import type { NwpModelId, ModelForecast, ModelDailyForecast } from "@/types/nwp";
import {
  type NwpProvider,
  NWP_MODEL_CONFIGS,
  DEFAULT_NWP_MODELS,
} from "./nwp-provider";
import { mapWmoCode } from "@/lib/wmo-codes";
import { AppError } from "@/lib/errors";

const DEFAULT_BASE_URL = "https://api.open-meteo.com";
const DEFAULT_TIMEOUT_MS = 10_000;

export interface OpenMeteoNwpProviderConfig {
  baseUrl?: string;
  timeout?: number;
}

export class OpenMeteoNwpProvider implements NwpProvider {
  readonly name = "open-meteo-nwp";
  private baseUrl: string;
  private timeout: number;

  constructor(config: OpenMeteoNwpProviderConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.OPEN_METEO_BASE_URL || DEFAULT_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
  }

  async getMultiModelForecast(
    coordinates: Coordinates,
    models: NwpModelId[] = DEFAULT_NWP_MODELS,
    timezone?: string
  ): Promise<ModelForecast[]> {
    if (models.length === 0) {
      models = DEFAULT_NWP_MODELS;
    }

    const modelParams = models.map((m) => NWP_MODEL_CONFIGS[m].openMeteoParam);

    const params = new URLSearchParams({
      latitude: coordinates.latitude.toString(),
      longitude: coordinates.longitude.toString(),
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "weather_code",
      ].join(","),
      models: modelParams.join(","),
      timezone: timezone || "auto",
      forecast_days: "7",
    });

    const url = `${this.baseUrl}/v1/forecast?${params.toString()}`;

    let response: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `Open-Meteo multi-model request timed out after ${this.timeout}ms`,
          504
        );
      }
      throw new AppError(
        "WEATHER_PROVIDER_UNAVAILABLE",
        `Failed to reach Open-Meteo multi-model endpoint: ${err instanceof Error ? err.message : "Network error"}`,
        502
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new AppError(
          "RATE_LIMITED",
          "Open-Meteo rate limit exceeded. Please try again later.",
          429
        );
      }
      throw new AppError(
        "WEATHER_PROVIDER_UNAVAILABLE",
        `Open-Meteo multi-model returned status ${response.status}: ${response.statusText}`,
        502
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new AppError(
        "WEATHER_RESPONSE_INVALID",
        "Open-Meteo multi-model returned invalid JSON",
        502
      );
    }

    if (!json || typeof json !== "object" || !("daily" in json)) {
      throw new AppError(
        "WEATHER_RESPONSE_INVALID",
        "Open-Meteo multi-model response missing 'daily' section",
        502
      );
    }

    const rawData = json as {
      daily?: Record<string, unknown[]>;
    };

    const dailyData = rawData.daily || {};
    const times = (dailyData.time as string[]) || [];

    const forecasts: ModelForecast[] = [];

    for (const modelId of models) {
      const config = NWP_MODEL_CONFIGS[modelId];
      const param = config.openMeteoParam;

      // Extract model-specific array keys or fallback to standard key if single model
      const tempMaxKey = `temperature_2m_max_${param}`;
      const tempMinKey = `temperature_2m_min_${param}`;
      const precipSumKey = `precipitation_sum_${param}`;
      const precipProbKey = `precipitation_probability_max_${param}`;
      const windSpeedKey = `wind_speed_10m_max_${param}`;
      const weatherCodeKey = `weather_code_${param}`;

      const tempMaxArr = (dailyData[tempMaxKey] ?? dailyData.temperature_2m_max) as number[] | undefined;
      const tempMinArr = (dailyData[tempMinKey] ?? dailyData.temperature_2m_min) as number[] | undefined;
      const precipSumArr = (dailyData[precipSumKey] ?? dailyData.precipitation_sum) as number[] | undefined;
      const precipProbArr = (dailyData[precipProbKey] ?? dailyData.precipitation_probability_max) as number[] | undefined;
      const windSpeedArr = (dailyData[windSpeedKey] ?? dailyData.wind_speed_10m_max) as number[] | undefined;
      const weatherCodeArr = (dailyData[weatherCodeKey] ?? dailyData.weather_code) as number[] | undefined;

      // If this model has no data at all in response, continue
      if (!tempMaxArr || tempMaxArr.length === 0) {
        continue;
      }

      const dailyForecasts: ModelDailyForecast[] = [];
      const count = Math.min(times.length, tempMaxArr.length);

      for (let i = 0; i < count; i++) {
        const date = times[i];
        const high = tempMaxArr[i];
        const low = tempMinArr ? tempMinArr[i] : undefined;
        const precipSum = precipSumArr ? precipSumArr[i] ?? 0 : 0;
        const precipProb = precipProbArr ? precipProbArr[i] ?? 0 : 0;
        const wind = windSpeedArr ? windSpeedArr[i] ?? 0 : 0;
        const code = weatherCodeArr ? weatherCodeArr[i] ?? 0 : 0;

        if (date !== undefined && high !== undefined && low !== undefined) {
          const wmo = mapWmoCode(code);
          dailyForecasts.push({
            date,
            temperatureHigh: high,
            temperatureLow: low,
            precipitationSum: Math.max(0, precipSum),
            precipitationProbability: Math.min(100, Math.max(0, precipProb)),
            windSpeedMax: Math.max(0, wind),
            condition: wmo.condition,
            description: wmo.label,
          });
        }
      }

      forecasts.push({
        modelId,
        modelName: config.name,
        organization: config.organization,
        resolutionKm: config.resolutionKm,
        runTimestamp: new Date().toISOString(),
        daily: dailyForecasts,
      });
    }

    if (forecasts.length === 0) {
      throw new AppError(
        "WEATHER_RESPONSE_INVALID",
        "No model forecast data could be parsed from Open-Meteo multi-model response",
        502
      );
    }

    return forecasts;
  }
}

export const globalOpenMeteoNwpProvider = new OpenMeteoNwpProvider();
