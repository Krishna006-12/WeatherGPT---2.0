import { NextResponse } from "next/server";
import { globalLiveIntelligenceService } from "@/services/news/live-intelligence-service";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function POST() {
  const result = await globalLiveIntelligenceService.syncFeeds();

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("WEATHER_PROVIDER_UNAVAILABLE", result.error.message, 502);
    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json({
    message: "Feeds synchronized and events clustered successfully",
    ...result.data,
  });
}

export async function GET() {
  return POST();
}
