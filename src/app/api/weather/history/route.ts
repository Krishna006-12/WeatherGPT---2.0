import { NextResponse } from "next/server";
import { z } from "zod";
import { globalHistoricalWeatherProvider } from "@/services/weather/historical-weather-provider";
import { toErrorResponse, AppError } from "@/lib/errors";

const historyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  timezone: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const timezone = url.searchParams.get("timezone");

  const validation = historyQuerySchema.safeParse({
    lat,
    lon,
    startDate,
    endDate,
    timezone: timezone ?? undefined,
  });

  if (!validation.success) {
    const error = new AppError(
      "INVALID_REQUEST",
      validation.error.issues[0]?.message || "Invalid query parameters for historical archive query",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const { lat: latitude, lon: longitude, startDate: sDate, endDate: eDate, timezone: tz } = validation.data;

  const result = await globalHistoricalWeatherProvider.fetchHistoricalArchive(
    { latitude, longitude },
    sDate,
    eDate,
    tz || "UTC"
  );

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("WEATHER_PROVIDER_UNAVAILABLE", result.error.message, 502);
    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json(result.data);
}
