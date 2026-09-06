/**
 * get_weather tool.
 *
 * Fetches verified live weather observations for target coordinates and timezone
 * via WeatherService (Open-Meteo).
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { WeatherSnapshot } from "@/types/weather";
import type { WeatherService } from "@/services/weather/weather-service";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const getWeatherInputSchema = z.object({
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  timezone: z.string().optional(),
});

export type GetWeatherInput = z.infer<typeof getWeatherInputSchema>;

export class GetWeatherTool implements WeatherIntelligenceTool<GetWeatherInput, WeatherSnapshot> {
  readonly name = "get_weather" as const;
  readonly description = "Retrieve verified current meteorological observations including temperature, humidity, wind, and conditions.";
  readonly schema = getWeatherInputSchema;

  private weatherService: WeatherService;

  constructor(weatherService: WeatherService) {
    this.weatherService = weatherService;
  }

  async execute(input: GetWeatherInput): Promise<Result<WeatherSnapshot>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_weather parameters: ${parsed.error.message}`),
      };
    }

    return this.weatherService.getWeather(parsed.data.coordinates, parsed.data.timezone);
  }
}
