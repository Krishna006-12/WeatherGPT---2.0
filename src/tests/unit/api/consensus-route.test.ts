import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/consensus/route";
import { globalNwpService } from "@/services/nwp/nwp-service";
import { modelConsensusReportSchema } from "@/schemas/nwp";
import { AppError } from "@/lib/errors";
import type { ModelConsensusReport } from "@/types/nwp";

const mockConsensusReport: ModelConsensusReport = {
  location: {
    name: "New Delhi",
    region: "Delhi",
    country: "India",
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    timezone: "Asia/Kolkata",
  },
  modelsUsed: ["ecmwf", "gfs", "icon"],
  modelDetails: [
    {
      modelId: "ecmwf",
      name: "ECMWF IFS",
      organization: "European Centre for Medium-Range Weather Forecasts",
      resolutionKm: 9,
    },
    {
      modelId: "gfs",
      name: "NOAA GFS",
      organization: "National Oceanic and Atmospheric Administration",
      resolutionKm: 13,
    },
    {
      modelId: "icon",
      name: "DWD ICON",
      organization: "Deutscher Wetterdienst",
      resolutionKm: 13,
    },
  ],
  consensusDays: [
    {
      date: "2026-09-13",
      temperatureHigh: {
        metric: "High Temperature",
        unit: "°C",
        mean: 34.8,
        median: 35.0,
        min: 34.2,
        max: 35.3,
        spread: 1.1,
        standardDeviation: 0.46,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 34.8, gfs: 35.3, icon: 34.2 },
      },
      temperatureLow: {
        metric: "Low Temperature",
        unit: "°C",
        mean: 24.5,
        median: 24.5,
        min: 24.0,
        max: 25.0,
        spread: 1.0,
        standardDeviation: 0.41,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 24.5, gfs: 25.0, icon: 24.0 },
      },
      precipitationSum: {
        metric: "Precipitation Sum",
        unit: "mm",
        mean: 0.2,
        median: 0.0,
        min: 0.0,
        max: 0.6,
        spread: 0.6,
        standardDeviation: 0.28,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 0.0, gfs: 0.6, icon: 0.0 },
      },
      windSpeedMax: {
        metric: "Wind Speed Max",
        unit: "km/h",
        mean: 18.0,
        median: 18.2,
        min: 16.5,
        max: 19.3,
        spread: 2.8,
        standardDeviation: 1.16,
        agreementLevel: "high",
        valuesByModel: { ecmwf: 18.2, gfs: 19.3, icon: 16.5 },
      },
      consensusCondition: "partly-cloudy",
      conditionAgreementPercent: 100,
      agreementScore: 94,
      confidence: "high",
      divergentModels: [],
      modelConditions: {
        ecmwf: "partly-cloudy",
        gfs: "partly-cloudy",
        icon: "partly-cloudy",
      },
    },
  ],
  overallAgreementScore: 94,
  overallConfidence: "high",
  summaryNotes: "High multi-model agreement across ECMWF, GFS, and ICON.",
  evaluatedAt: "2026-09-13T06:00:00.000Z",
  provenance: [
    {
      provider: "open-meteo-nwp",
      retrievedAt: "2026-09-13T06:00:00.000Z",
      dataType: "forecast",
    },
  ],
};

describe("GET /api/consensus Route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. returns 200 with valid ModelConsensusReport for valid coordinates", async () => {
    vi.spyOn(globalNwpService, "getConsensusReport").mockResolvedValueOnce({
      success: true,
      data: mockConsensusReport,
    });

    const request = new Request("http://localhost:3000/api/consensus?latitude=28.6139&longitude=77.2090&timezone=Asia/Kolkata");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.overallConfidence).toBe("high");
    expect(body.data.overallAgreementScore).toBe(94);
    expect(body.data.modelsUsed).toEqual(["ecmwf", "gfs", "icon"]);

    // Schema validation ensures structural integrity
    const parseResult = modelConsensusReportSchema.safeParse(body.data);
    expect(parseResult.success).toBe(true);
  });

  it("2. returns 400 when latitude is missing", async () => {
    const request = new Request("http://localhost:3000/api/consensus?longitude=77.2090");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it("3. returns 400 when coordinates are out of valid range", async () => {
    const request = new Request("http://localhost:3000/api/consensus?latitude=999&longitude=77.2090");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it("4. handles upstream service error and returns proper error status", async () => {
    vi.spyOn(globalNwpService, "getConsensusReport").mockResolvedValueOnce({
      success: false,
      error: new AppError(
        "NWP_UPSTREAM_ERROR",
        "Failed to fetch multi-model NWP forecasts from Open-Meteo",
        502
      ),
    });

    const request = new Request("http://localhost:3000/api/consensus?latitude=28.6139&longitude=77.2090");
    const response = await GET(request);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NWP_UPSTREAM_ERROR");
  });
});
