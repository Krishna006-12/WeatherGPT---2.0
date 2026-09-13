/**
 * GET /api/risk
 *
 * Exposes deterministic weather risk assessments for a given geographic location.
 * Fetches verified meteorological snapshot through WeatherService and evaluates
 * risk via RiskEngine.
 */

import { NextResponse } from "next/server";
import { riskQuerySchema } from "@/schemas/risk";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { globalRiskEngine } from "@/services/risk/risk-engine";
import { toErrorResponse, AppError } from "@/lib/errors";

const openMeteoProvider = new OpenMeteoProvider();
const weatherService = new WeatherService(openMeteoProvider);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string | undefined> = {};

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  const validation = riskQuerySchema.safeParse(params);
  if (!validation.success) {
    const error = new AppError(
      "INVALID_LOCATION",
      validation.error.issues[0]?.message || "Invalid latitude or longitude coordinates",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const { latitude, longitude, timezone, targetDate } = validation.data;

  // 1. Fetch verified weather data via authoritative WeatherService boundary
  const weatherResult = await weatherService.getWeather(
    { latitude, longitude },
    timezone
  );

  if (!weatherResult.success) {
    const err =
      weatherResult.error instanceof AppError
        ? weatherResult.error
        : new AppError("WEATHER_PROVIDER_UNAVAILABLE", weatherResult.error.message, 502);

    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  try {
    // 2. Evaluate deterministic risk report
    const report = await globalRiskEngine.evaluate({
      weather: weatherResult.data,
      targetDate,
    });

    return NextResponse.json(report);
  } catch (evalError) {
    const err = new AppError(
      "RISK_EVALUATION_FAILED",
      evalError instanceof Error ? evalError.message : "Failed to evaluate weather risk",
      500
    );
    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }
}
