import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/agriculture/route";
import { globalAgricultureService } from "@/services/agriculture/agriculture-service";
import { AppError } from "@/lib/errors";

describe("GET /api/agriculture Route", () => {
  it("returns 400 when crop parameter is missing", async () => {
    const req = new Request("http://localhost:3000/api/agriculture?lat=26.46&lon=80.34");
    const response = await GET(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when crop parameter is invalid", async () => {
    const req = new Request("http://localhost:3000/api/agriculture?lat=26.46&lon=80.34&crop=invalid_crop");
    const response = await GET(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when latitude is out of range", async () => {
    const req = new Request("http://localhost:3000/api/agriculture?lat=95.0&lon=80.34&crop=wheat");
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when longitude is out of range", async () => {
    const req = new Request("http://localhost:3000/api/agriculture?lat=26.46&lon=200.0&crop=wheat");
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("returns 200 with complete AgricultureAssessment on valid request", async () => {
    vi.spyOn(globalAgricultureService, "assessCropRisk").mockResolvedValueOnce({
      success: true,
      data: {
        id: "agr_test123",
        crop: "wheat",
        cropDisplayName: "Wheat",
        location: { name: "Kanpur" },
        assessedAt: "2026-09-11T12:00:00.000Z",
        overallRiskLevel: "low",
        activities: {
          irrigation: { status: "favorable", advisory: "Proceed", reason: "Dry" },
          spraying: { status: "favorable", advisory: "Proceed", reason: "Calm" },
          fieldOperations: { status: "favorable", advisory: "Proceed", reason: "Dry" },
        },
        hazards: [],
        forecastSummary: {
          next24hPrecipMm: 0,
          next48hPrecipMm: 0,
          sevenDayPrecipSumMm: 0,
          maxTemperatureC: 30,
          minTemperatureC: 18,
          maxWindSpeedKmh: 10,
          averageHumidityPct: 50,
        },
        evidence: [],
        disclaimer: "Disclaimer",
        provenance: [],
      },
    });

    const req = new Request("http://localhost:3000/api/agriculture?lat=26.46&lon=80.34&crop=wheat&timezone=Asia/Kolkata");
    const response = await GET(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.crop).toBe("wheat");
    expect(json.overallRiskLevel).toBe("low");
  });

  it("returns 502 when service fails", async () => {
    vi.spyOn(globalAgricultureService, "assessCropRisk").mockResolvedValueOnce({
      success: false,
      error: new AppError("WEATHER_PROVIDER_UNAVAILABLE", "Upstream failure", 502),
    });

    const req = new Request("http://localhost:3000/api/agriculture?lat=26.46&lon=80.34&crop=potato");
    const response = await GET(req);
    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error.code).toBe("WEATHER_PROVIDER_UNAVAILABLE");
  });
});
