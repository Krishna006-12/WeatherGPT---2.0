import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenMeteoProvider } from "@/services/weather/open-meteo-provider";
import openMeteoWeatherFixture from "@/tests/fixtures/open-meteo-weather.json";

describe("OpenMeteoProvider", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("successfully fetches and normalizes weather data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(openMeteoWeatherFixture),
    });

    const provider = new OpenMeteoProvider();
    const snapshot = await provider.getWeather({ latitude: 26.46, longitude: 80.35 }, "Asia/Kolkata");

    expect(snapshot.location.coordinates.latitude).toBe(26.467485);
    expect(snapshot.location.coordinates.longitude).toBe(80.38546);
    expect(snapshot.location.timezone).toBe("Asia/Kolkata");
    expect(snapshot.current.temperature).toBe(26.1);
    expect(snapshot.current.humidity).toBe(99);
    expect(snapshot.current.precipitation).toBe(0.3);
    expect(snapshot.current.windSpeed).toBe(3.5);
    expect(snapshot.current.condition).toBe("drizzle");
    expect(snapshot.hourly.length).toBeGreaterThan(0);
    expect(snapshot.daily.length).toBeGreaterThan(0);
    expect(snapshot.provenance[0]?.provider).toBe("open-meteo");
    expect(snapshot.provenance[0]?.timezone).toBe("Asia/Kolkata");
  });

  it("handles rate limiting (429)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const provider = new OpenMeteoProvider();
    await expect(
      provider.getWeather({ latitude: 26.46, longitude: 80.35 })
    ).rejects.toThrow("rate limit");
  });

  it("handles HTTP 500 server error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const provider = new OpenMeteoProvider();
    await expect(
      provider.getWeather({ latitude: 26.46, longitude: 80.35 })
    ).rejects.toThrow("Open-Meteo returned status 500");
  });

  it("handles malformed JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ invalid: "data" }),
    });

    const provider = new OpenMeteoProvider();
    await expect(
      provider.getWeather({ latitude: 26.46, longitude: 80.35 })
    ).rejects.toThrow("Open-Meteo response validation failed");
  });

  it("handles network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection dropped"));

    const provider = new OpenMeteoProvider();
    await expect(
      provider.getWeather({ latitude: 26.46, longitude: 80.35 })
    ).rejects.toThrow("Failed to reach Open-Meteo");
  });
});
