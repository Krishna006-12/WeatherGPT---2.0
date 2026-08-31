/**
 * Open-Meteo weather provider adapter.
 *
 * Implements the WeatherProvider contract for Open-Meteo (open-meteo.com).
 * Fetches forecast data, validates raw response with Zod, and normalizes
 * into the application WeatherSnapshot contract.
 */

import type { Coordinates } from "@/types/common";
import type { WeatherSnapshot, HourlyWeather, DailyWeather } from "@/types/weather";
import type { WeatherProvider, WeatherProviderConfig } from "./weather-provider";
import { openMeteoForecastResponseSchema } from "@/schemas/open-meteo";
import { mapWmoCode } from "@/lib/wmo-codes";
import { AppError } from "@/lib/errors";

const DEFAULT_BASE_URL = "https://api.open-meteo.com";
const DEFAULT_TIMEOUT_MS = 10_000;

export class OpenMeteoProvider implements WeatherProvider {
  readonly name = "open-meteo";
  private baseUrl: string;
  private timeout: number;

  constructor(config: WeatherProviderConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.OPEN_METEO_BASE_URL || DEFAULT_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
  }

  async getWeather(
    coordinates: Coordinates,
    timezone?: string
  ): Promise<WeatherSnapshot> {
    const params = new URLSearchParams({
      latitude: coordinates.latitude.toString(),
      longitude: coordinates.longitude.toString(),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "surface_pressure",
        "cloud_cover",
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation",
        "precipitation_probability",
        "weather_code",
        "wind_speed_10m",
      ].join(","),
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "weather_code",
        "sunrise",
        "sunset",
      ].join(","),
      timezone: timezone || "auto",
      forecast_days: "7",
    });

    const url = `${this.baseUrl}/v1/forecast?${params.toString()}`;
    const retrievedAt = new Date().toISOString();

    let response: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AppError(
          "WEATHER_PROVIDER_UNAVAILABLE",
          `Open-Meteo request timed out after ${this.timeout}ms`,
          504
        );
      }
      throw new AppError(
        "WEATHER_PROVIDER_UNAVAILABLE",
        `Failed to reach Open-Meteo: ${err instanceof Error ? err.message : "Network error"}`,
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
        `Open-Meteo returned status ${response.status}: ${response.statusText}`,
        502
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new AppError(
        "WEATHER_RESPONSE_INVALID",
        "Open-Meteo returned invalid JSON",
        502
      );
    }

    const parseResult = openMeteoForecastResponseSchema.safeParse(json);
    if (!parseResult.success) {
      throw new AppError(
        "WEATHER_RESPONSE_INVALID",
        `Open-Meteo response validation failed: ${parseResult.error.message}`,
        502
      );
    }

    const data = parseResult.data;
    const currentWeatherInfo = mapWmoCode(data.current.weather_code);

    // Normalize hourly
    const hourly: HourlyWeather[] = [];
    const hourlyCount = Math.min(
      data.hourly.time.length,
      data.hourly.temperature_2m.length,
      data.hourly.weather_code.length
    );

    for (let i = 0; i < hourlyCount; i++) {
      const time = data.hourly.time[i];
      const temp = data.hourly.temperature_2m[i];
      const code = data.hourly.weather_code[i];
      const precip = data.hourly.precipitation[i] ?? 0;
      const precipProb = data.hourly.precipitation_probability[i] ?? 0;
      const windSpeed = data.hourly.wind_speed_10m[i] ?? 0;

      if (time !== undefined && temp !== undefined && code !== undefined) {
        const wmo = mapWmoCode(code);
        hourly.push({
          time,
          temperature: temp,
          precipitation: precip,
          windSpeed,
          condition: wmo.condition,
          precipitationProbability: precipProb,
          description: wmo.label,
        });
      }
    }

    // Normalize daily
    const daily: DailyWeather[] = [];
    const dailyCount = Math.min(
      data.daily.time.length,
      data.daily.temperature_2m_max.length,
      data.daily.temperature_2m_min.length,
      data.daily.weather_code.length
    );

    for (let i = 0; i < dailyCount; i++) {
      const date = data.daily.time[i];
      const high = data.daily.temperature_2m_max[i];
      const low = data.daily.temperature_2m_min[i];
      const code = data.daily.weather_code[i];
      const precipSum = data.daily.precipitation_sum[i] ?? 0;
      const precipProb = data.daily.precipitation_probability_max[i] ?? 0;
      const sunrise = data.daily.sunrise[i] ?? "";
      const sunset = data.daily.sunset[i] ?? "";

      if (date !== undefined && high !== undefined && low !== undefined && code !== undefined) {
        const wmo = mapWmoCode(code);
        daily.push({
          date,
          temperatureHigh: high,
          temperatureLow: low,
          condition: wmo.condition,
          precipitationProbability: precipProb,
          precipitationSum: precipSum,
          sunrise,
          sunset,
          description: wmo.label,
        });
      }
    }

    const snapshot: WeatherSnapshot = {
      location: {
        name: `${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}`,
        region: "",
        country: "",
        coordinates: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
        timezone: data.timezone,
      },
      observedAt: data.current.time,
      current: {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        windGust: data.current.wind_gusts_10m,
        pressure: data.current.surface_pressure ?? 1013,
        cloudCover: data.current.cloud_cover ?? 0,
        condition: currentWeatherInfo.condition,
        description: currentWeatherInfo.label,
        observedAt: data.current.time,
      },
      hourly,
      daily,
      alerts: [],
      provenance: [
        {
          provider: this.name,
          retrievedAt,
          observedAt: data.current.time,
          timezone: data.timezone,
          dataType: "current",
        },
      ],
    };

    return snapshot;
  }
}
