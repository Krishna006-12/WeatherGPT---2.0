import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/voice/route";
import { WeatherService } from "@/services/weather/weather-service";
import { AppError } from "@/lib/errors";
import type { WeatherSnapshot } from "@/types/weather";

const mockWeatherSnapshot: WeatherSnapshot = {
  location: {
    name: "Jaipur",
    region: "Rajasthan",
    country: "India",
    coordinates: { latitude: 26.9124, longitude: 75.7873 },
    timezone: "Asia/Kolkata",
  },
  current: {
    temperature: 30,
    feelsLike: 32,
    humidity: 50,
    windSpeed: 12,
    windDirection: 210,
    pressure: 1010,
    cloudCover: 5,
    precipitation: 0,
    precipitationProbability: 10,
    condition: "clear",
    description: "clear and sunny",
    uvIndex: 8,
    observedAt: "2026-09-13T10:00:00Z",
  },
  hourly: [],
  daily: [],
  alerts: [],
  provenance: [
    {
      provider: "Open-Meteo",
      retrievedAt: "2026-09-13T10:00:00Z",
      dataType: "current",
    },
  ],
  observedAt: "2026-09-13T10:00:00Z",
};

describe("Phase 12: /api/voice Route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/voice", () => {
    it("1. returns 200 with VoiceAssistantReport for valid coordinates", async () => {
      vi.spyOn(WeatherService.prototype, "getWeather").mockResolvedValue({
        success: true,
        data: mockWeatherSnapshot,
      });

      const request = new Request("http://localhost/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 26.9124,
          longitude: 75.7873,
          language: "en-US",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.headline).toContain("Jaipur Audio Briefing");
      expect(json.data.spokenScript.text).toContain("In Jaipur, it is currently 30 degrees Celsius");
      expect(json.data.spokenScript.wordCount).toBeGreaterThan(5);
    });

    it("2. returns speech-cleaned script for custom textToSpeak", async () => {
      const request = new Request("http://localhost/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 26.9124,
          longitude: 75.7873,
          textToSpeak: "Rain probability is 60% with wind speed 20 km/h at 25°C.",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.spokenScript.cleanedForSpeech).toContain("60 percent");
      expect(json.data.spokenScript.cleanedForSpeech).toContain("20 kilometers per hour");
      expect(json.data.spokenScript.cleanedForSpeech).toContain("25 degrees Celsius");
    });

    it("3. returns 400 when coordinates are missing or invalid", async () => {
      const request = new Request("http://localhost/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 100, // Invalid latitude > 90
          longitude: 75.7873,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it("4. handles upstream weather service error gracefully", async () => {
      vi.spyOn(WeatherService.prototype, "getWeather").mockResolvedValue({
        success: false,
        error: new AppError("WEATHER_PROVIDER_UNAVAILABLE", "Upstream API timeout", 502),
      });

      const request = new Request("http://localhost/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 26.9124,
          longitude: 75.7873,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(502);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("WEATHER_PROVIDER_UNAVAILABLE");
    });
  });

  describe("GET /api/voice", () => {
    it("returns 200 with service status and supported languages", async () => {
      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("ready");
      expect(json.data.supportedLanguages).toContain("en-US");
      expect(json.data.supportedLanguages).toContain("hi-IN");
      expect(json.data.suggestedPrompts.length).toBeGreaterThan(0);
    });
  });
});
