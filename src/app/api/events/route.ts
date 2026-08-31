import { NextResponse } from "next/server";
import { z } from "zod";
import { globalLiveIntelligenceService } from "@/services/news/live-intelligence-service";
import { eventCategorySchema, severitySchema, eventStatusSchema } from "@/schemas/events";
import { toErrorResponse, AppError } from "@/lib/errors";

const eventFilterQuerySchema = z.object({
  category: eventCategorySchema.optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  severity: severitySchema.optional(),
  status: eventStatusSchema.optional(),
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
      "INVALID_LOCATION",
      validation.error.issues[0]?.message || "Invalid query parameters",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const filter = validation.data;
  const result = await globalLiveIntelligenceService.getEvents(filter);

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
  });
}
