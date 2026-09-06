import { NextResponse } from "next/server";
import { globalLiveIntelligenceService } from "@/services/news/live-intelligence-service";
import { globalImpactEngine } from "@/services/impact/impact-engine";
import type { EventLocation } from "@/types/events";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  if (!id) {
    const error = new AppError("INVALID_REQUEST", "Event ID is required", 400);
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const result = await globalLiveIntelligenceService.getEventById(id);

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("UNKNOWN_ERROR", result.error.message, 500);
    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  const { event, articles } = result.data;

  // Optional user-location impact calculation if lat/lon parameters are provided
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lonParam = url.searchParams.get("lon");
  let userLocationImpact = undefined;

  if (latParam !== null && lonParam !== null) {
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    if (!isNaN(lat) && !isNaN(lon)) {
      const targetLoc: EventLocation = {
        name: url.searchParams.get("city") || url.searchParams.get("locationName") || "Target Location",
        city: url.searchParams.get("city") || undefined,
        region: url.searchParams.get("region") || undefined,
        country: url.searchParams.get("country") || "Global",
        coordinates: { latitude: lat, longitude: lon },
      };
      userLocationImpact = globalImpactEngine.assessImpact(event, targetLoc);
    }
  }

  return NextResponse.json({
    event,
    articles,
    severity: event.severity,
    freshness: event.freshness,
    status: event.status,
    confidence: event.confidence,
    indiaImpact: event.indiaImpact,
    timeline: event.timeline,
    sourceComparison: event.sourceComparison,
    userLocationImpact,
  });
}
