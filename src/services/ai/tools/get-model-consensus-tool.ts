/**
 * get_model_consensus tool.
 *
 * Deterministic NWP multi-model consensus intelligence tool for WeatherGPT Copilot 2.0.
 * Ingests multi-model forecasts (ECMWF, GFS, ICON) and evaluates statistical
 * spread, agreement scores, and consensus confidence.
 */

import { z } from "zod";
import type { Coordinates, Result } from "@/types/common";
import type { ModelConsensusReport, NwpModelId } from "@/types/nwp";
import { NwpService, globalNwpService } from "@/services/nwp/nwp-service";
import type { WeatherIntelligenceTool } from "./tool-interface";
import { nwpModelIdSchema } from "@/schemas/nwp";

export const getModelConsensusInputSchema = z.object({
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().optional(),
  models: z.array(nwpModelIdSchema).optional(),
  locationName: z.string().optional(),
});

export type GetModelConsensusInput = z.input<typeof getModelConsensusInputSchema>;

export interface GetModelConsensusToolOptions {
  nwpService?: NwpService;
}

export class GetModelConsensusTool
  implements WeatherIntelligenceTool<GetModelConsensusInput, ModelConsensusReport>
{
  readonly name = "get_model_consensus" as const;
  readonly description =
    "Evaluate multi-model Numerical Weather Prediction (NWP) consensus across ECMWF, GFS, and ICON to assess forecast confidence and model divergence.";
  readonly schema = getModelConsensusInputSchema;

  private nwpService: NwpService;

  constructor(options?: GetModelConsensusToolOptions) {
    this.nwpService = options?.nwpService || globalNwpService;
  }

  async execute(input: GetModelConsensusInput): Promise<Result<ModelConsensusReport>> {
    const parsed = this.schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: new Error(`Invalid get_model_consensus parameters: ${parsed.error.message}`),
      };
    }

    const { coordinates, targetDate, timezone, models, locationName } = parsed.data;

    return this.nwpService.getConsensusReport(coordinates, {
      targetDate,
      timezone,
      models: models as NwpModelId[] | undefined,
      locationName,
    });
  }
}
