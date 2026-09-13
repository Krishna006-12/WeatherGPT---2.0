import { describe, it, expect, beforeEach } from "vitest";
import { ConsensusEngine } from "@/services/nwp/consensus-engine";
import type { ModelForecast, NwpModelId } from "@/types/nwp";
import type { LocationInfo } from "@/types/weather";

const mockLocation: LocationInfo = {
  name: "New Delhi",
  region: "Delhi",
  country: "India",
  coordinates: { latitude: 28.6139, longitude: 77.209 },
  timezone: "Asia/Kolkata",
};

function createMockModelForecast(
  modelId: NwpModelId,
  modelName: string,
  dailyData: Array<{
    date: string;
    tempHigh: number;
    tempLow: number;
    precip: number;
    windSpeed: number;
    condition: "clear" | "partly-cloudy" | "cloudy" | "rain" | "thunderstorm";
  }>
): ModelForecast {
  return {
    modelId,
    modelName,
    organization: "Global Met Center",
    resolutionKm: 13,
    daily: dailyData.map((d) => ({
      date: d.date,
      temperatureHigh: d.tempHigh,
      temperatureLow: d.tempLow,
      precipitationSum: d.precip,
      precipitationProbability: d.precip > 0 ? 80 : 10,
      windSpeedMax: d.windSpeed,
      condition: d.condition,
      description: `${d.condition} conditions`,
    })),
  };
}

describe("ConsensusEngine", () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine();
  });

  it("1. calculates high agreement statistics when models are tightly aligned", () => {
    const forecasts: ModelForecast[] = [
      createMockModelForecast("ecmwf", "ECMWF IFS", [
        {
          date: "2026-09-14",
          tempHigh: 32.0,
          tempLow: 22.0,
          precip: 0.0,
          windSpeed: 15.0,
          condition: "clear",
        },
      ]),
      createMockModelForecast("gfs", "NOAA GFS", [
        {
          date: "2026-09-14",
          tempHigh: 33.0,
          tempLow: 23.0,
          precip: 0.2,
          windSpeed: 16.0,
          condition: "clear",
        },
      ]),
      createMockModelForecast("icon", "DWD ICON", [
        {
          date: "2026-09-14",
          tempHigh: 32.5,
          tempLow: 22.5,
          precip: 0.0,
          windSpeed: 14.5,
          condition: "clear",
        },
      ]),
    ];

    const report = engine.evaluate({
      location: mockLocation,
      forecasts,
    });

    expect(report.overallConfidence).toBe("high");
    expect(report.overallAgreementScore).toBeGreaterThanOrEqual(85);
    expect(report.modelsUsed).toEqual(["ecmwf", "gfs", "icon"]);

    const day1 = report.consensusDays[0];
    expect(day1).toBeDefined();
    if (!day1) return;
    expect(day1.date).toBe("2026-09-14");
    expect(day1.confidence).toBe("high");

    // Max Temp: 32.0, 32.5, 33.0 -> mean: 32.5, median: 32.5, spread: 1.0
    expect(day1.temperatureHigh.mean).toBe(32.5);
    expect(day1.temperatureHigh.median).toBe(32.5);
    expect(day1.temperatureHigh.min).toBe(32.0);
    expect(day1.temperatureHigh.max).toBe(33.0);
    expect(day1.temperatureHigh.spread).toBe(1.0);
    expect(day1.temperatureHigh.agreementLevel).toBe("high");

    // Precipitation: 0, 0.2, 0 -> spread 0.2, both < 1mm -> high
    expect(day1.precipitationSum.spread).toBe(0.2);
    expect(day1.precipitationSum.agreementLevel).toBe("high");

    // Condition voting: 3 clear
    expect(day1.consensusCondition).toBe("clear");
    expect(day1.conditionAgreementPercent).toBe(100);
    expect(day1.divergentModels.length).toBe(0);
  });

  it("2. identifies divergence and outlier model when a single model deviates sharply", () => {
    const forecasts: ModelForecast[] = [
      createMockModelForecast("ecmwf", "ECMWF IFS", [
        {
          date: "2026-09-14",
          tempHigh: 30.0,
          tempLow: 20.0,
          precip: 0.0,
          windSpeed: 15.0,
          condition: "partly-cloudy",
        },
      ]),
      createMockModelForecast("icon", "DWD ICON", [
        {
          date: "2026-09-14",
          tempHigh: 31.0,
          tempLow: 21.0,
          precip: 1.0,
          windSpeed: 16.0,
          condition: "partly-cloudy",
        },
      ]),
      createMockModelForecast("gfs", "NOAA GFS", [
        {
          date: "2026-09-14",
          tempHigh: 37.0, // Outlier: +6°C over median
          tempLow: 22.0,
          precip: 25.0, // Outlier: +24mm over median
          windSpeed: 17.0,
          condition: "rain",
        },
      ]),
    ];

    const report = engine.evaluate({
      location: mockLocation,
      forecasts,
    });

    const day1 = report.consensusDays[0];
    expect(day1).toBeDefined();
    if (!day1) return;
    expect(day1.temperatureHigh.spread).toBe(7.0);
    expect(day1.temperatureHigh.agreementLevel).toBe("divergent");

    expect(day1.precipitationSum.spread).toBe(25.0);
    expect(day1.precipitationSum.agreementLevel).toBe("divergent");

    // Outlier check for GFS
    expect(day1.divergentModels.length).toBeGreaterThanOrEqual(1);
    const gfsDivergence = day1.divergentModels.find((d) => d.modelId === "gfs");
    expect(gfsDivergence).toBeDefined();

    // Overall confidence lowered
    expect(day1.confidence).not.toBe("high");
  });

  it("3. handles moderate agreement when spreads fall in intermediate ranges", () => {
    const forecasts: ModelForecast[] = [
      createMockModelForecast("ecmwf", "ECMWF IFS", [
        {
          date: "2026-09-15",
          tempHigh: 28.0,
          tempLow: 18.0,
          precip: 3.0,
          windSpeed: 20.0,
          condition: "cloudy",
        },
      ]),
      createMockModelForecast("gfs", "NOAA GFS", [
        {
          date: "2026-09-15",
          tempHigh: 31.0, // spread 3.0 -> moderate (2.0 < spread <= 4.0)
          tempLow: 20.0,
          precip: 10.0, // spread 7.0 -> moderate (5.0 < spread <= 15.0)
          windSpeed: 30.0, // spread 10.0 -> moderate (8.0 < spread <= 16.0)
          condition: "cloudy",
        },
      ]),
    ];

    const report = engine.evaluate({
      location: mockLocation,
      forecasts,
    });
    const day1 = report.consensusDays[0];
    expect(day1).toBeDefined();
    if (!day1) return;

    expect(day1.temperatureHigh.agreementLevel).toBe("moderate");
    expect(day1.precipitationSum.agreementLevel).toBe("moderate");
    expect(day1.windSpeedMax.agreementLevel).toBe("moderate");
    expect(day1.confidence).toBe("moderate");
  });

  it("4. handles single model input gracefully without crashing", () => {
    const forecasts: ModelForecast[] = [
      createMockModelForecast("ecmwf", "ECMWF IFS", [
        {
          date: "2026-09-16",
          tempHigh: 29.0,
          tempLow: 19.0,
          precip: 0.0,
          windSpeed: 12.0,
          condition: "clear",
        },
      ]),
    ];

    const report = engine.evaluate({
      location: mockLocation,
      forecasts,
    });
    const day1 = report.consensusDays[0];
    expect(day1).toBeDefined();
    if (!day1) return;

    expect(day1.temperatureHigh.mean).toBe(29.0);
    expect(day1.temperatureHigh.median).toBe(29.0);
    expect(day1.temperatureHigh.spread).toBe(0.0);
    expect(day1.temperatureHigh.standardDeviation).toBe(0.0);
    expect(day1.temperatureHigh.agreementLevel).toBe("high");
  });

  it("5. correctly calculates dominant condition by vote count", () => {
    const forecasts: ModelForecast[] = [
      createMockModelForecast("ecmwf", "ECMWF IFS", [
        {
          date: "2026-09-17",
          tempHigh: 25.0,
          tempLow: 18.0,
          precip: 5.0,
          windSpeed: 10.0,
          condition: "rain",
        },
      ]),
      createMockModelForecast("gfs", "NOAA GFS", [
        {
          date: "2026-09-17",
          tempHigh: 25.0,
          tempLow: 18.0,
          precip: 6.0,
          windSpeed: 10.0,
          condition: "rain",
        },
      ]),
      createMockModelForecast("icon", "DWD ICON", [
        {
          date: "2026-09-17",
          tempHigh: 26.0,
          tempLow: 18.0,
          precip: 1.0,
          windSpeed: 10.0,
          condition: "cloudy",
        },
      ]),
    ];

    const report = engine.evaluate({
      location: mockLocation,
      forecasts,
    });
    const day1 = report.consensusDays[0];
    expect(day1).toBeDefined();
    if (!day1) return;

    expect(day1.consensusCondition).toBe("rain");
    expect(day1.conditionAgreementPercent).toBe(67);
  });
});
