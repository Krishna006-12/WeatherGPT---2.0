import { describe, it, expect } from "vitest";
import {
  evaluateAgricultureRisk,
  evaluateIrrigationActivity,
  evaluateSprayingActivity,
  evaluateFieldOperationsActivity,
  aggregateRiskLevel,
} from "@/services/agriculture/agriculture-rules";
import type { WeatherSnapshot } from "@/types/weather";

function createMockWeather(overrides: Partial<WeatherSnapshot["current"]> = {}, dailyOverrides: Partial<WeatherSnapshot["daily"][0]>[] = []): WeatherSnapshot {
  const current = {
    temperature: 25,
    feelsLike: 25,
    humidity: 50,
    precipitation: 0,
    windSpeed: 10,
    windDirection: 180,
    pressure: 1013,
    cloudCover: 20,
    condition: "clear" as const,
    observedAt: "2026-09-11T12:00:00.000Z",
    ...overrides,
  };

  const defaultDaily = [
    {
      date: "2026-09-11",
      temperatureHigh: current.temperature,
      temperatureLow: current.temperature - 10,
      condition: current.condition,
      precipitationProbability: 10,
      precipitationSum: current.precipitation * 24,
      sunrise: "2026-09-11T06:00:00.000Z",
      sunset: "2026-09-11T18:00:00.000Z",
    },
    {
      date: "2026-09-12",
      temperatureHigh: current.temperature,
      temperatureLow: current.temperature - 10,
      condition: current.condition,
      precipitationProbability: 10,
      precipitationSum: 0,
      sunrise: "2026-09-12T06:00:00.000Z",
      sunset: "2026-09-12T18:00:00.000Z",
    },
  ];

  const daily = dailyOverrides.length > 0
    ? dailyOverrides.map((d, i) => ({ ...defaultDaily[i % defaultDaily.length]!, ...d }))
    : defaultDaily;

  return {
    location: {
      name: "Kanpur, India",
      region: "Uttar Pradesh",
      country: "India",
      coordinates: { latitude: 26.46, longitude: 80.34 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-11T12:00:00.000Z",
    current,
    hourly: [
      {
        time: "2026-09-11T12:00:00.000Z",
        temperature: current.temperature,
        precipitation: current.precipitation,
        windSpeed: current.windSpeed,
        condition: current.condition,
        precipitationProbability: 10,
      },
    ],
    daily,
    alerts: [],
    provenance: [
      {
        provider: "open-meteo",
        retrievedAt: "2026-09-11T12:00:00.000Z",
        dataType: "current",
      },
    ],
  };
}

describe("Agriculture Rules Engine", () => {
  describe("Wheat Thresholds", () => {
    it("evaluates heat stress at exact boundaries (32.0 vs 32.1°C)", () => {
      // 32.0°C is heat stress threshold
      const weatherAt32 = createMockWeather({}, [{ temperatureHigh: 32.0 }]);
      const resAt32 = evaluateAgricultureRisk("wheat", weatherAt32);
      expect(resAt32.hazards.some((h) => h.type === "heat_stress")).toBe(true);

      // 31.9°C should not trigger heat stress
      const weatherBelow = createMockWeather({}, [{ temperatureHigh: 31.9 }]);
      const resBelow = evaluateAgricultureRisk("wheat", weatherBelow);
      expect(resBelow.hazards.some((h) => h.type === "heat_stress")).toBe(false);

      // 32.1°C triggers heat stress
      const weatherAbove = createMockWeather({}, [{ temperatureHigh: 32.1 }]);
      const resAbove = evaluateAgricultureRisk("wheat", weatherAbove);
      expect(resAbove.hazards.some((h) => h.type === "heat_stress")).toBe(true);
    });

    it("evaluates frost threshold at exact boundaries (2.0 vs 2.1°C)", () => {
      // 2.0°C triggers critical frost damage
      const frostWeather = createMockWeather({}, [{ temperatureLow: 2.0 }]);
      const resFrost = evaluateAgricultureRisk("wheat", frostWeather);
      expect(resFrost.hazards.some((h) => h.type === "frost_damage")).toBe(true);
      expect(resFrost.overallRiskLevel).toBe("critical");

      // 2.1°C does not trigger frost (it triggers moderate cold stress because <= 4.0°C)
      const coldWeather = createMockWeather({}, [{ temperatureLow: 2.1 }]);
      const resCold = evaluateAgricultureRisk("wheat", coldWeather);
      expect(resCold.hazards.some((h) => h.type === "frost_damage")).toBe(false);
      expect(resCold.hazards.some((h) => h.type === "cold_stress")).toBe(true);
      expect(resCold.overallRiskLevel).toBe("moderate");
    });

    it("evaluates high-wind lodging condition at 35.0 km/h", () => {
      const windWeather = createMockWeather({ windSpeed: 35.0 });
      const res = evaluateAgricultureRisk("wheat", windWeather);
      expect(res.hazards.some((h) => h.type === "wind_lodging_risk")).toBe(true);
    });
  });

  describe("Rice Thresholds", () => {
    it("evaluates heat stress at boundary (35.0 vs 34.9°C)", () => {
      const weather35 = createMockWeather({}, [{ temperatureHigh: 35.0 }]);
      const res35 = evaluateAgricultureRisk("rice", weather35);
      expect(res35.hazards.some((h) => h.type === "heat_stress")).toBe(true);

      const weather34_9 = createMockWeather({}, [{ temperatureHigh: 34.9 }]);
      const res34_9 = evaluateAgricultureRisk("rice", weather34_9);
      expect(res34_9.hazards.some((h) => h.type === "heat_stress")).toBe(false);
    });

    it("evaluates cold chilling stress at boundary (18.0 vs 18.1°C)", () => {
      const weather18 = createMockWeather({}, [{ temperatureLow: 18.0 }]);
      const res18 = evaluateAgricultureRisk("rice", weather18);
      expect(res18.hazards.some((h) => h.type === "cold_stress")).toBe(true);

      const weather18_1 = createMockWeather({}, [{ temperatureLow: 18.1 }]);
      const res18_1 = evaluateAgricultureRisk("rice", weather18_1);
      expect(res18_1.hazards.some((h) => h.type === "cold_stress")).toBe(false);
    });

    it("evaluates prolonged humid and rainy condition", () => {
      const humidRainyWeather = createMockWeather({ humidity: 88 }, [
        { precipitationSum: 16.0 },
        { precipitationSum: 10.0 },
      ]);
      const res = evaluateAgricultureRisk("rice", humidRainyWeather);
      expect(res.hazards.some((h) => h.type === "disease_favorable_weather")).toBe(true);
    });
  });

  describe("Maize Thresholds", () => {
    it("evaluates heavy rainfall waterlogging risk at 40 mm", () => {
      const heavyRainWeather = createMockWeather({}, [{ precipitationSum: 40.0 }]);
      const res = evaluateAgricultureRisk("maize", heavyRainWeather);
      expect(res.hazards.some((h) => h.type === "heavy_rainfall")).toBe(true);
      expect(res.overallRiskLevel).toBe("high");
    });

    it("evaluates heat stress at 34.0°C", () => {
      const heatWeather = createMockWeather({}, [{ temperatureHigh: 34.0 }]);
      const res = evaluateAgricultureRisk("maize", heatWeather);
      expect(res.hazards.some((h) => h.type === "heat_stress")).toBe(true);
    });

    it("evaluates high wind lodging risk at 35.0 km/h", () => {
      const windWeather = createMockWeather({ windSpeed: 35.0 });
      const res = evaluateAgricultureRisk("maize", windWeather);
      expect(res.hazards.some((h) => h.type === "wind_lodging_risk")).toBe(true);
    });
  });

  describe("Potato Thresholds", () => {
    it("evaluates frost condition at <= 2.0°C", () => {
      const frostWeather = createMockWeather({}, [{ temperatureLow: 1.9 }]);
      const res = evaluateAgricultureRisk("potato", frostWeather);
      expect(res.hazards.some((h) => h.type === "frost_damage")).toBe(true);
      expect(res.overallRiskLevel).toBe("critical");
    });

    it("evaluates late-blight favorable weather condition (high humidity + 10-24°C + rain)", () => {
      const blightWeather = createMockWeather(
        { humidity: 90, condition: "rain", cloudCover: 90 },
        [
          { temperatureLow: 12, temperatureHigh: 20, precipitationSum: 8.0 },
        ]
      );
      const res = evaluateAgricultureRisk("potato", blightWeather);
      expect(res.hazards.some((h) => h.type === "blight_favorable_weather")).toBe(true);
      expect(res.hazards.find((h) => h.type === "blight_favorable_weather")?.description).toContain(
        "late-blight risk; field inspection is recommended"
      );
    });
  });

  describe("Mustard Thresholds", () => {
    it("evaluates overcast + humid conditions favoring aphid activity", () => {
      const overcastWeather = createMockWeather(
        { humidity: 80, cloudCover: 85, condition: "overcast" },
        [{ temperatureLow: 10, temperatureHigh: 22 }]
      );
      const res = evaluateAgricultureRisk("mustard", overcastWeather);
      expect(res.hazards.some((h) => h.type === "pest_favorable_weather")).toBe(true);
    });
  });

  describe("Activity Feasibility Rules", () => {
    it("evaluates irrigation as unfavorable when significant rain is forecast", () => {
      const windows = {
        next24hPrecipMm: 16.0,
        next48hPrecipMm: 20.0,
        sevenDayPrecipSumMm: 25.0,
        maxTemperatureC: 28,
        minTemperatureC: 18,
        maxWindSpeedKmh: 12,
        averageHumidityPct: 60,
        max24hWindSpeedKmh: 12,
        max24hPrecipProbPct: 80,
        isOvercastOrRainy: true,
      };
      const activity = evaluateIrrigationActivity(windows, 15.0);
      expect(activity.status).toBe("unfavorable");
      expect(activity.advisory).toContain("Rainfall is expected");
    });

    it("evaluates spraying as unfavorable under strong wind", () => {
      const activity = evaluateSprayingActivity(18.0, 22.0, 0, 0, 15.0);
      expect(activity.status).toBe("unfavorable");
      expect(activity.reason).toContain("exceed the safe spraying threshold");
    });

    it("evaluates field operations as unfavorable under heavy rain", () => {
      const activity = evaluateFieldOperationsActivity(35.0, 50.0, 15.0, 30.0);
      expect(activity.status).toBe("unfavorable");
      expect(activity.advisory).toContain("Substantial rainfall is forecast");
    });
  });

  describe("Risk Aggregation Hierarchy", () => {
    it("returns low risk when no hazards are detected", () => {
      const res = aggregateRiskLevel([]);
      expect(res.level).toBe("low");
    });

    it("aggregates critical risk when any hazard is critical", () => {
      const res = aggregateRiskLevel([
        { type: "heat_stress", severity: "moderate", description: "Heat", triggerMetric: "32°C", evidence: "Ev" },
        { type: "frost_damage", severity: "critical", description: "Frost", triggerMetric: "1°C", evidence: "Ev" },
      ]);
      expect(res.level).toBe("critical");
      expect(res.primaryHazard).toBe("Frost");
    });

    it("aggregates high risk when single high hazard is present", () => {
      const res = aggregateRiskLevel([
        { type: "heat_stress", severity: "high", description: "Heat", triggerMetric: "33°C", evidence: "Ev" },
      ]);
      expect(res.level).toBe("high");
    });

    it("emits the exact approved advisory disclaimer", () => {
      const weather = createMockWeather();
      const res = evaluateAgricultureRisk("wheat", weather);
      expect(res.disclaimer).toBe(
        "Weather-based advisory derived from atmospheric observations and forecasts. Local soil, crop, pest, and disease conditions are not directly measured."
      );
    });
  });
});
