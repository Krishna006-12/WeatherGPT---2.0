/**
 * get_event_impact tool.
 *
 * Runs the deterministic ImpactEngine to assess relevance, impact level,
 * proximity, hydrological safety, and evidence for a target location.
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { WeatherEvent, EventLocation } from "@/types/events";
import type { WeatherSnapshot } from "@/types/weather";
import type { ImpactAssessment } from "@/types/impact";
import type { ImpactEngine } from "@/services/impact/impact-engine";
import type { WeatherIntelligenceTool } from "./tool-interface";

export const getEventImpactInputSchema = z.object({
  event: z.custom<WeatherEvent>((val) => typeof val === "object" && val !== null && "id" in val),
  targetLocation: z.custom<EventLocation>((val) => typeof val === "object" && val !== null && "name" in val),
  weather: z.custom<WeatherSnapshot>((val) => typeof val === "object" && val !== null).optional(),
});

export type GetEventImpactInput = z.infer<typeof getEventImpactInputSchema>;

export class GetEventImpactTool implements WeatherIntelligenceTool<GetEventImpactInput, ImpactAssessment> {
  readonly name = "get_event_impact" as const;
  readonly description = "Calculate deterministic relevance, cross-border hazard impact, and evidence-based confidence using ImpactEngine.";
  readonly schema = getEventImpactInputSchema;

  private impactEngine: ImpactEngine;

  constructor(impactEngine: ImpactEngine) {
    this.impactEngine = impactEngine;
  }

  async execute(input: GetEventImpactInput): Promise<Result<ImpactAssessment>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_event_impact parameters: ${parsed.error.message}`),
      };
    }

    try {
      const assessment = this.impactEngine.assessImpact(
        parsed.data.event,
        parsed.data.targetLocation,
        parsed.data.weather
      );
      return { success: true, data: assessment };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error("Failed to assess event impact"),
      };
    }
  }
}
