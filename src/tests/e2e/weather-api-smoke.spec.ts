import { test, expect } from "@playwright/test";

test.describe("Weather Server Route Smoke Test", () => {
  test("GET /api/weather returns normalized forecast for known coordinates", async ({ request }) => {
    // Coordinates for New Delhi, India
    const response = await request.get("/api/weather?lat=28.6139&lon=77.209&timezone=Asia/Kolkata");

    expect(response.ok()).toBe(true);
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Verify root contract keys
    expect(body).toHaveProperty("location");
    expect(body).toHaveProperty("observedAt");
    expect(body).toHaveProperty("current");
    expect(body).toHaveProperty("hourly");
    expect(body).toHaveProperty("daily");
    expect(body).toHaveProperty("provenance");

    // Verify location details
    expect(body.location.coordinates.latitude).toBeCloseTo(28.61, 1);
    expect(body.location.coordinates.longitude).toBeCloseTo(77.21, 1);

    // Verify current weather measurements
    expect(typeof body.current.temperature).toBe("number");
    expect(typeof body.current.feelsLike).toBe("number");
    expect(typeof body.current.humidity).toBe("number");
    expect(typeof body.current.windSpeed).toBe("number");
    expect(typeof body.current.condition).toBe("string");

    // Verify forecast horizons
    expect(Array.isArray(body.hourly)).toBe(true);
    expect(body.hourly.length).toBeGreaterThan(0);
    expect(Array.isArray(body.daily)).toBe(true);
    expect(body.daily.length).toBeGreaterThan(0);

    // Verify data provenance
    expect(Array.isArray(body.provenance)).toBe(true);
    expect(body.provenance.length).toBeGreaterThanOrEqual(1);
    expect(body.provenance[0].provider).toBe("open-meteo");
  });

  test("GET /api/weather rejects invalid coordinate queries", async ({ request }) => {
    const response = await request.get("/api/weather?lat=120&lon=77.209");

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("INVALID_LOCATION");
  });
});
