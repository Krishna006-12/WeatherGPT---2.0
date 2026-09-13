/**
 * GET /api/activity
 *
 * Exposes deterministic activity suitability & decision intelligence.
 * Evaluates weather impacts for commute, road travel, outdoor construction,
 * school sports, running/cycling, and outdoor gatherings.
 */

import { NextResponse } from "next/server";
import { activityQuerySchema, activitySuitabilityReportSchema } from "@/schemas/activity";
import { globalActivityService } from "@/services/activity/activity-service";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string | undefined> = {};

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  const validation = activityQuerySchema.safeParse(params);
  if (!validation.success) {
    const error = new AppError(
      "INVALID_LOCATION",
      validation.error.issues[0]?.message || "Invalid latitude, longitude, or query parameters",
      400
    );
    return NextResponse.json(
      { success: false, ...toErrorResponse(error) },
      { status: error.statusCode }
    );
  }

  const { latitude, longitude, activity, date, timezone } = validation.data;

  const result = await globalActivityService.assessActivitySuitability(
    { latitude, longitude },
    {
      activity,
      targetDate: date,
      timezone,
    }
  );

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError(
            "WEATHER_PROVIDER_UNAVAILABLE",
            result.error instanceof Error
              ? result.error.message
              : "Failed to evaluate activity suitability",
            502
          );

    return NextResponse.json(
      { success: false, ...toErrorResponse(err) },
      { status: err.statusCode }
    );
  }

  const parsed = activitySuitabilityReportSchema.safeParse(result.data);
  if (!parsed.success) {
    const err = new AppError(
      "WEATHER_RESPONSE_INVALID",
      `Activity suitability report failed validation: ${parsed.error.message}`,
      502
    );
    return NextResponse.json(
      { success: false, ...toErrorResponse(err) },
      { status: err.statusCode }
    );
  }

  return NextResponse.json({ success: true, data: parsed.data });
}
