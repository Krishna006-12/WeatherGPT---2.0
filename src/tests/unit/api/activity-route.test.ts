import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/activity/route";
import { globalActivityService } from "@/services/activity/activity-service";
import { activitySuitabilityReportSchema } from "@/schemas/activity";
import { AppError } from "@/lib/errors";
import type { ActivitySuitabilityReport } from "@/types/activity";

const mockActivityReport: ActivitySuitabilityReport = {
  location: {
    name: "New Delhi",
    region: "Delhi",
    country: "India",
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    timezone: "Asia/Kolkata",
  },
  generatedAt: "2026-09-13T10:00:00Z",
  targetDate: "2026-09-13",
  requestedActivity: "running_cycling",
  activities: {
    running_cycling: {
      activity: "running_cycling",
      activityName: "Running, Jogging & Cycling",
      targetDate: "2026-09-13",
      overallScore: 88,
      overallSafetyLevel: "optimal",
      bestWindow: {
        startHour: "06:00",
        endHour: "09:00",
        averageScore: 94,
        safetyLevel: "optimal",
        summary: "Peak favorability between 06:00 and 09:00 (Score: 94/100).",
      },
      worstWindow: {
        startHour: "13:00",
        endHour: "16:00",
        averageScore: 72,
        safetyLevel: "acceptable",
        summary: "Most challenging window between 13:00 and 16:00 (Score: 72/100).",
      },
      limitingFactors: [],
      recommendation: "Optimal day for Running, Jogging & Cycling. Conditions are calm and clear.",
      evidenceSummary: "Evaluated 24 hourly periods. Overall score 88/100 (optimal).",
      hourlyWindows: [
        {
          time: "2026-09-13T06:00:00Z",
          hour: 6,
          score: 95,
          safetyLevel: "optimal",
          limitingFactors: [],
          metrics: {
            temperature: 22,
            feelsLike: 22,
            precipitation: 0,
            precipitationProbability: 0,
            windSpeed: 8,
            condition: "clear",
          },
          advisory: "Favorable conditions. Ideal weather window for outdoor activity.",
        },
      ],
    },
    commute: {
      activity: "commute",
      activityName: "Daily Commute & Local Travel",
      targetDate: "2026-09-13",
      overallScore: 90,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal day for Commute.",
      evidenceSummary: "Clear roads.",
      hourlyWindows: [],
    },
    travel_road: {
      activity: "travel_road",
      activityName: "Highway & Road Travel",
      targetDate: "2026-09-13",
      overallScore: 90,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal day for Highway Travel.",
      evidenceSummary: "Clear visibility.",
      hourlyWindows: [],
    },
    outdoor_work: {
      activity: "outdoor_work",
      activityName: "Outdoor Construction & Field Work",
      targetDate: "2026-09-13",
      overallScore: 85,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal day for Outdoor Work.",
      evidenceSummary: "Safe conditions.",
      hourlyWindows: [],
    },
    school_sports: {
      activity: "school_sports",
      activityName: "School Outdoor Sports & Play",
      targetDate: "2026-09-13",
      overallScore: 90,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal day for School Sports.",
      evidenceSummary: "Safe playground.",
      hourlyWindows: [],
    },
    outdoor_events: {
      activity: "outdoor_events",
      activityName: "Outdoor Gatherings & Events",
      targetDate: "2026-09-13",
      overallScore: 88,
      overallSafetyLevel: "optimal",
      bestWindow: null,
      worstWindow: null,
      limitingFactors: [],
      recommendation: "Optimal day for Outdoor Events.",
      evidenceSummary: "No rain threat.",
      hourlyWindows: [],
    },
  },
  provenance: {
    provider: "open-meteo",
    retrievedAt: "2026-09-13T10:00:00Z",
    dataType: "forecast",
  },
};

describe("GET /api/activity Route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. returns 200 with valid ActivitySuitabilityReport for valid coordinates", async () => {
    vi.spyOn(globalActivityService, "assessActivitySuitability").mockResolvedValue({
      success: true,
      data: mockActivityReport,
    });

    const req = new Request(
      "http://localhost:3000/api/activity?latitude=28.6139&longitude=77.2090&activity=running_cycling"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.location.name).toBe("New Delhi");
    expect(body.data.activities.running_cycling.overallScore).toBe(88);

    const validated = activitySuitabilityReportSchema.safeParse(body.data);
    expect(validated.success).toBe(true);
  });

  it("2. returns 400 when latitude is missing", async () => {
    const req = new Request("http://localhost:3000/api/activity?longitude=77.2090");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it("3. returns 400 when coordinates are out of valid range", async () => {
    const req = new Request("http://localhost:3000/api/activity?latitude=120&longitude=77.2090");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it("4. handles upstream service error and returns proper error status", async () => {
    vi.spyOn(globalActivityService, "assessActivitySuitability").mockResolvedValue({
      success: false,
      error: new AppError("WEATHER_PROVIDER_UNAVAILABLE", "Open-Meteo unreachable", 502),
    });

    const req = new Request(
      "http://localhost:3000/api/activity?latitude=28.6139&longitude=77.2090"
    );
    const res = await GET(req);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("WEATHER_PROVIDER_UNAVAILABLE");
  });
});
