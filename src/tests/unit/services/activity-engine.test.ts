import { describe, it, expect } from "vitest";
import {
  evaluateHourlySuitability,
  evaluateDailySuitability,
} from "@/services/activity/activity-rules";
import { evaluateActivitySuitability } from "@/services/activity/activity-engine";
import { activitySuitabilityReportSchema } from "@/schemas/activity";
import type { HourlyWeather, WeatherSnapshot } from "@/types/weather";

function createMockHour(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    time: "2026-09-13T10:00:00Z",
    temperature: 24,
    feelsLike: 24,
    precipitation: 0,
    precipitationProbability: 10,
    windSpeed: 12,
    condition: "clear",
    description: "Clear sky",
    ...overrides,
  };
}

function createMockSnapshot(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  const hours: HourlyWeather[] = Array.from({ length: 24 }, (_, i) =>
    createMockHour({
      time: `2026-09-13T${String(i).padStart(2, "0")}:00:00Z`,
      temperature: 20 + Math.sin(i / 4) * 8,
      feelsLike: 20 + Math.sin(i / 4) * 8,
    })
  );

  return {
    location: {
      name: "New Delhi",
      region: "Delhi",
      country: "India",
      timezone: "Asia/Kolkata",
      coordinates: { latitude: 28.6139, longitude: 77.209 },
    },
    observedAt: "2026-09-13T10:00:00Z",
    current: {
      temperature: 26,
      feelsLike: 27,
      humidity: 55,
      precipitation: 0,
      windSpeed: 12,
      windDirection: 180,
      pressure: 1012,
      cloudCover: 10,
      condition: "clear",
      observedAt: "2026-09-13T10:00:00Z",
    },
    hourly: hours,
    daily: [
      {
        date: "2026-09-13T00:00:00Z",
        temperatureHigh: 30,
        temperatureLow: 18,
        condition: "clear",
        precipitationProbability: 10,
        precipitationSum: 0,
        sunrise: "2026-09-13T06:05:00Z",
        sunset: "2026-09-13T18:25:00Z",
      },
    ],
    alerts: [],
    provenance: [
      {
        provider: "open-meteo",
        retrievedAt: "2026-09-13T10:00:00Z",
        dataType: "forecast",
      },
    ],
    ...overrides,
  };
}

describe("ActivitySuitabilityEngine & Rules", () => {
  describe("evaluateHourlySuitability", () => {
    it("1. evaluates clear calm weather as optimal (score >= 85)", () => {
      const hour = createMockHour({
        temperature: 22,
        feelsLike: 22,
        precipitation: 0,
        precipitationProbability: 5,
        windSpeed: 10,
        condition: "clear",
      });

      const res = evaluateHourlySuitability(hour, "running_cycling");
      expect(res.score).toBeGreaterThanOrEqual(85);
      expect(res.safetyLevel).toBe("optimal");
      expect(res.limitingFactors.length).toBe(0);
    });

    it("2. strictly marks thunderstorm conditions as unsafe with hard penalty", () => {
      const hour = createMockHour({
        condition: "thunderstorm",
        precipitation: 5.0,
      });

      const res = evaluateHourlySuitability(hour, "outdoor_work");
      expect(res.safetyLevel).toBe("unsafe");
      expect(res.score).toBeLessThanOrEqual(35);
      expect(res.limitingFactors.some((f) => f.code === "thunderstorm_lightning")).toBe(true);
      expect(res.advisory.toLowerCase()).toContain("unsafe");
    });

    it("3. penalizes torrential rainfall (> 10mm) and forces unsafe level", () => {
      const hour = createMockHour({
        precipitation: 15.0,
        condition: "heavy-rain",
      });

      const commuteRes = evaluateHourlySuitability(hour, "commute");
      expect(commuteRes.safetyLevel).toBe("unsafe");
      expect(commuteRes.limitingFactors.some((f) => f.code === "torrential_rainfall")).toBe(true);
      expect(commuteRes.limitingFactors[0]?.impact).toContain("hydroplaning");
    });

    it("4. detects dangerous heat index (>= 42°C feelsLike) for school sports and outdoor work", () => {
      const hour = createMockHour({
        temperature: 38,
        feelsLike: 43.5,
        condition: "clear",
      });

      const sportsRes = evaluateHourlySuitability(hour, "school_sports");
      expect(sportsRes.safetyLevel).toBe("unsafe");
      expect(sportsRes.limitingFactors.some((f) => f.code === "extreme_heat_danger")).toBe(true);
      expect(sportsRes.limitingFactors[0]?.impact).toContain("exhaustion");

      const workRes = evaluateHourlySuitability(hour, "outdoor_work");
      expect(workRes.safetyLevel).toBe("unsafe");
    });

    it("5. identifies visibility hazards in fog for road travel and commute", () => {
      const hour = createMockHour({
        condition: "fog",
      });

      const travelRes = evaluateHourlySuitability(hour, "travel_road");
      expect(travelRes.limitingFactors.some((f) => f.code === "impaired_visibility")).toBe(true);
      expect(travelRes.score).toBeLessThan(70);
    });

    it("6. identifies gale force winds (>= 55 km/h) as unsafe for outdoor work and travel", () => {
      const hour = createMockHour({
        windSpeed: 60,
      });

      const workRes = evaluateHourlySuitability(hour, "outdoor_work");
      expect(workRes.safetyLevel).toBe("unsafe");
      expect(workRes.limitingFactors.some((f) => f.code === "gale_force_winds")).toBe(true);
    });
  });

  describe("evaluateDailySuitability", () => {
    it("7. aggregates 24 hours and identifies optimal sliding 3-hour window", () => {
      const hours: HourlyWeather[] = Array.from({ length: 24 }, (_, i) => {
        // Morning (6-9) is clear and mild (optimal)
        // Afternoon (13-16) is hot and rainy
        const isMorning = i >= 6 && i <= 8;
        const isAfternoon = i >= 13 && i <= 15;
        return createMockHour({
          time: `2026-09-13T${String(i).padStart(2, "0")}:00:00Z`,
          temperature: isMorning ? 22 : isAfternoon ? 39 : 28,
          feelsLike: isMorning ? 22 : isAfternoon ? 42 : 28,
          precipitation: isAfternoon ? 6.0 : 0,
          condition: isAfternoon ? "rain" : "clear",
        });
      });

      const dailyEvaluations = hours.map((h) => evaluateHourlySuitability(h, "running_cycling"));
      const dailyReport = evaluateDailySuitability(dailyEvaluations, "running_cycling", "2026-09-13");

      expect(dailyReport.bestWindow).toBeDefined();
      expect(dailyReport.bestWindow?.startHour).toBe("06:00");
      expect(dailyReport.bestWindow?.endHour).toBe("09:00");
      expect(dailyReport.worstWindow).toBeDefined();
      expect(dailyReport.worstWindow?.startHour).toBe("13:00");
      expect(dailyReport.worstWindow?.endHour).toBe("16:00");
      expect(dailyReport.recommendation).toContain("Running, Jogging & Cycling");
    });
  });

  describe("evaluateActivitySuitability", () => {
    it("8. evaluates all 6 activities and produces valid ActivitySuitabilityReport conforming to schema", () => {
      const snapshot = createMockSnapshot();
      const report = evaluateActivitySuitability(snapshot, {
        activity: "commute",
        targetDate: "2026-09-13",
      });

      expect(report.location.name).toBe("New Delhi");
      expect(report.targetDate).toBe("2026-09-13");
      expect(report.requestedActivity).toBe("commute");

      // Verify all 6 activities evaluated
      expect(report.activities.commute).toBeDefined();
      expect(report.activities.travel_road).toBeDefined();
      expect(report.activities.outdoor_work).toBeDefined();
      expect(report.activities.school_sports).toBeDefined();
      expect(report.activities.running_cycling).toBeDefined();
      expect(report.activities.outdoor_events).toBeDefined();

      // Zod schema validation
      const parseResult = activitySuitabilityReportSchema.safeParse(report);
      expect(parseResult.success).toBe(true);
    });
  });
});
