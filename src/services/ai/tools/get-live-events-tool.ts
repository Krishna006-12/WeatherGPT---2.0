/**
 * get_live_events tool.
 *
 * Retrieves verified active disaster and severe weather events from the event repository.
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { WeatherEvent } from "@/types/events";
import type { EventRepository } from "@/services/storage/repository-interfaces";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const getLiveEventsInputSchema = z.object({
  keyword: z.string().optional(),
  locationName: z.string().optional(),
  status: z.enum(["active", "monitoring", "resolved", "expired"]).optional().default("active"),
  country: z.string().optional(),
  region: z.string().optional(),
  freshness: z.enum(["fresh", "recent", "aging", "stale", "expired"]).optional(),
  severity: z.enum(["info", "low", "moderate", "high", "severe", "extreme", "critical"]).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusKm: z.number().optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export type GetLiveEventsInput = z.input<typeof getLiveEventsInputSchema>;

export class GetLiveEventsTool implements WeatherIntelligenceTool<GetLiveEventsInput, WeatherEvent[]> {
  readonly name = "get_live_events" as const;
  readonly description = "Query verified active disaster and severe weather events (floods, cyclones, storms) from official sources.";
  readonly schema = getLiveEventsInputSchema;

  private eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(input: GetLiveEventsInput): Promise<Result<WeatherEvent[]>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_live_events parameters: ${parsed.error.message}`),
      };
    }

    try {
      const {
        keyword,
        locationName,
        status,
        country,
        region,
        freshness,
        severity,
        latitude,
        longitude,
        radiusKm,
        limit,
      } = parsed.data;

      const coordinates =
        latitude !== undefined && longitude !== undefined
          ? { latitude, longitude, radiusKm: radiusKm ?? 500 }
          : undefined;

      const allEvents = await this.eventRepository.findAll({
        status,
        country,
        region,
        freshness,
        severity,
        coordinates,
        limit: 50,
      });

      if (allEvents.length === 0) {
        return { success: true, data: [] };
      }

      if (!keyword && !locationName) {
        return { success: true, data: allEvents.slice(0, limit) };
      }

      const kwLower = keyword?.toLowerCase();
      const locLower = locationName?.toLowerCase();

      const matched = allEvents.filter((ev) => {
        const text = `${ev.title} ${ev.description} ${ev.location.name} ${ev.location.country} ${ev.affectedRegions.map((r) => r.name).join(" ")}`.toLowerCase();
        const matchesKw = kwLower ? text.includes(kwLower) || ev.category.toLowerCase().includes(kwLower) : false;
        const matchesLoc = locLower
          ? text.includes(locLower) ||
            ev.location.name.toLowerCase().includes(locLower) ||
            ev.location.country.toLowerCase().includes(locLower) ||
            ev.affectedRegions.some((r) => r.name.toLowerCase().includes(locLower) || r.country.toLowerCase().includes(locLower))
          : false;
        return matchesKw || matchesLoc;
      });

      return { success: true, data: matched.slice(0, limit) };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error("Failed to query event repository"),
      };
    }
  }
}
