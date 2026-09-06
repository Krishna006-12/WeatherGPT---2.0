/**
 * get_forecast tool.
 *
 * Retrieves verified forecast data normalized for a specific temporal window
 * (today, tomorrow, next 24h, next 48h, 7-day) via WeatherService.
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { DailyWeather, HourlyWeather, WeatherAlert } from "@/types/weather";
import type { WeatherService } from "@/services/weather/weather-service";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const getForecastInputSchema = z.object({
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  timezone: z.string().optional(),
  temporalTarget: z.string().optional().default("7_day"),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetHourStart: z.number().min(0).max(23).optional(),
  targetHourEnd: z.number().min(0).max(23).optional(),
});

export type GetForecastInput = z.infer<typeof getForecastInputSchema>;

export interface NormalizedForecastData {
  locationName: string;
  timezone: string;
  temporalTarget: string;
  targetDate?: string;
  temperatureRange?: {
    high: number;
    low: number;
  };
  expectedCondition?: string;
  maxPrecipitationProbability: number;
  totalPrecipitationSum: number;
  daily: DailyWeather[];
  hourly: HourlyWeather[];
  alerts: WeatherAlert[];
}

export class GetForecastTool implements WeatherIntelligenceTool<GetForecastInput, NormalizedForecastData> {
  readonly name = "get_forecast" as const;
  readonly description = "Retrieve verified future meteorological forecasts and precipitation probabilities for specific time windows.";
  readonly schema = getForecastInputSchema;

  private weatherService: WeatherService;

  constructor(weatherService: WeatherService) {
    this.weatherService = weatherService;
  }

  async execute(input: GetForecastInput): Promise<Result<NormalizedForecastData>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_forecast parameters: ${parsed.error.message}`),
      };
    }

    const { coordinates, timezone, temporalTarget = "7_day", targetDate, targetHourStart, targetHourEnd } = parsed.data;

    const weatherRes = await this.weatherService.getWeather(coordinates, timezone);
    if (!weatherRes.success) {
      return weatherRes;
    }

    const snapshot = weatherRes.data;
    let filteredDaily = snapshot.daily || [];
    let filteredHourly = snapshot.hourly || [];

    // Filter by target date if specified
    if (targetDate) {
      const matchDaily = filteredDaily.filter((d) => d.date === targetDate);
      if (matchDaily.length > 0) {
        filteredDaily = matchDaily;
      }
      filteredHourly = filteredHourly.filter((h) => h.time.startsWith(targetDate));
    }

    // Filter hourly window if start/end hours are defined
    if (targetHourStart !== undefined || targetHourEnd !== undefined) {
      const start = targetHourStart !== undefined ? targetHourStart : 0;
      const end = targetHourEnd !== undefined ? targetHourEnd : 23;
      filteredHourly = filteredHourly.filter((h) => {
        const hour = new Date(h.time).getUTCHours();
        return hour >= start && hour <= end;
      });
    }

    // Compute aggregate metrics
    const targetDaily = filteredDaily[0];
    const high = targetDaily
      ? targetDaily.temperatureHigh
      : Math.max(...(filteredHourly.map((h) => h.temperature).concat([snapshot.current.temperature])));
    const low = targetDaily
      ? targetDaily.temperatureLow
      : Math.min(...(filteredHourly.map((h) => h.temperature).concat([snapshot.current.temperature])));

    const maxPrecipProb = targetDaily
      ? targetDaily.precipitationProbability
      : filteredHourly.length > 0
      ? Math.max(...filteredHourly.map((h) => h.precipitationProbability))
      : 0;

    const totalPrecipSum = targetDaily
      ? targetDaily.precipitationSum
      : filteredHourly.reduce((acc, h) => acc + (h.precipitation || 0), 0);

    const condition = targetDaily ? targetDaily.condition : filteredHourly[0]?.condition || snapshot.current.condition;

    return {
      success: true,
      data: {
        locationName: snapshot.location.name,
        timezone: snapshot.location.timezone,
        temporalTarget,
        targetDate: targetDate || targetDaily?.date,
        temperatureRange: { high, low },
        expectedCondition: condition,
        maxPrecipitationProbability: Math.round(maxPrecipProb),
        totalPrecipitationSum: Math.round(totalPrecipSum * 10) / 10,
        daily: filteredDaily,
        hourly: filteredHourly.slice(0, 24),
        alerts: snapshot.alerts || [],
      },
    };
  }
}
