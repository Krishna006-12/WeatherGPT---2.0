import { describe, it, expect } from "vitest";
import { DecisionSupportService } from "@/services/decision/decision-support-service";
import type { WeatherSnapshot } from "@/types/weather";
import type { Alert } from "@/types/alert";

function createMockSnapshot(overrides: Partial<WeatherSnapshot["current"]> = {}): WeatherSnapshot {
  const current = {
    temperature: 30,
    feelsLike: 32,
    humidity: 60,
    precipitation: 0,
    precipitationProbability: 10,
    windSpeed: 10,
    windDirection: 180,
    windGust: 12,
    pressure: 1012,
    cloudCover: 20,
    uvIndex: 4,
    condition: "partly-cloudy" as const,
    observedAt: "2026-09-17T06:00:00Z",
    ...overrides,
  };

  return {
    location: {
      name: "Kanpur",
      region: "Uttar Pradesh",
      country: "India",
      coordinates: { latitude: 26.4499, longitude: 80.3319 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-17T06:00:00Z",
    current,
    hourly: [],
    daily: [
      {
        date: "2026-09-17T00:00:00Z",
        temperatureHigh: current.temperature + 4,
        temperatureLow: current.temperature - 6,
        humidity: current.humidity,
        windSpeed: current.windSpeed,
        condition: current.condition,
        precipitationProbability: current.precipitationProbability ?? 10,
        precipitationSum: current.precipitation ?? 0,
        sunrise: "2026-09-17T00:30:00Z",
        sunset: "2026-09-17T12:30:00Z",
      },
    ],
    alerts: [],
    provenance: [
      {
        provider: "open-meteo",
        retrievedAt: "2026-09-17T06:00:00Z",
      },
    ],
  };
}

describe("Decision Support Service — Transparent, Evidence-Traced Guidance", () => {
  const service = new DecisionSupportService();

  describe("1. Disaster & Emergency Manager Persona", () => {
    it("generates emergency EOC activation and evacuation warnings during active cyclone and barometric drop", () => {
      const weather = createMockSnapshot({
        pressure: 988,
        windSpeed: 75,
        windGust: 90,
      });

      const cycloneAlert: Alert = {
        id: "cyc_alert_001",
        headline: "Severe Cyclonic Storm Warning",
        category: "cyclone",
        severity: "extreme",
        description: "Intense cyclonic depression with wind gusts exceeding 80 km/h.",
        source: "IMD Synoptic Alert",
        effectiveAt: "2026-09-17T06:00:00Z",
        expiresAt: "2026-09-17T18:00:00Z",
        thresholdMetric: "wind_speed",
        observedValue: 75,
        thresholdValue: 65,
      };

      const result = service.generateDecisionSupport(weather, {
        personaId: "disaster_manager",
        alerts: [cycloneAlert],
      });

      expect(result.personaId).toBe("disaster_manager");
      expect(result.overallStatus).toBe("emergency");

      // Verify EOC item
      const eocItem = result.items.find((i) => i.id === "dm_cyclone_eoc");
      expect(eocItem).toBeDefined();
      expect(eocItem?.priority).toBe("urgent");
      expect(eocItem?.traceability.sourceType).toBe("active_alert");
      expect(eocItem?.traceability.sourceReference).toContain("cyc_alert_001");

      // Verify Evac warning item
      const evacItem = result.items.find((i) => i.id === "dm_cyclone_evac");
      expect(evacItem).toBeDefined();
      expect(evacItem?.priority).toBe("urgent");
      expect(evacItem?.traceability.observedValue).toBe("extreme");
    });

    it("triggers drainage inspection and rescue staging when daily rainfall exceeds threshold", () => {
      const weather = createMockSnapshot({
        precipitation: 45,
      });
      // Set daily sum to 45mm
      weather.daily[0]!.precipitationSum = 45;

      const result = service.generateDecisionSupport(weather, {
        personaId: "disaster_manager",
      });

      expect(result.overallStatus).toBe("action_required");
      const drainageItem = result.items.find((i) => i.id === "dm_flood_drainage");
      expect(drainageItem).toBeDefined();
      expect(drainageItem?.priority).toBe("high");
      expect(drainageItem?.traceability.metricName).toBe("Daily Precipitation Sum");
      expect(drainageItem?.traceability.thresholdValue).toBe(">= 30.0 mm");
    });

    it("generates cooling shelter activation when extreme heat threshold is reached", () => {
      const weather = createMockSnapshot({
        temperature: 43,
        feelsLike: 46,
      });

      const result = service.generateDecisionSupport(weather, {
        personaId: "disaster_manager",
      });

      expect(result.overallStatus).toBe("emergency");
      const heatItem = result.items.find((i) => i.id === "dm_heat_shelter");
      expect(heatItem).toBeDefined();
      expect(heatItem?.priority).toBe("urgent");
      expect(heatItem?.traceability.thresholdValue).toBe(">= 40.0°C");
    });
  });

  describe("2. Farmer Persona", () => {
    it("advises halting foliar spraying when wind exceeds 15 km/h limit", () => {
      const weather = createMockSnapshot({
        windSpeed: 22,
        precipitation: 0,
      });

      const result = service.generateDecisionSupport(weather, {
        personaId: "farmer",
        crop: "wheat",
      });

      const sprayItem = result.items.find((i) => i.id === "farm_spray_suspend");
      expect(sprayItem).toBeDefined();
      expect(sprayItem?.title).toContain("[Wheat]");
      expect(sprayItem?.priority).toBe("urgent");
      expect(sprayItem?.traceability.metricName).toBe("Sustained Wind Speed");
      expect(sprayItem?.traceability.observedValue).toBe("22 km/h");
      expect(sprayItem?.traceability.thresholdValue).toContain("15.0 km/h");
    });

    it("advises suspending scheduled irrigation when heavy rainfall is forecast", () => {
      const weather = createMockSnapshot({
        precipitation: 25,
      });
      weather.daily[0]!.precipitationSum = 25;

      const result = service.generateDecisionSupport(weather, {
        personaId: "farmer",
        crop: "mustard",
      });

      const irrigItem = result.items.find((i) => i.id === "farm_irrig_halt");
      expect(irrigItem).toBeDefined();
      expect(irrigItem?.priority).toBe("high");
      expect(irrigItem?.traceability.thresholdValue).toBe(">= 20.0 mm");
    });

    it("advises evening frost defense when minimum temperature drops to 4°C or below", () => {
      const weather = createMockSnapshot({
        temperature: 6,
      });
      weather.daily[0]!.temperatureLow = 2; // Cold wave frost risk

      const result = service.generateDecisionSupport(weather, {
        personaId: "farmer",
        crop: "potato",
      });

      const frostItem = result.items.find((i) => i.id === "farm_frost_protect");
      expect(frostItem).toBeDefined();
      expect(frostItem?.priority).toBe("urgent");
      expect(frostItem?.traceability.thresholdValue).toContain("4.0°C");
    });
  });

  describe("3. General Public Persona", () => {
    it("advises carrying rain gear and extra commute time on elevated precipitation likelihood", () => {
      const weather = createMockSnapshot({
        precipitationProbability: 75,
        precipitation: 5,
      });
      weather.daily[0]!.precipitationProbability = 75;
      weather.daily[0]!.precipitationSum = 5;

      const result = service.generateDecisionSupport(weather, {
        personaId: "general_public",
      });

      const rainItem = result.items.find((i) => i.id === "pub_rain_umbrella");
      expect(rainItem).toBeDefined();
      expect(rainItem?.priority).toBe("urgent");
      expect(rainItem?.traceability.thresholdValue).toContain("40% probability");
    });

    it("advises SPF 30+ sun protection when UV Index is 6 or higher", () => {
      const weather = createMockSnapshot({
        uvIndex: 8.5,
      });

      const result = service.generateDecisionSupport(weather, {
        personaId: "general_public",
      });

      const uvItem = result.items.find((i) => i.id === "pub_uv_protect");
      expect(uvItem).toBeDefined();
      expect(uvItem?.priority).toBe("urgent");
      expect(uvItem?.traceability.thresholdValue).toContain("6.0 UV");
    });
  });

  describe("4. Transparent Traceability Invariant", () => {
    it("ensures every generated decision item has fully qualified, non-empty traceability properties", () => {
      const weather = createMockSnapshot({
        temperature: 42,
        feelsLike: 46,
        windSpeed: 25,
        uvIndex: 9,
      });

      const personas = ["general_public", "farmer", "disaster_manager"] as const;

      for (const p of personas) {
        const plan = service.generateDecisionSupport(weather, { personaId: p });
        expect(plan.items.length).toBeGreaterThan(0);

        for (const item of plan.items) {
          expect(item.id).toBeTruthy();
          expect(item.title).toBeTruthy();
          expect(item.actionText).toBeTruthy();
          expect(item.recommendedTimeframe).toBeTruthy();

          const trace = item.traceability;
          expect(trace).toBeDefined();
          expect(["active_alert", "forecast_threshold", "risk_model", "historical_comparison"]).toContain(
            trace.sourceType
          );
          expect(trace.metricName.length).toBeGreaterThan(0);
          expect(String(trace.observedValue).length).toBeGreaterThan(0);
          expect(String(trace.thresholdValue).length).toBeGreaterThan(0);
          expect(trace.sourceReference.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
