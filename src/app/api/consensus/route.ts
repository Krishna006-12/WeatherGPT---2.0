/**
 * GET /api/consensus
 *
 * Exposes multi-model NWP intelligence and deterministic model consensus.
 * Queries global NWP models (ECMWF, GFS, ICON) and evaluates statistical
 * spread, agreement scores, and consensus confidence.
 */

import { NextResponse } from "next/server";
import { consensusQuerySchema, modelConsensusReportSchema } from "@/schemas/nwp";
import { globalNwpService } from "@/services/nwp/nwp-service";
import { toErrorResponse, AppError } from "@/lib/errors";
import type { NwpModelId } from "@/types/nwp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string | undefined> = {};

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  const validation = consensusQuerySchema.safeParse(params);
  if (!validation.success) {
    const error = new AppError(
      "INVALID_LOCATION",
      validation.error.issues[0]?.message || "Invalid latitude or longitude coordinates",
      400
    );
    return NextResponse.json(
      { success: false, ...toErrorResponse(error) },
      { status: error.statusCode }
    );
  }

  const { latitude, longitude, timezone, targetDate, models } = validation.data;

  // Parse optional models list
  let modelIds: NwpModelId[] | undefined;
  if (models) {
    modelIds = models
      .split(",")
      .map((m) => m.trim().toLowerCase())
      .filter((m): m is NwpModelId => ["ecmwf", "gfs", "icon", "gem", "meteofrance"].includes(m));
  }

  const consensusResult = await globalNwpService.getConsensusReport(
    { latitude, longitude },
    {
      targetDate,
      timezone,
      models: modelIds,
    }
  );

  if (!consensusResult.success) {
    const err =
      consensusResult.error instanceof AppError
        ? consensusResult.error
        : new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            consensusResult.error instanceof Error
              ? consensusResult.error.message
              : "Failed to fetch model consensus",
            502
          );

    return NextResponse.json(
      { success: false, ...toErrorResponse(err) },
      { status: err.statusCode }
    );
  }

  const parsed = modelConsensusReportSchema.safeParse(consensusResult.data);
  if (!parsed.success) {
    const err = new AppError(
      "WEATHER_RESPONSE_INVALID",
      `Consensus report failed validation: ${parsed.error.message}`,
      502
    );
    return NextResponse.json(
      { success: false, ...toErrorResponse(err) },
      { status: err.statusCode }
    );
  }

  return NextResponse.json({ success: true, data: parsed.data });
}
