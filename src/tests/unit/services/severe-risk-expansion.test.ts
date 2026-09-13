import { describe, it, expect, beforeEach } from "vitest";
import { evaluateDroughtRisk } from "@/services/risk/risk-evaluators/drought-risk";
import { evaluateCycloneRisk } from "@/services/risk/risk-evaluators/cyclone-risk";
import { reconcileAlerts } from "@/services/risk/alert-reconciliation";
import { RiskEngine } from "@/services/risk/risk-engine";
import { InMemoryEventRepository } from "@/services/storage/in-memory-repositories";
import type { WeatherSnapshot } from "@/types/weather";
import type { WeatherEvent } from "@/types/events";

function createMockSnapshot(
  currentOverrides: Partial<WeatherSnapshot["current"]> = {},
  dailyOverrides: Partial<WeatherSnapshot["daily"][0]>[] = []
): WeatherSnapshot {
  const current = {
    temperature: 28,
    feelsLike: 29,
    humidity: 55,
    precipitation: 0,
    windSpeed: 15,
    windGust: 20,
    windDirection: 180,
    pressure: 1012,
    uvIndex: 6,
    cloudCover: 20,
    condition: "clear" as const,
    conditionCode: 0,
    isDay: true,
    observedAt: "2026-09-13T12:00:00.000Z",
    ...currentOverrides,
  };

  const defaultDaily = [
    {
      date: "2026-09-13",
      temperatureHigh: 32,
      temperatureLow: 22,
      condition: "clear" as const,
      conditionCode: 0,
      precipitationProbability: 10,
      precipitationSum: 0,
      windSpeed: 18,
      sunrise: "2026-09-13T06:00:00.000Z",
      sunset: "2026-09-13T18:00:00.000Z",
    },
  ];

  const daily = dailyOverrides.length > 0
    ? dailyOverrides.map((d, i) => ({ ...defaultDaily[i % defaultDaily.length]!, ...d }))
    : defaultDaily;

  return {
    location: {
      name: "Puri",
      region: "Odisha",
      country: "India",
      coordinates: { latitude: 19.81, longitude: 85.83 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-13T12:00:00.000Z",
    current,
    hourly: [],
    daily,
    alerts: [],
    provenance: [
      {
        provider: "open-meteo",
        retrievedAt: "2026-09-13T12:00:00.000Z",
        dataType: "forecast",
      },
    ],
  };
}

describe("Severe Weather Risk Evaluators & Alert Reconciliation", () => {
  let eventRepo: InMemoryEventRepository;
  let engine: RiskEngine;

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository();
    engine = new RiskEngine(eventRepo);
  });

  it("evaluates Drought Risk based on precipitation deficit and thermal aridity", () => {
    // Zero rain over 7 days, 42C peak heat, 20% humidity -> extreme drought
    const aridWeather = createMockSnapshot(
      { temperature: 41, humidity: 22 },
      [
        { temperatureHigh: 43, temperatureLow: 30, precipitationSum: 0 },
        { temperatureHigh: 42, temperatureLow: 29, precipitationSum: 0 },
        { temperatureHigh: 41, temperatureLow: 28, precipitationSum: 0.2 },
      ]
    );

    const assessment = evaluateDroughtRisk(aridWeather);
    expect(assessment.type).toBe("drought");
    expect(assessment.severity).toBe("extreme");
    expect(assessment.recommendation).toContain("irrigation rationing");

    // Favorable rain -> low drought risk
    const wetWeather = createMockSnapshot(
      { temperature: 26, humidity: 70 },
      [
        { temperatureHigh: 29, temperatureLow: 20, precipitationSum: 15 },
        { temperatureHigh: 28, temperatureLow: 19, precipitationSum: 12 },
      ]
    );
    const lowAssessment = evaluateDroughtRisk(wetWeather);
    expect(lowAssessment.severity).toBe("low");
  });

  it("evaluates Cyclone Risk based on IMD wind and pressure criteria", () => {
    // Sustained wind 95 km/h, gusts 125 km/h, barometric pressure 985 hPa -> extreme cyclone
    const cycloneWeather = createMockSnapshot(
      { temperature: 27, windSpeed: 95, windGust: 125, pressure: 985 },
      [{ temperatureHigh: 28, temperatureLow: 22, windSpeed: 100, precipitationSum: 85 }]
    );

    const extremeCyclone = evaluateCycloneRisk(cycloneWeather);
    expect(extremeCyclone.type).toBe("cyclone");
    expect(extremeCyclone.severity).toBe("extreme");
    expect(extremeCyclone.recommendation).toContain("CRITICAL CYCLONIC THREAT");

    // Standard coastal breeze 15 km/h -> low cyclone risk
    const calmWeather = createMockSnapshot({ windSpeed: 15, pressure: 1012 });
    const calmAssessment = evaluateCycloneRisk(calmWeather);
    expect(calmAssessment.severity).toBe("low");
  });

  it("reconciles official agency alerts with live NWP observations", () => {
    const weather = createMockSnapshot({ windSpeed: 90, pressure: 986 });

    const mockOfficialEvent: WeatherEvent = {
      id: "imd_cyclone_001",
      slug: "bay-of-bengal-cyclone",
      title: "Cyclone Warning for Odisha Coast",
      category: "cyclone",
      hazard: "cyclone",
      severity: "severe",
      status: "active",
      description: "Severe Cyclonic Storm landfall expected.",
      location: { name: "Puri", country: "India" },
      locations: [{ name: "Puri", country: "India" }],
      affectedRegions: [{ name: "Puri", country: "India" }],
      firstSeenAt: "2026-09-13T06:00:00Z",
      lastUpdatedAt: "2026-09-13T10:00:00Z",
      confidence: 0.9,
      sourceArticleIds: ["art_1"],
      sources: [
        {
          name: "IMD",
          url: "https://mausam.imd.gov.in",
          publishedAt: "2026-09-13T10:00:00Z",
          category: "official",
          tier: 1,
        },
      ],
      impacts: [],
      provenance: [
        {
          provider: "IMD",
          retrievedAt: "2026-09-13T10:00:00Z",
          dataType: "observation",
        },
      ],
    };

    const cycloneAssessment = evaluateCycloneRisk(weather);
    const reconciled = reconcileAlerts([mockOfficialEvent], [cycloneAssessment], weather);

    expect(reconciled.length).toBe(1);
    expect(reconciled[0]?.validationStatus).toBe("verified_active");
    expect(reconciled[0]?.confidenceScore).toBeGreaterThanOrEqual(0.95);
    expect(reconciled[0]?.explanation).toContain("High consensus");
  });

  it("RiskEngine produces all 8 risk categories including drought and cyclone", async () => {
    const weather = createMockSnapshot();
    const report = await engine.evaluate({ weather });

    expect(report.assessments.length).toBe(8);
    const types = report.assessments.map((a) => a.type);
    expect(types).toContain("heat");
    expect(types).toContain("heavy_rain");
    expect(types).toContain("thunderstorm");
    expect(types).toContain("wind");
    expect(types).toContain("uv");
    expect(types).toContain("flood");
    expect(types).toContain("drought");
    expect(types).toContain("cyclone");
  });
});
