/**
 * search_location tool.
 *
 * Deterministically resolves location names to verified geographic entities
 * with coordinates using the LocationService (Open-Meteo Geocoding).
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { LocationService, NormalizedLocation } from "@/services/location/location-service";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const searchLocationInputSchema = z.object({
  query: z.string().min(1, "Search query cannot be empty"),
  count: z.number().int().min(1).max(10).optional().default(1),
});

export type SearchLocationInput = z.infer<typeof searchLocationInputSchema>;

export class SearchLocationTool implements WeatherIntelligenceTool<SearchLocationInput, NormalizedLocation[]> {
  readonly name = "search_location" as const;
  readonly description = "Search and geocode geographic locations to verify coordinates, timezone, and country.";
  readonly schema = searchLocationInputSchema;

  private locationService: LocationService;

  constructor(locationService: LocationService) {
    this.locationService = locationService;
  }

  async execute(input: SearchLocationInput): Promise<Result<NormalizedLocation[]>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid search_location parameters: ${parsed.error.message}`),
      };
    }

    return this.locationService.search(parsed.data.query, parsed.data.count);
  }
}
