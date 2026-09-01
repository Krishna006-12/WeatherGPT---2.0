import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/schemas/ai";
import { globalAIOrchestrator } from "@/services/ai/ai-orchestrator";
import { toErrorResponse, AppError } from "@/lib/errors";

/**
 * POST /api/chat — Grounded AI Chat Assistant Endpoint.
 *
 * Request: { message: string, location?: { name?, city?, region?, country?, lat?, lon?, timezone? } }
 * Response: Validated AIResponse contract with grounding status and source citations.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);

    if (!json || typeof json !== "object") {
      const error = new AppError("INVALID_REQUEST", "Request body must be valid JSON", 400);
      return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
    }

    const validation = chatRequestSchema.safeParse(json);
    if (!validation.success) {
      const error = new AppError(
        "INVALID_REQUEST",
        validation.error.issues[0]?.message || "Invalid chat request parameters",
        400
      );
      return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
    }

    const query = validation.data;
    const result = await globalAIOrchestrator.processQuery(query);

    if (!result.success) {
      const err =
        result.error instanceof AppError
          ? result.error
          : new AppError("UNKNOWN_ERROR", result.error.message, 500);
      return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
    }

    return NextResponse.json(result.data);
  } catch (err: unknown) {
    const error = new AppError(
      "UNKNOWN_ERROR",
      err instanceof Error ? err.message : "Internal error processing chat request",
      500
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/chat",
    method: "POST",
    description: "Grounded AI Chat Assistant. Accepts { message, location? } and returns validated AIResponse.",
  });
}
