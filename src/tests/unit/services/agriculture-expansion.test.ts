import { describe, it, expect } from "vitest";
import { CROP_PROFILES, getCropProfile } from "@/services/agriculture/crop-profiles";
import { evaluateFungalDiseaseRisk } from "@/services/agriculture/disease-evaluator";
import { calculateEvapotranspiration } from "@/services/agriculture/evapotranspiration-service";
import { getRegionalSoilProfile } from "@/services/agriculture/soil-service";
import { evaluateAgricultureRisk } from "@/services/agriculture/agriculture-rules";
import type { WeatherSnapshot } from "@/types/weather";
import type { CropType } from "@/types/agriculture";

function createMockWeather(
  currentOverrides: Partial<WeatherSnapshot["current"]> = {},
  dailyOverrides: Partial<WeatherSnapshot["daily"][0]>[] = [],
  locationOverrides: Partial<WeatherSnapshot["location"]> = {}
): WeatherSnapshot {
  const current = {
    temperature: 24,
    feelsLike: 24,
    humidity: 65,
    precipitation: 0,
    windSpeed: 10,
    windDirection: 180,
    pressure: 1013,
    uvIndex: 5,
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
      temperatureHigh: 28,
      temperatureLow: 16,
      condition: "clear" as const,
      conditionCode: 0,
      precipitationProbability: 10,
      precipitationSum: 0,
      windSpeed: 12,
      sunrise: "2026-09-13T06:00:00.000Z",
      sunset: "2026-09-13T18:00:00.000Z",
    },
    {
      date: "2026-09-14",
      temperatureHigh: 29,
      temperatureLow: 17,
      condition: "clear" as const,
      conditionCode: 0,
      precipitationProbability: 10,
      precipitationSum: 0,
      windSpeed: 12,
      sunrise: "2026-09-14T06:00:00.000Z",
      sunset: "2026-09-14T18:00:00.000Z",
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
      coordinates: { latitude: 26.465, longitude: 80.349 },
      timezone: "Asia/Kolkata",
      ...locationOverrides,
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

describe("Phase 3 Agriculture Intelligence Expansion", () => {
  it("defines 24+ crop profiles with valid ICAR citations and FAO-56 Kc parameters", () => {
    const crops = Object.keys(CROP_PROFILES) as CropType[];
    expect(crops.length).toBeGreaterThanOrEqual(24);

    for (const crop of crops) {
      const profile = getCropProfile(crop);
      expect(profile.displayName).toBeDefined();
      expect(profile.temperature.heatStressThresholdC).toBeGreaterThan(20);
      expect(profile.icarCitation).toBeDefined();
      expect(profile.et0CropCoefficient?.kcMid).toBeGreaterThan(0);
    }

    // Explicit checks for key Indian staple and cash crops
    expect(getCropProfile("cotton").displayName).toBe("Cotton");
    expect(getCropProfile("sugarcane").displayName).toBe("Sugarcane");
    expect(getCropProfile("chickpea").displayName).toContain("Chickpea");
    expect(getCropProfile("soybean").displayName).toBe("Soybean");
    expect(getCropProfile("groundnut").displayName).toContain("Groundnut");
    expect(getCropProfile("tomato").displayName).toBe("Tomato");
    expect(getCropProfile("tea").displayName).toBe("Tea");
  });

  it("evaluates Late Blight disease risk for Potato/Tomato under cool humid conditions", () => {
    // Temperate (15-20C) + humid (90% RH) + rain
    const blightWeather = createMockWeather(
      { temperature: 18, humidity: 92 },
      [{ temperatureHigh: 20, temperatureLow: 14, precipitationSum: 6.0 }]
    );

    const potatoRisks = evaluateFungalDiseaseRisk("potato", blightWeather);
    expect(potatoRisks.length).toBe(1);
    expect(potatoRisks[0]?.diseaseName).toBe("Late Blight");
    expect(potatoRisks[0]?.riskLevel).toBe("critical");
    expect(potatoRisks[0]?.temperatureOptimalMet).toBe(true);
    expect(potatoRisks[0]?.humiditySustainedMet).toBe(true);
    expect(potatoRisks[0]?.pathogen).toContain("Phytophthora");

    // Clear dry weather should have low blight risk
    const dryWeather = createMockWeather(
      { temperature: 30, humidity: 35 },
      [{ temperatureHigh: 32, temperatureLow: 22, precipitationSum: 0 }]
    );
    const lowRisks = evaluateFungalDiseaseRisk("potato", dryWeather);
    expect(lowRisks[0]?.riskLevel).toBe("low");
  });

  it("evaluates Yellow Rust risk for Wheat under cool dew conditions", () => {
    const rustWeather = createMockWeather(
      { temperature: 15, humidity: 88 },
      [{ temperatureHigh: 18, temperatureLow: 8, precipitationSum: 1.0 }]
    );

    const rustRisks = evaluateFungalDiseaseRisk("wheat", rustWeather);
    expect(rustRisks.length).toBe(1);
    expect(rustRisks[0]?.diseaseName).toContain("Yellow / Stripe Rust");
    expect(rustRisks[0]?.riskLevel).toBe("high");
    expect(rustRisks[0]?.pathogen).toContain("Puccinia");
  });

  it("calculates FAO-56 Reference ET₀, Crop ETc, and Irrigation Deficit", () => {
    const weather = createMockWeather(
      { temperature: 26 },
      [{ temperatureHigh: 32, temperatureLow: 20, precipitationSum: 0 }]
    );

    const et = calculateEvapotranspiration("wheat", weather);
    expect(et.et0MmDay).toBeGreaterThan(2.0);
    expect(et.cropEtMmDay).toBeGreaterThan(2.0);
    expect(et.cropCoefficientKc).toBe(1.15); // Wheat mid-season
    expect(et.irrigationDeficitMm).toBe(et.cropEtMmDay); // Zero rain -> full deficit
    expect(et.recommendedWaterLitersPerM2).toBe(et.cropEtMmDay);

    // With heavy rainfall, deficit should drop to 0
    const rainyWeather = createMockWeather(
      { temperature: 26 },
      [{ temperatureHigh: 30, temperatureLow: 22, precipitationSum: 25 }]
    );
    const rainyEt = calculateEvapotranspiration("wheat", rainyWeather);
    expect(rainyEt.irrigationDeficitMm).toBe(0);
  });

  it("maps geographic locations to SoilGrids and ICAR regional soil profiles", () => {
    // Kanpur / UP -> Alluvial
    const alluvial = getRegionalSoilProfile(26.46, 80.34, "Uttar Pradesh");
    expect(alluvial.soilType).toBe("alluvial");
    expect(alluvial.phRange).toContain("7.0");

    // Nagpur / Maharashtra -> Black Cotton (Vertisol)
    const vertisol = getRegionalSoilProfile(21.14, 79.08, "Maharashtra");
    expect(vertisol.soilType).toBe("black");
    expect(vertisol.fieldCapacityPct).toBe(38.0);

    // Bengaluru / Karnataka -> Red / Laterite
    const redSoil = getRegionalSoilProfile(12.97, 77.59, "Karnataka");
    expect(redSoil.soilType).toBe("red");
    expect(redSoil.drainage).toBe("well_drained");

    // Jaisalmer / Rajasthan -> Sandy Loam
    const desert = getRegionalSoilProfile(26.91, 70.9, "Rajasthan");
    expect(desert.soilType).toBe("sandy_loam");
    expect(desert.drainage).toBe("excessive");
  });

  it("aggregates full assessment with diseaseRisks, evapotranspiration, and soilProfile", () => {
    const weather = createMockWeather();
    const assessment = evaluateAgricultureRisk("wheat", weather);

    expect(assessment.crop).toBe("wheat");
    expect(assessment.diseaseRisks).toBeDefined();
    expect(assessment.evapotranspiration).toBeDefined();
    expect(assessment.soilProfile).toBeDefined();
    expect(assessment.soilProfile?.soilType).toBe("alluvial");
  });
});
