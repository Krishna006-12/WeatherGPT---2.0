import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocationService } from "@/services/location/location-service";
import openMeteoGeocodingFixture from "@/tests/fixtures/open-meteo-geocoding.json";

describe("LocationService", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns empty results for empty or short queries", async () => {
    const service = new LocationService();
    const result1 = await service.search("");
    const result2 = await service.search(" ");
    const result3 = await service.search("a");

    expect(result1.success).toBe(true);
    if (result1.success) expect(result1.data).toEqual([]);
    expect(result2.success).toBe(true);
    if (result2.success) expect(result2.data).toEqual([]);
    expect(result3.success).toBe(true);
    if (result3.success) expect(result3.data).toEqual([]);
  });

  it("successfully searches and normalizes location results", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(openMeteoGeocodingFixture),
    });

    const service = new LocationService();
    const result = await service.search("Kanpur");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(2);
      expect(result.data[0]?.name).toBe("Kanpur");
      expect(result.data[0]?.country).toBe("India");
      expect(result.data[0]?.region).toBe("Uttar Pradesh");
      expect(result.data[0]?.timezone).toBe("Asia/Kolkata");
      expect(result.data[0]?.displayName).toBe("Kanpur, Uttar Pradesh, India");
    }
  });

  it("uses cached results on repeated searches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(openMeteoGeocodingFixture),
    });
    globalThis.fetch = fetchMock;

    const service = new LocationService();
    await service.search("Kanpur");
    await service.search("Kanpur");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles rate limiting (429)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const service = new LocationService();
    const result = await service.search("Kanpur");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("rate limit");
    }
  });

  it("handles network failure gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const service = new LocationService();
    const result = await service.search("Kanpur");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Geocoding failed");
    }
  });

  it("corrects 'duabi' misspelling and prioritizes Dubai UAE over small unpopulated villages", async () => {
    // Mock fetch to simulate Open-Meteo returning Dubai UAE for 'Dubai' and small villages for 'duabi'
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("name=Dubai")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              results: [
                {
                  id: 292223,
                  name: "Dubai",
                  latitude: 25.07725,
                  longitude: 55.30927,
                  country: "United Arab Emirates",
                  admin1: "Dubai",
                  timezone: "Asia/Dubai",
                  population: 3790000,
                },
              ],
            }),
        });
      }
      // Return unpopulated Afghan village for literal 'duabi'
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            results: [
              {
                id: 1142949,
                name: "Dūābī",
                latitude: 36.00984,
                longitude: 69.1249,
                country: "Afghanistan",
                admin1: "Baghlan",
                timezone: "Asia/Kabul",
                population: undefined,
              },
            ],
          }),
      });
    });

    const service = new LocationService();
    const result = await service.search("duabi", 5);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      // Top result MUST be Dubai, UAE because of population weighting
      expect(result.data[0]?.name).toBe("Dubai");
      expect(result.data[0]?.country).toBe("United Arab Emirates");
      expect(result.data[0]?.population).toBe(3790000);
      expect(result.data[0]?.displayName).toBe("Dubai, Dubai, United Arab Emirates");
    }
  });
});
