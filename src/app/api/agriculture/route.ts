import { NextResponse } from "next/server";
import { agricultureQuerySchema } from "@/schemas/agriculture";
import { globalAgricultureService } from "@/services/agriculture/agriculture-service";
import { toErrorResponse, AppError } from "@/lib/errors";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lonParam = url.searchParams.get("lon");
  const cropParam = url.searchParams.get("crop");
  const tzParam = url.searchParams.get("timezone");

  const validation = agricultureQuerySchema.safeParse({
    lat: latParam,
    lon: lonParam,
    crop: cropParam,
    timezone: tzParam ?? undefined,
  });

  if (!validation.success) {
    const error = new AppError(
      "INVALID_REQUEST",
      validation.error.issues[0]?.message || "Invalid agricultural query parameters",
      400
    );
    return NextResponse.json(toErrorResponse(error), { status: error.statusCode });
  }

  const { lat, lon, crop, timezone } = validation.data;

  const result = await globalAgricultureService.assessCropRisk(
    { latitude: lat, longitude: lon },
    crop,
    timezone
  );

  if (!result.success) {
    const err =
      result.error instanceof AppError
        ? result.error
        : new AppError("UNKNOWN_ERROR", result.error.message, 500);

    return NextResponse.json(toErrorResponse(err), { status: err.statusCode });
  }

  return NextResponse.json(result.data);
}
