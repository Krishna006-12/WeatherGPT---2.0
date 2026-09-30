import { describe, it, expect } from "vitest";
import {
  calculateDistanceKm,
  routeWeatherService,
} from "@/services/travel/route-weather-service";

describe("RouteWeatherService", () => {
  it("calculates distance between Delhi and Manali correctly using Haversine", () => {
    // Delhi: 28.6139, 77.2090
    // Manali: 32.2432, 77.1892
    const dist = calculateDistanceKm(28.6139, 77.209, 32.2432, 77.1892);
    // Great circle distance is roughly 400-410 km
    expect(dist).toBeGreaterThan(380);
    expect(dist).toBeLessThan(440);
  });

  it("handles identical origin and destination with zero distance", () => {
    const dist = calculateDistanceKm(19.076, 72.8777, 19.076, 72.8777);
    expect(dist).toBe(0);
  });
});
