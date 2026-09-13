/**
 * /api/voice Route
 *
 * Exposes Voice Assistant & Speech Intelligence endpoints.
 * Returns structured voice briefing scripts formatted for speech synthesis.
 */

import { NextResponse } from "next/server";
import { voiceApiRequestSchema } from "@/schemas/voice";
import { globalVoiceService } from "@/services/voice/voice-service";
import { WeatherService } from "@/services/weather/weather-service";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import { globalRiskEngine } from "@/services/risk/risk-engine";
import { globalActivityService } from "@/services/activity/activity-service";
import { toErrorResponse, AppError } from "@/lib/errors";

const weatherService = new WeatherService(new OpenMeteoProvider());

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = voiceApiRequestSchema.safeParse(body);

    if (!validation.success) {
      const error = new AppError(
        "INVALID_REQUEST",
        validation.error.issues[0]?.message || "Invalid voice request parameters",
        400
      );
      return NextResponse.json(
        { success: false, ...toErrorResponse(error) },
        { status: error.statusCode }
      );
    }

    const { latitude, longitude, timezone, language, textToSpeak } = validation.data;

    // Direct text cleanup and metrics computation
    if (textToSpeak) {
      const lang = language || globalVoiceService.detectLanguage(textToSpeak);
      const cleaned = globalVoiceService.cleanForSpeech(textToSpeak);
      const script = globalVoiceService.computeScriptMetrics(cleaned, lang);

      return NextResponse.json({
        success: true,
        data: {
          id: `voice_text_${Date.now()}`,
          location: {
            name: "Custom Voice Query",
            coordinates: { latitude, longitude },
          },
          headline: "Spoken Synthesis",
          spokenScript: script,
          highlights: [cleaned.slice(0, 80)],
          suggestedVoicePrompts: [
            "What's the weather tomorrow?",
            "Is it safe to go outside?",
          ],
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Full weather intelligence briefing
    const weatherResult = await weatherService.getWeather(
      { latitude, longitude },
      timezone
    );

    if (!weatherResult.success) {
      const err =
        weatherResult.error instanceof AppError
          ? weatherResult.error
          : new AppError(
              "WEATHER_PROVIDER_UNAVAILABLE",
              weatherResult.error instanceof Error
                ? weatherResult.error.message
                : "Failed to fetch weather for voice briefing",
              502
            );
      return NextResponse.json(
        { success: false, ...toErrorResponse(err) },
        { status: err.statusCode }
      );
    }

    const weather = weatherResult.data;

    // Optional risk report evaluation
    const riskReport = await globalRiskEngine.evaluate({ weather });

    // Optional activity suitability
    const actResult = await globalActivityService.assessActivitySuitability(
      { latitude, longitude },
      { timezone }
    );
    const activity = actResult.success ? actResult.data : undefined;

    const detectedLang = language || globalVoiceService.detectLanguage(weather.location.name);
    const report = globalVoiceService.generateVoiceBriefing({
      weather,
      riskReport,
      activity,
      language: detectedLang,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    const appErr =
      error instanceof AppError
        ? error
        : new AppError(
            "UNKNOWN_ERROR",
            error instanceof Error ? error.message : "Internal voice service error",
            500
          );
    return NextResponse.json(
      { success: false, ...toErrorResponse(appErr) },
      { status: appErr.statusCode }
    );
  }
}

export async function GET(request?: Request) {
  if (!request) {
    return NextResponse.json({
      success: true,
      data: {
        status: "ready",
        supportedLanguages: ["en-US", "hi-IN", "en-IN"],
        suggestedPrompts: [
          "What is the weather today?",
          "Will it rain tomorrow?",
          "Is it safe to go outside?",
          "Mausam kaisa hai?",
        ],
      },
    });
  }

  const url = new URL(request.url);
  const latStr = url.searchParams.get("latitude");
  const lonStr = url.searchParams.get("longitude");
  const timezone = url.searchParams.get("timezone") || undefined;
  const rawLang = url.searchParams.get("language");
  const language = rawLang === "en-US" || rawLang === "hi-IN" || rawLang === "en-IN" ? rawLang : undefined;

  if (!latStr && !lonStr) {
    return NextResponse.json({
      success: true,
      data: {
        status: "ready",
        supportedLanguages: ["en-US", "hi-IN", "en-IN"],
        suggestedPrompts: [
          "What is the weather today?",
          "Will it rain tomorrow?",
          "Is it safe to go outside?",
          "Mausam kaisa hai?",
        ],
      },
    });
  }

  const lat = latStr ? parseFloat(latStr) : NaN;
  const lon = lonStr ? parseFloat(lonStr) : NaN;

  return POST(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: lat,
        longitude: lon,
        timezone,
        language,
      }),
    })
  );
}
