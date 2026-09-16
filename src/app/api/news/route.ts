import { NextResponse } from "next/server";
import { z } from "zod";
import { GdacsNewsProvider } from "@/services/news/gdacs-news-provider";
import { ContextNewsService } from "@/services/news/context-news-service";
import { toErrorResponse, AppError } from "@/lib/errors";

const newsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(20000).optional().default(500),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

// Singleton context news service instance with GDACS adapter
const gdacsProvider = new GdacsNewsProvider();
const contextNewsService = new ContextNewsService(gdacsProvider);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lonParam = url.searchParams.get("lon");
  const radiusParam = url.searchParams.get("radius");
  const catParam = url.searchParams.get("category");
  const limitParam = url.searchParams.get("limit");

  const validation = newsQuerySchema.safeParse({
    lat: latParam ?? undefined,
    lon: lonParam ?? undefined,
    radius: radiusParam ?? undefined,
    category: catParam ?? undefined,
    limit: limitParam ?? undefined,
  });

  if (!validation.success) {
    const error = new AppError(
      "INVALID_REQUEST",
      validation.error.issues[0]?.message || "Invalid query parameters",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const { lat, lon, radius, category, limit } = validation.data;

  // If one coordinate is provided without the other
  if ((lat !== undefined && lon === undefined) || (lat === undefined && lon !== undefined)) {
    const error = new AppError(
      "INVALID_LOCATION",
      "Both lat and lon must be provided together",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const coordinates =
    lat !== undefined && lon !== undefined ? { latitude: lat, longitude: lon } : undefined;

  const result = await contextNewsService.getContextEvents({
    coordinates,
    radiusKm: radius,
    category,
    limit,
  });

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("NEWS_PROVIDER_UNAVAILABLE", result.error.message, 502);

    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json({
    events: result.data,
    total: result.data.length,
    location: coordinates,
  });
}
