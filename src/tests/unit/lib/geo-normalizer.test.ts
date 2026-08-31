import { describe, it, expect } from "vitest";
import { extractLocationsFromText, locationsToAffectedRegions } from "@/lib/geo-normalizer";

describe("extractLocationsFromText", () => {
  it("extracts explicitly mentioned Indian cities, states, and countries", () => {
    const text = "Heavy rainfall causes waterlogging in Kanpur and Lucknow across Uttar Pradesh, India.";
    const locations = extractLocationsFromText(text);

    expect(locations.some((l) => l.name === "Kanpur" && l.region === "Uttar Pradesh")).toBe(true);
    expect(locations.some((l) => l.name === "Lucknow")).toBe(true);
    expect(locations.some((l) => l.country === "India")).toBe(true);
  });

  it("extracts international disaster locations", () => {
    const text = "Devastating flash floods in Kathmandu valley, Nepal.";
    const locations = extractLocationsFromText(text);

    expect(locations.some((l) => l.name === "Kathmandu")).toBe(true);
    expect(locations.some((l) => l.country === "Nepal")).toBe(true);
    // Strict requirement: Should NOT infer Indian states
    expect(locations.some((l) => l.country === "India")).toBe(false);
  });

  it("returns Global fallback when no specific locations are found", () => {
    const locations = extractLocationsFromText("Solar storm flare detected in upper atmosphere");
    expect(locations).toEqual([{ name: "Global", country: "Global" }]);
  });
});

describe("locationsToAffectedRegions", () => {
  it("converts locations to distinct affected regions", () => {
    const locs = [
      { name: "Kanpur", country: "India", region: "Uttar Pradesh" },
      { name: "Lucknow", country: "India", region: "Uttar Pradesh" },
    ];
    const regions = locationsToAffectedRegions(locs);
    expect(regions.length).toBe(2);
    expect(regions[0]?.name).toBe("Uttar Pradesh");
    expect(regions[0]?.country).toBe("India");
  });
});
