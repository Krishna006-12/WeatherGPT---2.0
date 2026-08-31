import { describe, it, expect } from "vitest";
import { calculateHaversineDistanceKm, getProximityTier } from "@/lib/geo-distance";

describe("Geo Distance Utility", () => {
  it("calculates accurate great-circle distance between two known cities", () => {
    // Kanpur (26.4499, 80.3319) to Lucknow (26.8467, 80.9462) ~ 76 km
    const kanpur = { latitude: 26.4499, longitude: 80.3319 };
    const lucknow = { latitude: 26.8467, longitude: 80.9462 };

    const distance = calculateHaversineDistanceKm(kanpur, lucknow);
    expect(distance).toBeGreaterThan(70);
    expect(distance).toBeLessThan(85);
  });

  it("calculates distance between Kathmandu and Kanpur", () => {
    // Kathmandu (27.7172, 85.3240) to Kanpur (26.4499, 80.3319) ~ 510 km
    const kathmandu = { latitude: 27.7172, longitude: 85.324 };
    const kanpur = { latitude: 26.4499, longitude: 80.3319 };

    const distance = calculateHaversineDistanceKm(kathmandu, kanpur);
    expect(distance).toBeGreaterThan(480);
    expect(distance).toBeLessThan(540);
  });

  it("categorizes proximity tiers accurately", () => {
    expect(getProximityTier(30)).toBe("immediate");
    expect(getProximityTier(100)).toBe("near");
    expect(getProximityTier(300)).toBe("moderate");
    expect(getProximityTier(600)).toBe("distant");
  });
});
