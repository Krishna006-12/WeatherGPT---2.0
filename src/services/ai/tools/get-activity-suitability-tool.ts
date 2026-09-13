/**
 * get_activity_suitability tool.
 *
 * Deterministic activity suitability & decision intelligence tool for WeatherGPT Copilot 2.0.
 * Evaluates weather impacts for commute, highway road trips, outdoor construction,
 * school sports, running/cycling, and outdoor gatherings.
 */

import { z } from "zod";
import type { Coordinates, Result } from "@/types/common";
import type { ActivitySuitabilityReport, ActivityType } from "@/types/activity";
import { ActivityService, globalActivityService } from "@/services/activity/activity-service";
import type { WeatherIntelligenceTool } from "./tool-interface";
import { activityTypeSchema } from "@/schemas/activity";

export const getActivitySuitabilityInputSchema = z.object({
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  activity: activityTypeSchema.optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().optional(),
  locationName: z.string().optional(),
});

export type GetActivitySuitabilityInput = z.input<typeof getActivitySuitabilityInputSchema>;

export interface GetActivitySuitabilityToolOptions {
  activityService?: ActivityService;
}

export class GetActivitySuitabilityTool
  implements WeatherIntelligenceTool<GetActivitySuitabilityInput, ActivitySuitabilityReport>
{
  readonly name = "get_activity_suitability" as const;
  readonly description =
    "Evaluate deterministic weather suitability for activities including daily commute, highway road travel, outdoor work, school sports, running/cycling, and outdoor events.";
  readonly schema = getActivitySuitabilityInputSchema;

  private activityService: ActivityService;

  constructor(options?: GetActivitySuitabilityToolOptions) {
    this.activityService = options?.activityService || globalActivityService;
  }

  async execute(input: GetActivitySuitabilityInput): Promise<Result<ActivitySuitabilityReport>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_activity_suitability parameters: ${parsed.error.message}`),
      };
    }

    const { coordinates, activity, targetDate, timezone } = parsed.data;

    return this.activityService.assessActivitySuitability(coordinates, {
      activity: activity as ActivityType | undefined,
      targetDate,
      timezone,
    });
  }
}
