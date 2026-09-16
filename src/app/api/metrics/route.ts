/**
 * Evaluation Metrics API Route — WeatherGPT 2.0.
 *
 * Provides:
 * - GET: Evaluation summary or CSV / JSON export for the evaluation report deliverable.
 * - POST: Privacy-validated telemetry ingestion for query latency and task completion.
 */

import { NextRequest, NextResponse } from "next/server";
import { globalEvaluationMetricsService } from "@/services/evaluation/evaluation-metrics-service";
import { metricsIngestPayloadSchema } from "@/schemas/evaluation";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "summary";
    const type = searchParams.get("type") || "latency";

    if (format === "csv") {
      const csvContent =
        type === "accuracy"
          ? globalEvaluationMetricsService.exportAccuracyCsv()
          : globalEvaluationMetricsService.exportLatencyCsv();

      const filename = `weathergpt_evaluation_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    if (format === "json") {
      const fullDataset = globalEvaluationMetricsService.exportJson();
      return NextResponse.json(fullDataset, {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // Default: Return statistical evaluation summary
    const summary = globalEvaluationMetricsService.getSummary();
    return NextResponse.json(summary, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate evaluation report metrics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = metricsIngestPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid metrics payload",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { endpoint, latencyMs, statusCode, taskCompletion, persona, language, cacheHit } =
      parsed.data;

    const record = globalEvaluationMetricsService.logQueryLatency({
      endpoint,
      latencyMs,
      statusCode,
      taskCompletion,
      persona,
      language,
      cacheHit,
    });

    return NextResponse.json({ success: true, traceId: record.traceId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to record evaluation telemetry",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
