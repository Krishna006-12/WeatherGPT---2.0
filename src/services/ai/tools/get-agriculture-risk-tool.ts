/**
 * get_agriculture_risk tool.
 *
 * Deterministic evidence-based agricultural weather risk assessment tool for Copilot.
 * Reuses the existing AgricultureService; does not duplicate agronomic calculations.
 */

import { z } from "zod";
import type { Result } from "@/types/common";
import type { AgricultureAssessment } from "@/types/agriculture";
import { cropTypeSchema } from "@/schemas/agriculture";
import { coordinatesSchema } from "@/schemas/weather";
import type { WeatherIntelligenceTool } from "./tool-interface";
import { AgricultureService, globalAgricultureService } from "@/services/agriculture/agriculture-service";

export const getAgricultureRiskInputSchema = z.object({
  coordinates: coordinatesSchema,
  crop: cropTypeSchema,
  timezone: z.string().optional(),
});

export type GetAgricultureRiskInput = z.input<typeof getAgricultureRiskInputSchema>;

export class GetAgricultureRiskTool
  implements WeatherIntelligenceTool<GetAgricultureRiskInput, AgricultureAssessment>
{
  readonly name = "get_agriculture_risk" as const;
  readonly description =
    "Evaluate deterministic weather risks, hazard thresholds, and activity suitability (irrigation, spraying, harvesting) for specific crops.";
  readonly schema = getAgricultureRiskInputSchema;

  private agricultureService: AgricultureService;

  constructor(agricultureService?: AgricultureService) {
    this.agricultureService = agricultureService || globalAgricultureService;
  }

  async execute(input: GetAgricultureRiskInput): Promise<Result<AgricultureAssessment>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_agriculture_risk parameters: ${parsed.error.message}`),
      };
    }

    const { coordinates, crop, timezone } = parsed.data;
    return this.agricultureService.assessCropRisk(coordinates, crop, timezone);
  }
}
