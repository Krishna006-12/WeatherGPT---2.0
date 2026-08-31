import { NextResponse } from "next/server";
import { z } from "zod";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { toErrorResponse, AppError } from "@/lib/errors";

const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
  lon: z.coerce.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
  timezone: z.string().optional(),
});

// Singleton weather service instance with OpenMeteo adapter
const openMeteoProvider = new OpenMeteoProvider();
const weatherService = new WeatherService(openMeteoProvider);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lonParam = url.searchParams.get("lon");
  const tzParam = url.searchParams.get("timezone");

  const validation = weatherQuerySchema.safeParse({
    lat: latParam,
    lon: lonParam,
    timezone: tzParam ?? undefined,
  });

  if (!validation.success) {
    const error = new AppError(
      "INVALID_LOCATION",
      validation.error.issues[0]?.message || "Invalid latitude or longitude",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const { lat, lon, timezone } = validation.data;
  const result = await weatherService.getWeather({ latitude: lat, longitude: lon }, timezone);

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("UNKNOWN_ERROR", result.error.message, 500);

    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json(result.data);
}
