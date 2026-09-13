import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/risk/route";
import { WeatherService } from "@/services/weather/weather-service";
import { weatherRiskReportSchema } from "@/schemas/risk";
import { AppError } from "@/lib/errors";
import type { WeatherSnapshot } from "@/types/weather";

const mockSnapshot: WeatherSnapshot = {
  location: {
    name: "Kanpur",
    region: "Uttar Pradesh",
    country: "India",
    coordinates: { latitude: 26.4499, longitude: 80.3319 },
    timezone: "Asia/Kolkata",
  },
  observedAt: "2026-09-13T06:00:00Z",
  current: {
    temperature: 31,
    feelsLike: 33,
    humidity: 60,
    precipitation: 0,
    precipitationProbability: 15,
    windSpeed: 16,
    windDirection: 120,
    pressure: 1011,
    cloudCover: 30,
    condition: "partly-cloudy",
    observedAt: "2026-09-13T06:00:00Z",
  },
  hourly: [],
  daily: [
    {
      date: "2026-09-13",
      temperatureHigh: 34,
      temperatureLow: 22,
      condition: "partly-cloudy",
      precipitationProbability: 20,
      precipitationSum: 1.5,
      windSpeed: 18,
      sunrise: "2026-09-13T00:30:00Z",
      sunset: "2026-09-13T12:30:00Z",
    },
  ],
  alerts: [],
  provenance: [
    {
      provider: "Open-Meteo",
      retrievedAt: "2026-09-13T06:00:00Z",
      dataType: "current",
    },
  ],
};

describe("GET /api/risk Route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. returns 200 with valid WeatherRiskReport for valid location", async () => {
    vi.spyOn(WeatherService.prototype, "getWeather").mockResolvedValueOnce({
      success: true,
      data: mockSnapshot,
    });

    const req = new Request("http://localhost:3000/api/risk?lat=26.45&lon=80.33");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.location.name).toBe("Kanpur");
    expect(json.assessments).toHaveLength(6);
    expect(weatherRiskReportSchema.safeParse(json).success).toBe(true);
  });

  it("2. returns 400 when coordinates are out of valid range", async () => {
    const req = new Request("http://localhost:3000/api/risk?lat=95.0&lon=80.33");
    const response = await GET(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("INVALID_LOCATION");
  });

  it("3. returns 400 when coordinates are missing", async () => {
    const req = new Request("http://localhost:3000/api/risk");
    const response = await GET(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_LOCATION");
  });

  it("4. returns 502 when weather provider fails", async () => {
    vi.spyOn(WeatherService.prototype, "getWeather").mockResolvedValueOnce({
      success: false,
      error: new AppError("WEATHER_PROVIDER_UNAVAILABLE", "Open-Meteo API timed out", 502),
    });

    const req = new Request("http://localhost:3000/api/risk?lat=26.45&lon=80.33");
    const response = await GET(req);

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error.code).toBe("WEATHER_PROVIDER_UNAVAILABLE");
  });

  it("5. gracefully flags unavailable variable (e.g. UV omitted by provider)", async () => {
    const noUvSnapshot = JSON.parse(JSON.stringify(mockSnapshot)) as WeatherSnapshot;
    delete noUvSnapshot.current.uvIndex;

    vi.spyOn(WeatherService.prototype, "getWeather").mockResolvedValueOnce({
      success: true,
      data: noUvSnapshot,
    });

    const req = new Request("http://localhost:3000/api/risk?lat=26.45&lon=80.33");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    const uvAssessment = json.assessments.find((a: { type: string }) => a.type === "uv");

    expect(uvAssessment.status).toBe("unavailable");
    expect(uvAssessment.severity).toBe("unavailable");
    expect(uvAssessment.confidence).toBe("low");
  });

  it("6. response strictly validates against weatherRiskReportSchema", async () => {
    vi.spyOn(WeatherService.prototype, "getWeather").mockResolvedValueOnce({
      success: true,
      data: mockSnapshot,
    });

    const req = new Request("http://localhost:3000/api/risk?latitude=26.45&longitude=80.33");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    const parseResult = weatherRiskReportSchema.safeParse(json);
    expect(parseResult.success).toBe(true);
  });
});
