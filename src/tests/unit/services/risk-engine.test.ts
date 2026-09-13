import { describe, it, expect, beforeEach } from "vitest";
import { RiskEngine } from "@/services/risk/risk-engine";
import { InMemoryEventRepository } from "@/services/storage/in-memory-repositories";
import type { WeatherSnapshot, WeatherCondition } from "@/types/weather";
import type { WeatherEvent } from "@/types/events";

function createBaseSnapshot(overrides: Partial<WeatherSnapshot["current"]> = {}): WeatherSnapshot {
  return {
    location: {
      name: "Kanpur",
      region: "Uttar Pradesh",
      country: "India",
      coordinates: { latitude: 26.4499, longitude: 80.3319 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-13T06:00:00Z",
    current: {
      temperature: 26,
      feelsLike: 27,
      humidity: 55,
      precipitation: 0,
      precipitationProbability: 10,
      windSpeed: 12,
      windDirection: 180,
      pressure: 1012,
      cloudCover: 20,
      condition: "partly-cloudy",
      observedAt: "2026-09-13T06:00:00Z",
      ...overrides,
    },
    hourly: [],
    daily: [
      {
        date: "2026-09-13",
        temperatureHigh: 28,
        temperatureLow: 20,
        condition: "partly-cloudy",
        precipitationProbability: 10,
        precipitationSum: 0,
        windSpeed: 14,
        sunrise: "2026-09-13T00:30:00Z",
        sunset: "2026-09-13T12:30:00Z",
      },
    ],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-09-13T06:00:00Z",
        dataType: "current",
      },
    ],
  };
}

describe("Unified Weather Risk Center — RiskEngine", () => {
  let eventRepo: InMemoryEventRepository;
  let engine: RiskEngine;

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository();
    engine = new RiskEngine(eventRepo);
  });

  it("1. evaluates benign baseline no-risk weather correctly", async () => {
    const weather = createBaseSnapshot();
    const report = await engine.evaluate({ weather });

    expect(report.location.name).toBe("Kanpur");
    expect(report.overallSeverity).toBe("low");

    const heat = report.assessments.find((a) => a.type === "heat");
    expect(heat?.severity).toBe("low");
    expect(heat?.status).toBe("available");

    const rain = report.assessments.find((a) => a.type === "heavy_rain");
    expect(rain?.severity).toBe("low");

    const storm = report.assessments.find((a) => a.type === "thunderstorm");
    expect(storm?.severity).toBe("low");

    const wind = report.assessments.find((a) => a.type === "wind");
    expect(wind?.severity).toBe("low");

    const uv = report.assessments.find((a) => a.type === "uv");
    expect(uv?.severity).toBe("unavailable");
    expect(uv?.status).toBe("unavailable");

    const flood = report.assessments.find((a) => a.type === "flood");
    expect(flood?.severity).toBe("no_evidence");
    expect(flood?.status).toBe("no_evidence");
  });

  it("2. evaluates moderate heat correctly", async () => {
    const weather = createBaseSnapshot({ temperature: 34, feelsLike: 36 });
    const report = await engine.evaluate({ weather });

    const heat = report.assessments.find((a) => a.type === "heat");
    expect(heat?.severity).toBe("moderate");
    expect(heat?.confidence).toBe("high");
    expect(heat?.recommendation).toContain("Elevated thermal conditions");
  });

  it("3. evaluates high heat and extreme heat correctly", async () => {
    const highWeather = createBaseSnapshot({ temperature: 39, feelsLike: 41 });
    const highReport = await engine.evaluate({ weather: highWeather });
    const highHeat = highReport.assessments.find((a) => a.type === "heat");
    expect(highHeat?.severity).toBe("high");

    const extremeWeather = createBaseSnapshot({ temperature: 43, feelsLike: 46 });
    const extremeReport = await engine.evaluate({ weather: extremeWeather });
    const extremeHeat = extremeReport.assessments.find((a) => a.type === "heat");
    expect(extremeHeat?.severity).toBe("extreme");
    expect(extremeHeat?.recommendation).toContain("not medical advice");
  });

  it("4. evaluates heavy rain and extreme torrential rain", async () => {
    const rainWeather = createBaseSnapshot({ precipitation: 8.0 });
    rainWeather.daily[0]!.precipitationSum = 35.0;
    rainWeather.daily[0]!.precipitationProbability = 85;

    const report = await engine.evaluate({ weather: rainWeather });
    const rain = report.assessments.find((a) => a.type === "heavy_rain");
    expect(rain?.severity).toBe("high");
    expect(rain?.confidence).toBe("high");
    expect(rain?.evidence.some((e) => e.metric === "daily_precipitation_sum")).toBe(true);

    // Torrential downpour
    rainWeather.daily[0]!.precipitationSum = 75.0;
    const extremeReport = await engine.evaluate({ weather: rainWeather });
    const extremeRain = extremeReport.assessments.find((a) => a.type === "heavy_rain");
    expect(extremeRain?.severity).toBe("extreme");
  });

  it("5. evaluates thunderstorm hazard without inferring from ordinary rain", async () => {
    // Ordinary rain does NOT trigger thunderstorm
    const rainOnlyWeather = createBaseSnapshot({ condition: "rain" });
    const rainReport = await engine.evaluate({ weather: rainOnlyWeather });
    const noStorm = rainReport.assessments.find((a) => a.type === "thunderstorm");
    expect(noStorm?.severity).toBe("low");

    // Convective thunderstorm condition triggers high risk
    const stormWeather = createBaseSnapshot({ condition: "thunderstorm" });
    const stormReport = await engine.evaluate({ weather: stormWeather });
    const storm = stormReport.assessments.find((a) => a.type === "thunderstorm");
    expect(storm?.severity).toBe("high");
    expect(storm?.recommendation).toContain("Lightning risk present");

    // Severe thunderstorm with gale winds triggers extreme
    const severeStorm = createBaseSnapshot({ condition: "thunderstorm", windSpeed: 65 });
    const severeReport = await engine.evaluate({ weather: severeStorm });
    const extremeStorm = severeReport.assessments.find((a) => a.type === "thunderstorm");
    expect(extremeStorm?.severity).toBe("extreme");
  });

  it("6. evaluates wind risk across thresholds", async () => {
    // Moderate wind
    const modWeather = createBaseSnapshot({ windSpeed: 25 });
    const modReport = await engine.evaluate({ weather: modWeather });
    const modWind = modReport.assessments.find((a) => a.type === "wind");
    expect(modWind?.severity).toBe("moderate");

    // High wind
    const highWeather = createBaseSnapshot({ windSpeed: 45 });
    const highReport = await engine.evaluate({ weather: highWeather });
    const highWind = highReport.assessments.find((a) => a.type === "wind");
    expect(highWind?.severity).toBe("high");

    // Extreme wind
    const extremeWeather = createBaseSnapshot({ windSpeed: 70 });
    const extremeReport = await engine.evaluate({ weather: extremeWeather });
    const extremeWind = extremeReport.assessments.find((a) => a.type === "wind");
    expect(extremeWind?.severity).toBe("extreme");
  });

  it("7. handles UV unavailable and evaluated UV when present", async () => {
    // UV missing
    const noUvWeather = createBaseSnapshot();
    delete noUvWeather.current.uvIndex;
    const report1 = await engine.evaluate({ weather: noUvWeather });
    const uv1 = report1.assessments.find((a) => a.type === "uv");
    expect(uv1?.status).toBe("unavailable");
    expect(uv1?.severity).toBe("unavailable");
    expect(uv1?.confidence).toBe("low");
    expect(uv1?.evidence).toHaveLength(0);

    // UV present: High
    const uvWeather = createBaseSnapshot({ uvIndex: 9.0 });
    const report2 = await engine.evaluate({ weather: uvWeather });
    const uv2 = report2.assessments.find((a) => a.type === "uv");
    expect(uv2?.status).toBe("available");
    expect(uv2?.severity).toBe("high");
    expect(uv2?.confidence).toBe("high");
    expect(uv2?.evidence[0]?.value).toBe(9.0);
  });

  it("8. evaluates flood risk with active flood event in geographic proximity", async () => {
    const activeFloodEvent: WeatherEvent = {
      id: "ev_flood_up_01",
      slug: "ganga-flood-kanpur",
      title: "Ganga River Flash Flood near Kanpur",
      description: "Severe flooding inundating low-lying ghats and agricultural land.",
      category: "flood",
      hazard: "flood",
      severity: "high",
      status: "active",
      location: {
        name: "Kanpur Ghats",
        country: "India",
        region: "Uttar Pradesh",
        coordinates: { latitude: 26.47, longitude: 80.35 },
      },
      locations: [
        {
          name: "Kanpur Ghats",
          country: "India",
          region: "Uttar Pradesh",
          coordinates: { latitude: 26.47, longitude: 80.35 },
        },
      ],
      affectedRegions: [{ name: "Uttar Pradesh", country: "India" }],
      firstSeenAt: "2026-09-12T10:00:00Z",
      lastUpdatedAt: "2026-09-13T05:00:00Z",
      confidence: 0.95,
      sourceArticleIds: ["art_flood_1"],
      sources: [
        {
          name: "Central Water Commission",
          url: "https://cwc.gov.in/bulletin",
          publishedAt: "2026-09-13T05:00:00Z",
          category: "government",
          tier: 1,
        },
      ],
      impacts: [],
      provenance: [
        {
          provider: "CWC",
          retrievedAt: "2026-09-13T05:00:00Z",
        },
      ],
    };

    await eventRepo.save(activeFloodEvent);

    const weather = createBaseSnapshot();
    const report = await engine.evaluate({ weather });
    const flood = report.assessments.find((a) => a.type === "flood");

    expect(flood?.status).toBe("available");
    expect(flood?.severity).toBe("high");
    expect(flood?.confidence).toBe("high");
    expect(flood?.evidence.some((e) => e.metric === "active_flood_event")).toBe(true);
    expect(flood?.reason).toContain("Ganga River Flash Flood");
  });

  it("9. reports no_evidence when no active flood event is present", async () => {
    const weather = createBaseSnapshot();
    const report = await engine.evaluate({ weather });
    const flood = report.assessments.find((a) => a.type === "flood");

    expect(flood?.status).toBe("no_evidence");
    expect(flood?.severity).toBe("no_evidence");
    expect(flood?.confidence).toBe("high");
    expect(flood?.evidence).toHaveLength(0);
    expect(flood?.reason).toContain("No verified flood events");
  });

  it("10. handles insufficient evidence gracefully when variables are absent", async () => {
    const sparseWeather: WeatherSnapshot = {
      location: {
        name: "Remote Point",
        region: "Ocean",
        country: "International",
        coordinates: { latitude: 0, longitude: 0 },
        timezone: "UTC",
      },
      observedAt: "2026-09-13T00:00:00Z",
      current: {
        temperature: undefined as unknown as number,
        feelsLike: undefined as unknown as number,
        humidity: 50,
        precipitation: undefined as unknown as number,
        windSpeed: undefined as unknown as number,
        windDirection: 0,
        pressure: 1010,
        cloudCover: 0,
        condition: undefined as unknown as WeatherCondition,
        observedAt: "2026-09-13T00:00:00Z",
      },
      hourly: [],
      daily: [],
      alerts: [],
      provenance: [],
    };

    const report = await engine.evaluate({ weather: sparseWeather });
    const heat = report.assessments.find((a) => a.type === "heat");
    expect(heat?.status).toBe("insufficient_evidence");
    expect(heat?.severity).toBe("unavailable");
    expect(heat?.confidence).toBe("low");

    const rain = report.assessments.find((a) => a.type === "heavy_rain");
    expect(rain?.status).toBe("insufficient_evidence");
    expect(rain?.severity).toBe("unavailable");

    const wind = report.assessments.find((a) => a.type === "wind");
    expect(wind?.status).toBe("insufficient_evidence");
    expect(wind?.severity).toBe("unavailable");
  });

  it("11. computes overall severity as the maximum of active evaluated risks", async () => {
    // High heat (39°C) + low rain + low wind -> overall severity is high
    const weather = createBaseSnapshot({ temperature: 39, feelsLike: 41 });
    const report = await engine.evaluate({ weather });

    expect(report.overallSeverity).toBe("high");
  });

  it("12. correctly incorporates target date and forecast time window", async () => {
    const weather = createBaseSnapshot();
    weather.daily.push({
      date: "2026-09-14",
      temperatureHigh: 40,
      temperatureLow: 24,
      condition: "heavy-rain",
      precipitationProbability: 90,
      precipitationSum: 40,
      windSpeed: 22,
      sunrise: "2026-09-14T00:30:00Z",
      sunset: "2026-09-14T12:30:00Z",
    });

    const report = await engine.evaluate({
      weather,
      targetDate: "2026-09-14",
    });

    expect(report.targetDate).toBe("2026-09-14");
    expect(report.period).toContain("2026-09-14");

    const heat = report.assessments.find((a) => a.type === "heat");
    expect(heat?.severity).toBe("high");

    const rain = report.assessments.find((a) => a.type === "heavy_rain");
    expect(rain?.severity).toBe("high");
  });
});
