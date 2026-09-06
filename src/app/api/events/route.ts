import { NextResponse } from "next/server";
import { z } from "zod";
import { globalLiveIntelligenceService } from "@/services/news/live-intelligence-service";
import {
  eventCategorySchema,
  severitySchema,
  eventStatusSchema,
  freshnessLevelSchema,
} from "@/schemas/events";
import { toErrorResponse, AppError } from "@/lib/errors";
import type { EventFilter } from "@/services/storage/repository-interfaces";

const eventFilterQuerySchema = z.object({
  category: eventCategorySchema.optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  severity: severitySchema.optional(),
  status: eventStatusSchema.optional(),
  active: z.coerce.boolean().optional(),
  recent: z.coerce.boolean().optional(),
  freshness: freshnessLevelSchema.optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(20000).optional().default(500),
  since: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string | undefined> = {};

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  const validation = eventFilterQuerySchema.safeParse(params);
  if (!validation.success) {
    const error = new AppError(
      "INVALID_REQUEST",
      validation.error.issues[0]?.message || "Invalid query parameters",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const query = validation.data;
  const filter: EventFilter = {
    category: query.category,
    country: query.country,
    region: query.region,
    severity: query.severity,
    status: query.status,
    active: query.active,
    recent: query.recent,
    freshness: query.freshness,
    since: query.since,
    limit: query.limit,
    offset: query.offset,
    ...(query.lat !== undefined && query.lon !== undefined
      ? {
          coordinates: {
            latitude: query.lat,
            longitude: query.lon,
            radiusKm: query.radius,
          },
        }
      : {}),
  };

  let result = await globalLiveIntelligenceService.getEvents(filter);

  // If repository is empty (cold start on serverless), attempt bounded live sync
  if (result.success && result.data.length === 0) {
    const totalInRepo = await globalLiveIntelligenceService.getEvents({ limit: 1 });
    if (totalInRepo.success && totalInRepo.data.length === 0) {
      try {
        const syncResult = await Promise.race([
          globalLiveIntelligenceService.syncFeeds(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
        ]);

        if (syncResult && syncResult.success) {
          result = await globalLiveIntelligenceService.getEvents(filter);
        }
      } catch {
        // Fail gracefully without returning fabricated events
      }
    }
  }

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("UNKNOWN_ERROR", result.error.message, 500);
    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json({
    events: result.data,
    total: result.data.length,
    offset: filter.offset,
    limit: filter.limit,
    message: result.data.length === 0 ? "No verified live weather events are currently available." : undefined,
  });
}
