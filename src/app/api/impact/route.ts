import { NextResponse } from "next/server";
import { globalEventRepository } from "@/services/storage/in-memory-repositories";
import { globalImpactEngine } from "@/services/impact/impact-engine";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { impactQuerySchema } from "@/schemas/impact";
import { toErrorResponse, AppError } from "@/lib/errors";
import type { EventLocation } from "@/types/events";
import type { WeatherSnapshot } from "@/types/weather";

const openMeteoProvider = new OpenMeteoProvider();
const weatherService = new WeatherService(openMeteoProvider);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string | undefined> = {};

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  const validation = impactQuerySchema.safeParse(params);
  if (!validation.success) {
    const error = new AppError(
      "INVALID_LOCATION",
      validation.error.issues[0]?.message || "Invalid impact query parameters",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const query = validation.data;

  // Retrieve event from repository
  const event = await globalEventRepository.findById(query.eventId);
  if (!event) {
    const error = new AppError(
      "EVENT_NOT_FOUND",
      `Event with ID "${query.eventId}" was not found`,
      404
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  // Construct target location
  const targetLocation: EventLocation = {
    name: query.city || query.region || query.country || "Target Location",
    country: query.country || "Unknown",
    region: query.region,
    city: query.city,
    timezone: query.timezone,
    coordinates:
      query.lat !== undefined && query.lon !== undefined
        ? { latitude: query.lat, longitude: query.lon }
        : undefined,
  };

  // Optionally correlate with weather snapshot if coordinates are provided
  let weather: WeatherSnapshot | undefined;
  if (query.lat !== undefined && query.lon !== undefined) {
    try {
      // Timezone resolution chain:
      // 1. Use caller-provided timezone if available
      // 2. Otherwise pass undefined → WeatherService defaults to "auto"
      //    which lets Open-Meteo detect timezone from coordinates
      const tz = query.timezone || undefined;
      const weatherResult = await weatherService.getWeather(
        { latitude: query.lat, longitude: query.lon },
        tz
      );
      if (weatherResult.success) {
        weather = weatherResult.data;
      }
    } catch {
      // Weather fetch failure is non-fatal for impact evaluation
    }
  }

  try {
    const assessment = globalImpactEngine.assessImpact(event, targetLocation, weather);
    return NextResponse.json(assessment);
  } catch (err) {
    const error = new AppError(
      "UNKNOWN_ERROR",
      err instanceof Error ? err.message : "Failed to compute impact assessment",
      500
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }
}
