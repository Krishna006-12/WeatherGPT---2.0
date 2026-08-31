import { NextResponse } from "next/server";
import { z } from "zod";
import { LocationService } from "@/services/location/location-service";
import { toErrorResponse, AppError } from "@/lib/errors";

const querySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  count: z.coerce.number().min(1).max(10).optional().default(5),
});

// Singleton location service instance
const locationService = new LocationService();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qParam = url.searchParams.get("q");
  const countParam = url.searchParams.get("count");

  const validation = querySchema.safeParse({
    q: qParam,
    count: countParam ?? undefined,
  });

  if (!validation.success) {
    const error = new AppError(
      "INVALID_LOCATION",
      validation.error.issues[0]?.message || "Invalid query parameter",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const { q, count } = validation.data;
  const result = await locationService.search(q, count);

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("UNKNOWN_ERROR", result.error.message, 500);

    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json({
    results: result.data,
    total: result.data.length,
  });
}
