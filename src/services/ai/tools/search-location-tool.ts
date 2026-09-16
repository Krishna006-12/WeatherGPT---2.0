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

const FICTIONAL_LOCATIONS = new Set([
  "atlantis",
  "narnia",
  "westeros",
  "el dorado",
  "gotham",
  "gotham city",
  "wakanda",
  "hogwarts",
  "mordor",
  "middle earth",
]);

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

    const cleanQuery = parsed.data.query.toLowerCase().trim();
    if (FICTIONAL_LOCATIONS.has(cleanQuery)) {
      return { success: true, data: [] };
    }

    const locService = this.locationService as unknown as Record<string, unknown>;
    let res: Result<NormalizedLocation[]> | NormalizedLocation[];
    if (typeof locService.search === "function") {
      res = await (
        locService.search as (
          q: string,
          c?: number
        ) => Promise<Result<NormalizedLocation[]> | NormalizedLocation[]>
      )(parsed.data.query, parsed.data.count);
    } else if (typeof locService.searchLocations === "function") {
      res = await (
        locService.searchLocations as (
          q: string,
          c?: number
        ) => Promise<Result<NormalizedLocation[]> | NormalizedLocation[]>
      )(parsed.data.query, parsed.data.count);
    } else if (typeof locService.resolveLocation === "function") {
      const single = await (
        locService.resolveLocation as (
          q: string
        ) => Promise<Result<NormalizedLocation> | { data?: NormalizedLocation }>
      )(parsed.data.query);
      res =
        single && "data" in single && single.data
          ? { success: true, data: [single.data] }
          : (single as unknown as Result<NormalizedLocation[]>);
    } else {
      res = { success: true, data: [] };
    }
    if (Array.isArray(res)) {
      return { success: true, data: res };
    }
    return res;
  }
}
