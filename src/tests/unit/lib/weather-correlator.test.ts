import { describe, it, expect } from "vitest";
import { correlateWeatherWithHazard } from "@/lib/weather-correlator";
import type { WeatherSnapshot } from "@/types/weather";

describe("Weather Correlator", () => {
  const baseWeather: WeatherSnapshot = {
    location: {
      name: "Kanpur",
      country: "India",
      region: "Uttar Pradesh",
      coordinates: { latitude: 26.4499, longitude: 80.3319 },
      timezone: "Asia/Kolkata",
    },
    observedAt: "2026-09-01T00:00:00Z",
    current: {
      temperature: 28,
      feelsLike: 31,
      humidity: 85,
      precipitation: 0.0,
      windSpeed: 10,
      windDirection: 180,
      pressure: 1012,
      cloudCover: 50,
      condition: "cloudy",
      observedAt: "2026-09-01T00:00:00Z",
    },
    hourly: [],
    daily: [],
    alerts: [],
    provenance: [
      {
        provider: "Open-Meteo",
        retrievedAt: "2026-09-01T00:00:00Z",
        dataType: "current",
      },
    ],
  };

  it("identifies aligned rainfall evidence for flood hazard", () => {
    const rainWeather: WeatherSnapshot = {
      ...baseWeather,
      current: {
        ...baseWeather.current,
        precipitation: 12.5,
        condition: "heavy-rain",
      },
    };

    const result = correlateWeatherWithHazard("flood", rainWeather);
    expect(result.isAligned).toBe(true);
    expect(result.evidence.type).toBe("weather_condition_aligned");
    expect(result.evidence.weight).toBe("supporting");
    expect(result.evidence.description).toContain("12.5 mm/h");
  });

  it("identifies aligned extreme temperature for heatwave hazard", () => {
    const hotWeather: WeatherSnapshot = {
      ...baseWeather,
      current: {
        ...baseWeather.current,
        temperature: 42.5,
        condition: "clear",
      },
    };

    const result = correlateWeatherWithHazard("heatwave", hotWeather);
    expect(result.isAligned).toBe(true);
    expect(result.evidence.type).toBe("weather_condition_aligned");
    expect(result.evidence.description).toContain("42.5°C");
  });

  it("returns neutral evidence when local weather is moderate", () => {
    const result = correlateWeatherWithHazard("flood", baseWeather);
    expect(result.isAligned).toBe(false);
    expect(result.evidence.type).toBe("weather_condition_neutral");
    expect(result.evidence.weight).toBe("neutral");
  });
});
