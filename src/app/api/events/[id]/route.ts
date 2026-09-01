import { NextResponse } from "next/server";
import { globalLiveIntelligenceService } from "@/services/news/live-intelligence-service";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  if (!id) {
    const error = new AppError("INVALID_REQUEST", "Event ID is required", 400);
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const result = await globalLiveIntelligenceService.getEventById(id);

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("UNKNOWN_ERROR", result.error.message, 500);
    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json(result.data);
}
