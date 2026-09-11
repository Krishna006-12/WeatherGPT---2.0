import { describe, it, expect } from "vitest";
import {
  agricultureQuerySchema,
  agricultureAssessmentSchema,
  cropTypeSchema,
} from "@/schemas/agriculture";

describe("Agriculture Zod Schemas", () => {
  describe("cropTypeSchema", () => {
    it("accepts all 5 supported crops", () => {
      expect(cropTypeSchema.safeParse("wheat").success).toBe(true);
      expect(cropTypeSchema.safeParse("rice").success).toBe(true);
      expect(cropTypeSchema.safeParse("maize").success).toBe(true);
      expect(cropTypeSchema.safeParse("potato").success).toBe(true);
      expect(cropTypeSchema.safeParse("mustard").success).toBe(true);
    });

    it("rejects unsupported crops", () => {
      expect(cropTypeSchema.safeParse("cotton").success).toBe(false);
      expect(cropTypeSchema.safeParse("soybean").success).toBe(false);
      expect(cropTypeSchema.safeParse("").success).toBe(false);
      expect(cropTypeSchema.safeParse(123).success).toBe(false);
    });
  });

  describe("agricultureQuerySchema", () => {
    it("accepts valid query parameters", () => {
      const res = agricultureQuerySchema.safeParse({
        lat: "26.4652",
        lon: "80.3498",
        crop: "wheat",
        timezone: "Asia/Kolkata",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.lat).toBe(26.4652);
        expect(res.data.lon).toBe(80.3498);
        expect(res.data.crop).toBe("wheat");
        expect(res.data.timezone).toBe("Asia/Kolkata");
      }
    });

    it("rejects missing crop", () => {
      const res = agricultureQuerySchema.safeParse({
        lat: "26.4652",
        lon: "80.3498",
      });
      expect(res.success).toBe(false);
    });

    it("rejects invalid crop name", () => {
      const res = agricultureQuerySchema.safeParse({
        lat: "26.4652",
        lon: "80.3498",
        crop: "sugarcane",
      });
      expect(res.success).toBe(false);
    });

    it("rejects out-of-bound latitude", () => {
      const resHigh = agricultureQuerySchema.safeParse({
        lat: "95.0",
        lon: "80.0",
        crop: "wheat",
      });
      expect(resHigh.success).toBe(false);

      const resLow = agricultureQuerySchema.safeParse({
        lat: "-95.0",
        lon: "80.0",
        crop: "wheat",
      });
      expect(resLow.success).toBe(false);
    });

    it("rejects out-of-bound longitude", () => {
      const res = agricultureQuerySchema.safeParse({
        lat: "20.0",
        lon: "185.0",
        crop: "rice",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("agricultureAssessmentSchema", () => {
    it("validates a complete AgricultureAssessment object", () => {
      const assessment = {
        id: "agr_test123",
        crop: "wheat",
        cropDisplayName: "Wheat",
        location: {
          name: "Kanpur, India",
          coordinates: { latitude: 26.46, longitude: 80.34 },
        },
        assessedAt: "2026-09-11T12:00:00.000Z",
        overallRiskLevel: "low",
        activities: {
          irrigation: {
            status: "favorable",
            advisory: "Irrigate normally.",
            reason: "Dry forecast.",
          },
          spraying: {
            status: "favorable",
            advisory: "Safe to spray.",
            reason: "Calm winds.",
          },
          fieldOperations: {
            status: "favorable",
            advisory: "Normal operations.",
            reason: "Dry soil.",
          },
        },
        hazards: [],
        forecastSummary: {
          next24hPrecipMm: 0,
          next48hPrecipMm: 0,
          sevenDayPrecipSumMm: 2.5,
          maxTemperatureC: 30,
          minTemperatureC: 18,
          maxWindSpeedKmh: 12,
          averageHumidityPct: 55,
        },
        evidence: [
          {
            parameter: "Temperature",
            observationOrForecast: "30°C",
            impactOnCrop: "Optimal",
          },
        ],
        disclaimer: "Weather-based advisory derived from atmospheric models.",
        provenance: [
          {
            provider: "open-meteo",
            retrievedAt: "2026-09-11T12:00:00.000Z",
            dataType: "forecast",
          },
        ],
      };

      const res = agricultureAssessmentSchema.safeParse(assessment);
      expect(res.success).toBe(true);
    });

    it("rejects malformed assessment with missing activities or negative precipitation", () => {
      const malformed = {
        id: "agr_invalid",
        crop: "potato",
        cropDisplayName: "Potato",
        location: { name: "Kanpur" },
        assessedAt: "2026-09-11T12:00:00.000Z",
        overallRiskLevel: "invalid_risk_level",
        activities: {}, // missing required activities
        hazards: [],
        forecastSummary: {
          next24hPrecipMm: -5, // invalid negative number
          next48hPrecipMm: 0,
          sevenDayPrecipSumMm: 0,
          maxTemperatureC: 25,
          minTemperatureC: 15,
          maxWindSpeedKmh: 10,
          averageHumidityPct: 150, // invalid > 100
        },
        evidence: [],
        disclaimer: "Disclaimer",
        provenance: [],
      };

      const res = agricultureAssessmentSchema.safeParse(malformed);
      expect(res.success).toBe(false);
    });
  });
});
