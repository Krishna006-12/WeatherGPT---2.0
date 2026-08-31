import { describe, it, expect } from "vitest";
import { mapWmoCode } from "@/lib/wmo-codes";

describe("wmo-codes", () => {
  it("maps known codes correctly", () => {
    expect(mapWmoCode(0)).toEqual({ condition: "clear", label: "Clear sky" });
    expect(mapWmoCode(2)).toEqual({ condition: "partly-cloudy", label: "Partly cloudy" });
    expect(mapWmoCode(3)).toEqual({ condition: "overcast", label: "Overcast" });
    expect(mapWmoCode(51)).toEqual({ condition: "drizzle", label: "Drizzle" });
    expect(mapWmoCode(61)).toEqual({ condition: "rain", label: "Rain" });
    expect(mapWmoCode(65)).toEqual({ condition: "heavy-rain", label: "Heavy rain" });
    expect(mapWmoCode(95)).toEqual({ condition: "thunderstorm", label: "Thunderstorm" });
    expect(mapWmoCode(96)).toEqual({ condition: "thunderstorm", label: "Thunderstorm with hail" });
  });

  it("maps unknown codes to unknown", () => {
    expect(mapWmoCode(-1)).toEqual({ condition: "unknown", label: "Unknown" });
    expect(mapWmoCode(100)).toEqual({ condition: "unknown", label: "Unknown" });
  });
});
