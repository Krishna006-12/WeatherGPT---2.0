import { describe, it, expect } from "vitest";
import {
  openMeteoForecastResponseSchema,
  openMeteoGeocodingResponseSchema,
} from "@/schemas/open-meteo";
import weatherFixture from "../../fixtures/open-meteo-weather.json";
import geocodingFixture from "../../fixtures/open-meteo-geocoding.json";

describe("open-meteo schemas", () => {
  it("parses valid weather fixture", () => {
    const result = openMeteoForecastResponseSchema.safeParse(weatherFixture);
    expect(result.success).toBe(true);
  });

  it("fails when missing required fields", () => {
    const invalid = { ...weatherFixture, current: undefined };
    const result = openMeteoForecastResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("handles extra fields gracefully", () => {
    const withExtra = { ...weatherFixture, extraField: "should be ignored" };
    const result = openMeteoForecastResponseSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
  });

  it("parses valid geocoding fixture", () => {
    const result = openMeteoGeocodingResponseSchema.safeParse(geocodingFixture);
    expect(result.success).toBe(true);
  });
});
