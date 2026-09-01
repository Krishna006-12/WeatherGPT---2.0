import { NextResponse } from "next/server";
import { globalLiveIntelligenceService } from "@/services/news/live-intelligence-service";
import { toErrorResponse, AppError } from "@/lib/errors";

/**
 * POST /api/events/sync — Trigger feed synchronization.
 * Protected by LIVE_INTEL_SYNC_SECRET when configured.
 */
export async function POST(request?: Request) {
  // --- Sync secret protection ---
  const configuredSecret = process.env.LIVE_INTEL_SYNC_SECRET;

  if (configuredSecret) {
    const providedSecret = request?.headers?.get("x-sync-secret");

    if (!providedSecret) {
      const error = new AppError(
        "SYNC_UNAUTHORIZED",
        "Missing x-sync-secret header",
        401
      );
      return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
    }

    if (providedSecret !== configuredSecret) {
      const error = new AppError(
        "SYNC_FORBIDDEN",
        "Invalid sync secret",
        403
      );
      return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
    }
  }

  const result = await globalLiveIntelligenceService.syncFeeds();

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("FEED_SYNC_FAILED", result.error.message, 502);
    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json({
    message: "Feeds synchronized and events clustered successfully",
    ...result.data,
  });
}

/**
 * GET /api/events/sync — Non-mutating endpoint information.
 * Does NOT trigger synchronization.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/events/sync",
    method: "POST",
    description:
      "Triggers feed ingestion, validation, deduplication, and event clustering. " +
      "Requires x-sync-secret header when LIVE_INTEL_SYNC_SECRET is configured.",
  });
}
