import { describe, it, expect } from "vitest";
import {
  getPersonaProfile,
  prioritizeAlertsForPersona,
  GENERAL_PUBLIC_PERSONA,
  FARMER_PERSONA,
} from "@/config/personas";
import type { Alert } from "@/types/alert";

function createMockAlert(category: Alert["category"], severity: Alert["severity"]): Alert {
  return {
    id: `alert_${category}_${severity}`,
    category,
    severity,
    headline: `${severity.toUpperCase()} ${category.toUpperCase()} alert`,
    description: `Test alert description for ${category}`,
    source: "RulesEngine",
    effectiveAt: "2026-06-15T12:00:00Z",
    expiresAt: "2026-06-16T12:00:00Z",
    thresholdMetric: "test_metric",
    observedValue: 100,
    thresholdValue: 50,
  };
}

describe("Role-Based Persona Profiles & Customization Engine", () => {
  describe("Profile Resolution", () => {
    it("resolves general_public persona by default and explicitly", () => {
      expect(getPersonaProfile("general_public")).toBe(GENERAL_PUBLIC_PERSONA);
      expect(getPersonaProfile(undefined)).toBe(GENERAL_PUBLIC_PERSONA);
      expect(getPersonaProfile(null)).toBe(GENERAL_PUBLIC_PERSONA);
    });

    it("resolves farmer persona correctly", () => {
      expect(getPersonaProfile("farmer")).toBe(FARMER_PERSONA);
      expect(FARMER_PERSONA.detailLevel).toBe("technical");
      expect(FARMER_PERSONA.prioritizedAlertCategories).toContain("heavy_rain");
      expect(FARMER_PERSONA.prioritizedAlertCategories).toContain("flood");
    });
  });

  describe("Persona Output Shaping for Identical Weather Data", () => {
    const identicalContext = {
      locationName: "Varanasi",
      temperature: 39,
      condition: "Hot and Sunny",
      rainfallMm: 35,
      windSpeedKmh: 25,
      crop: "Wheat",
    };

    it("farmer persona shapes advisory toward agronomy, spraying, and irrigation", () => {
      const advisory = FARMER_PERSONA.formatAdvisory(identicalContext);
      expect(advisory).toContain("Agronomic Advisory for Wheat");
      expect(advisory).toContain("Heavy precipitation risk");
      expect(advisory).toContain("drainage channels");
      expect(advisory).toContain("spraying");
    });

    it("general public persona shapes advisory toward commuting and everyday safety", () => {
      const advisory = GENERAL_PUBLIC_PERSONA.formatAdvisory(identicalContext);
      expect(advisory).toContain("Commute Advisory");
      expect(advisory).toContain("umbrella");
      expect(advisory).toContain("travel");
      expect(advisory).not.toContain("drainage channels");
    });
  });

  describe("Persona-Specific Alert Prioritization", () => {
    it("prioritizes heavy_rain over air_quality for farmer persona at same severity", () => {
      const rainAlert = createMockAlert("heavy_rain", "severe");
      const airAlert = createMockAlert("air_quality", "severe");

      const prioritized = prioritizeAlertsForPersona([airAlert, rainAlert], "farmer");
      expect(prioritized[0]?.category).toBe("heavy_rain");
      expect(prioritized[1]?.category).toBe("air_quality");
    });

    it("prioritizes air_quality over cold_wave for general_public persona at same severity", () => {
      const coldAlert = createMockAlert("cold_wave", "severe");
      const airAlert = createMockAlert("air_quality", "severe");

      const prioritized = prioritizeAlertsForPersona([coldAlert, airAlert], "general_public");
      expect(prioritized[0]?.category).toBe("air_quality");
      expect(prioritized[1]?.category).toBe("cold_wave");
    });

    it("always keeps extreme alert at the top regardless of persona", () => {
      const extremeCold = createMockAlert("cold_wave", "extreme");
      const severeRain = createMockAlert("heavy_rain", "severe");

      // For farmer, heavy_rain is normally higher priority than cold_wave, but extreme severity dominates
      const prioritized = prioritizeAlertsForPersona([severeRain, extremeCold], "farmer");
      expect(prioritized[0]?.category).toBe("cold_wave");
      expect(prioritized[0]?.severity).toBe("extreme");
    });
  });
});
