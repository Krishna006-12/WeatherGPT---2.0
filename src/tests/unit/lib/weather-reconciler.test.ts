import { describe, it, expect } from "vitest";
import { reconcileWeatherCondition } from "@/lib/weather-reconciler";

describe("reconcileWeatherCondition", () => {
  it("reconciles trace drizzle with partial cloud cover to Partly Cloudy (Kanpur scenario)", () => {
    const result = reconcileWeatherCondition({
      condition: "drizzle",
      precipitation: 0.1,
      precipitationProbability: 10,
      cloudCover: 44,
      humidity: 59,
    });

    expect(result.effectiveCondition).toBe("partly-cloudy");
    expect(result.defaultLabel).toBe("Partly Cloudy");
    expect(result.theme).toBe("amber");
    expect(result.isReconciledFromTrace).toBe(true);
  });

  it("reconciles trace drizzle with clear sky to Clear", () => {
    const result = reconcileWeatherCondition({
      condition: "drizzle",
      precipitation: 0.05,
      precipitationProbability: 5,
      cloudCover: 10,
      humidity: 45,
    });

    expect(result.effectiveCondition).toBe("clear");
    expect(result.defaultLabel).toBe("Clear");
    expect(result.theme).toBe("amber");
    expect(result.isReconciledFromTrace).toBe(true);
  });

  it("reconciles trace precipitation with heavy cloud cover to Cloudy", () => {
    const result = reconcileWeatherCondition({
      condition: "rain",
      precipitation: 0.1,
      precipitationProbability: 15,
      cloudCover: 85,
      humidity: 60,
    });

    expect(result.effectiveCondition).toBe("cloudy");
    expect(result.defaultLabel).toBe("Cloudy");
    expect(result.theme).toBe("slate");
    expect(result.isReconciledFromTrace).toBe(true);
  });

  it("preserves genuine measurable drizzle", () => {
    const result = reconcileWeatherCondition({
      condition: "drizzle",
      precipitation: 0.8,
      precipitationProbability: 70,
      cloudCover: 90,
      humidity: 85,
    });

    expect(result.effectiveCondition).toBe("drizzle");
    expect(result.defaultLabel).toBe("Light Drizzle");
    expect(result.theme).toBe("cyan");
    expect(result.isReconciledFromTrace).toBe(false);
  });

  it("preserves genuine rain", () => {
    const result = reconcileWeatherCondition({
      condition: "rain",
      precipitation: 4.5,
      precipitationProbability: 85,
      cloudCover: 100,
      humidity: 90,
    });

    expect(result.effectiveCondition).toBe("rain");
    expect(result.defaultLabel).toBe("Rain");
    expect(result.theme).toBe("cyan");
    expect(result.isReconciledFromTrace).toBe(false);
  });

  it("preserves severe thunderstorm weather unconditionally", () => {
    const result = reconcileWeatherCondition({
      condition: "thunderstorm",
      precipitation: 0.1,
      cloudCover: 50,
    });

    expect(result.effectiveCondition).toBe("thunderstorm");
    expect(result.theme).toBe("rose");
    expect(result.isReconciledFromTrace).toBe(false);
  });
});
