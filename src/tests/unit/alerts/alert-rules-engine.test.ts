import { describe, it, expect } from "vitest";
import { AlertRulesEngine, ALERT_THRESHOLDS } from "@/services/alerts/alert-rules-engine";
import type { WeatherSnapshot, WeatherCondition } from "@/types/weather";

function createMockSnapshot(overrides: {
  temperature?: number;
  feelsLike?: number;
  precipitation?: number;
  dailyPrecipSum?: number;
  windSpeed?: number;
  windGust?: number;
  pressure?: number;
  condition?: WeatherCondition;
  description?: string;
  locationName?: string;
}): WeatherSnapshot {
  return {
    location: {
      name: overrides.locationName || "Patna",
      region: "Bihar",
      country: "India",
      coordinates: { latitude: 25.5941, longitude: 85.1376 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-06-15T12:00:00Z",
    current: {
      temperature: overrides.temperature ?? 30,
      feelsLike: overrides.feelsLike ?? (overrides.temperature ?? 30),
      humidity: 50,
      windSpeed: overrides.windSpeed ?? 10,
      windGust: overrides.windGust,
      windDirection: 180,
      pressure: overrides.pressure ?? 1012,
      cloudCover: 10,
      condition: overrides.condition || "clear",
      description: overrides.description,
      precipitation: overrides.precipitation ?? 0,
      uvIndex: 5,
      observedAt: "2026-06-15T12:00:00Z",
    },
    daily: [
      {
        date: "2026-06-15T00:00:00Z",
        temperatureHigh: overrides.temperature ?? 30,
        temperatureLow: 22,
        precipitationSum: overrides.dailyPrecipSum ?? overrides.precipitation ?? 0,
        precipitationProbability: 10,
        windSpeed: overrides.windSpeed ?? 10,
        condition: overrides.condition || "clear",
        sunrise: "2026-06-15T05:30:00Z",
        sunset: "2026-06-15T18:30:00Z",
      },
    ],
    hourly: [],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-06-15T12:00:00Z",
      },
    ],
  };
}

describe("Deterministic Alert Rules Engine", () => {
  const engine = new AlertRulesEngine();

  describe("Heat Wave Rules & Threshold Boundaries", () => {
    it("does NOT trigger heat alert below 38°C (e.g. 37.9°C)", () => {
      const weather = createMockSnapshot({ temperature: 37.9, feelsLike: 37.9 });
      const alerts = engine.evaluate(weather);
      const heatAlert = alerts.find((a) => a.category === "heat");
      expect(heatAlert).toBeUndefined();
    });

    it("triggers severe heat advisory exactly at 38.0°C", () => {
      const weather = createMockSnapshot({ temperature: 38.0, feelsLike: 38.0 });
      const alerts = engine.evaluate(weather);
      const heatAlert = alerts.find((a) => a.category === "heat");
      expect(heatAlert).toBeDefined();
      expect(heatAlert?.severity).toBe("severe");
      expect(heatAlert?.thresholdValue).toBe(ALERT_THRESHOLDS.HEAT.SEVERE_TEMP_C);
      expect(heatAlert?.observedValue).toBe(38.0);
    });

    it("triggers severe heat advisory at 41.9°C boundary", () => {
      const weather = createMockSnapshot({ temperature: 41.9, feelsLike: 41.9 });
      const alerts = engine.evaluate(weather);
      const heatAlert = alerts.find((a) => a.category === "heat");
      expect(heatAlert).toBeDefined();
      expect(heatAlert?.severity).toBe("severe");
    });

    it("triggers extreme heat warning at 42.0°C boundary", () => {
      const weather = createMockSnapshot({ temperature: 42.0, feelsLike: 42.0 });
      const alerts = engine.evaluate(weather);
      const heatAlert = alerts.find((a) => a.category === "heat");
      expect(heatAlert).toBeDefined();
      expect(heatAlert?.severity).toBe("extreme");
      expect(heatAlert?.thresholdValue).toBe(ALERT_THRESHOLDS.HEAT.EXTREME_TEMP_C);
    });

    it("triggers extreme heat warning when feelsLike reaches 45.0°C even if air temp is 39°C", () => {
      const weather = createMockSnapshot({ temperature: 39.0, feelsLike: 45.0 });
      const alerts = engine.evaluate(weather);
      const heatAlert = alerts.find((a) => a.category === "heat");
      expect(heatAlert).toBeDefined();
      expect(heatAlert?.severity).toBe("extreme");
    });
  });

  describe("Heavy Rainfall Rules & Threshold Boundaries", () => {
    it("does NOT trigger rainfall alert below 30.0 mm (e.g. 29.9 mm)", () => {
      const weather = createMockSnapshot({ dailyPrecipSum: 29.9, precipitation: 0 });
      const alerts = engine.evaluate(weather);
      const rainAlert = alerts.find((a) => a.category === "heavy_rain");
      expect(rainAlert).toBeUndefined();
    });

    it("triggers severe rainfall advisory at 30.0 mm daily accumulation", () => {
      const weather = createMockSnapshot({ dailyPrecipSum: 30.0 });
      const alerts = engine.evaluate(weather);
      const rainAlert = alerts.find((a) => a.category === "heavy_rain");
      expect(rainAlert).toBeDefined();
      expect(rainAlert?.severity).toBe("severe");
      expect(rainAlert?.thresholdValue).toBe(ALERT_THRESHOLDS.RAIN.SEVERE_DAILY_MM);
    });

    it("triggers severe rainfall advisory at 69.9 mm boundary", () => {
      const weather = createMockSnapshot({ dailyPrecipSum: 69.9 });
      const alerts = engine.evaluate(weather);
      const rainAlert = alerts.find((a) => a.category === "heavy_rain");
      expect(rainAlert).toBeDefined();
      expect(rainAlert?.severity).toBe("severe");
    });

    it("triggers extreme rainfall warning at 70.0 mm boundary", () => {
      const weather = createMockSnapshot({ dailyPrecipSum: 70.0 });
      const alerts = engine.evaluate(weather);
      const rainAlert = alerts.find((a) => a.category === "heavy_rain");
      expect(rainAlert).toBeDefined();
      expect(rainAlert?.severity).toBe("extreme");
      expect(rainAlert?.thresholdValue).toBe(ALERT_THRESHOLDS.RAIN.EXTREME_DAILY_MM);
    });

    it("triggers extreme rainfall warning on hourly rate >= 20 mm/h", () => {
      const weather = createMockSnapshot({ dailyPrecipSum: 15.0, precipitation: 20.0 });
      const alerts = engine.evaluate(weather);
      const rainAlert = alerts.find((a) => a.category === "heavy_rain");
      expect(rainAlert).toBeDefined();
      expect(rainAlert?.severity).toBe("extreme");
    });
  });

  describe("Damaging Wind Rules & Threshold Boundaries", () => {
    it("does NOT trigger wind alert below 55 km/h gusts (e.g. 54.9 km/h)", () => {
      const weather = createMockSnapshot({ windSpeed: 25, windGust: 54.9 });
      const alerts = engine.evaluate(weather);
      const windAlert = alerts.find((a) => a.category === "wind");
      expect(windAlert).toBeUndefined();
    });

    it("triggers severe wind advisory at 55.0 km/h gusts", () => {
      const weather = createMockSnapshot({ windSpeed: 30, windGust: 55.0 });
      const alerts = engine.evaluate(weather);
      const windAlert = alerts.find((a) => a.category === "wind");
      expect(windAlert).toBeDefined();
      expect(windAlert?.severity).toBe("severe");
    });

    it("triggers extreme wind warning at 80.0 km/h gusts", () => {
      const weather = createMockSnapshot({ windSpeed: 45, windGust: 80.0 });
      const alerts = engine.evaluate(weather);
      const windAlert = alerts.find((a) => a.category === "wind");
      expect(windAlert).toBeDefined();
      expect(windAlert?.severity).toBe("extreme");
    });
  });

  describe("Tropical Cyclone & Thunderstorm Rules", () => {
    it("triggers extreme cyclone alert when pressure <= 990 hPa and sustained wind >= 65 km/h", () => {
      const weather = createMockSnapshot({ pressure: 985, windSpeed: 70, windGust: 90 });
      const alerts = engine.evaluate(weather);
      const cycloneAlert = alerts.find((a) => a.category === "cyclone");
      expect(cycloneAlert).toBeDefined();
      expect(cycloneAlert?.severity).toBe("extreme");
      expect(cycloneAlert?.headline).toContain("Tropical Cyclone");
    });

    it("does not trigger cyclone alert if pressure is 995 hPa even with high wind", () => {
      const weather = createMockSnapshot({ pressure: 995, windSpeed: 70 });
      const alerts = engine.evaluate(weather);
      const cycloneAlert = alerts.find((a) => a.category === "cyclone");
      expect(cycloneAlert).toBeUndefined();
    });

    it("triggers severe thunderstorm warning on thunderstorm condition", () => {
      const weather = createMockSnapshot({ condition: "thunderstorm", windGust: 45 });
      const alerts = engine.evaluate(weather);
      const stormAlert = alerts.find((a) => a.category === "thunderstorm");
      expect(stormAlert).toBeDefined();
      expect(stormAlert?.severity).toBe("severe");
    });

    it("triggers extreme thunderstorm warning on hail condition", () => {
      const weather = createMockSnapshot({ condition: "hail" });
      const alerts = engine.evaluate(weather);
      const stormAlert = alerts.find((a) => a.category === "thunderstorm");
      expect(stormAlert).toBeDefined();
      expect(stormAlert?.severity).toBe("extreme");
      expect(stormAlert?.headline).toContain("Hail");
    });
  });

  describe("Zero False Positives on Moderate Clear Days", () => {
    it("returns 0 alerts for typical benign weather conditions", () => {
      const weather = createMockSnapshot({
        temperature: 24,
        feelsLike: 24,
        precipitation: 0,
        dailyPrecipSum: 2,
        windSpeed: 12,
        windGust: 18,
        pressure: 1014,
        condition: "clear",
      });
      const alerts = engine.evaluate(weather);
      expect(alerts).toHaveLength(0);
    });
  });
});
